import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

import {
  getAvailableAppointmentSlots,
  getUtcDayBounds,
  isTodayOrFuture,
} from "~/server/domain/appointments/appointment-time";

const uuid = z.string().uuid();
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const toolCallSchema = z.object({
  id: z.string().min(1),
  function: z.object({
    name: z.string().min(1),
    arguments: z.unknown().optional(),
  }),
});

const serviceInput = z.object({ serviceId: z.string().min(1) });
const slotInput = serviceInput.extend({ date: dateKey });
const linkInput = slotInput.extend({
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
});

export type VapiToolCall = z.infer<typeof toolCallSchema>;

export function parseVapiToolCalls(message: unknown): VapiToolCall[] | null {
  const parsed = z
    .object({ toolCallList: z.array(toolCallSchema).min(1).max(5) })
    .safeParse(message);
  return parsed.success ? parsed.data.toolCallList : null;
}

export function vapiPhoneNumberId(message: unknown): string | null {
  const parsed = z
    .object({
      phoneNumber: z.object({ id: uuid }).optional(),
      call: z
        .object({
          phoneNumberId: uuid.optional(),
          phoneNumber: z.object({ id: uuid }).optional(),
        })
        .optional(),
    })
    .safeParse(message);
  if (!parsed.success) return null;
  return (
    parsed.data.call?.phoneNumberId ??
    parsed.data.call?.phoneNumber?.id ??
    parsed.data.phoneNumber?.id ??
    null
  );
}

function parseArguments(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function parseDate(value: string): Date | null {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

type Line = { doctorId: string; clinicId: string };

async function availableSlots(
  db: PrismaClient,
  line: Line,
  serviceId: string,
  dateKeyValue: string,
) {
  const date = parseDate(dateKeyValue);
  if (!date || !isTodayOrFuture(date))
    return { error: "Solicita una fecha válida de hoy en adelante." };
  const service = await db.service.findFirst({
    where: { id: serviceId, doctorId: line.doctorId, isActive: true },
    select: { id: true, name: true, duration: true },
  });
  if (!service) return { error: "Ese servicio no está disponible." };

  const { start, end } = getUtcDayBounds(date);
  const schedule = await db.schedule.findFirst({
    where: {
      doctorId: line.doctorId,
      dayOfWeek: start.getUTCDay(),
      isActive: true,
    },
    select: { startTime: true, endTime: true },
  });
  if (!schedule) return { service: service.name, date: dateKeyValue, slots: [] };
  const appointments = await db.appointment.findMany({
    where: {
      doctorId: line.doctorId,
      date: { gte: start, lt: end },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: { time: true, duration: true },
  });
  return {
    service: service.name,
    date: dateKeyValue,
    slots: getAvailableAppointmentSlots(
      date,
      service.duration,
      schedule.startTime,
      schedule.endTime,
      appointments,
    ),
  };
}

export async function runVapiTool(
  db: PrismaClient,
  line: Line,
  tool: VapiToolCall,
  appUrl: string | undefined,
) {
  const args = parseArguments(tool.function.arguments);
  switch (tool.function.name) {
    case "list_services": {
      const services = await db.service.findMany({
        where: { doctorId: line.doctorId, isActive: true },
        select: { id: true, name: true, description: true, duration: true, price: true },
        orderBy: { name: "asc" },
        take: 30,
      });
      return { services };
    }
    case "get_available_slots": {
      const parsed = slotInput.safeParse(args);
      if (!parsed.success) return { error: "Indica servicio y fecha (AAAA-MM-DD)." };
      return availableSlots(db, line, parsed.data.serviceId, parsed.data.date);
    }
    case "get_booking_link": {
      const parsed = linkInput.safeParse(args);
      if (!parsed.success) return { error: "Indica servicio, fecha y hora válidos." };
      if (!appUrl) return { error: "El enlace de reserva no está configurado." };
      const availability = await availableSlots(
        db,
        line,
        parsed.data.serviceId,
        parsed.data.date,
      );
      if ("error" in availability) return availability;
      if (!availability.slots.includes(parsed.data.time))
        return { error: "Ese horario ya no está disponible. Consulta los horarios de nuevo." };
      const url = new URL(`/book-appointment/${line.doctorId}`, appUrl);
      url.searchParams.set("serviceId", parsed.data.serviceId);
      url.searchParams.set("date", parsed.data.date);
      url.searchParams.set("time", parsed.data.time);
      return {
        bookingUrl: url.toString(),
        message:
          "La persona debe abrir el enlace, iniciar sesión y completar el brief médico para confirmar su solicitud.",
      };
    }
    default:
      return { error: "Herramienta no autorizada para este asistente." };
  }
}

export async function handleVapiToolCalls(
  db: PrismaClient,
  line: Line,
  calls: VapiToolCall[],
  appUrl: string | undefined,
) {
  const results = await Promise.all(
    calls.map(async (tool) => {
      try {
        const value = await runVapiTool(db, line, tool, appUrl);
        return "error" in value
          ? { name: tool.function.name, toolCallId: tool.id, error: value.error }
          : { name: tool.function.name, toolCallId: tool.id, result: JSON.stringify(value) };
      } catch {
        return { name: tool.function.name, toolCallId: tool.id, error: "No pude consultar la agenda ahora." };
      }
    }),
  );
  return { results };
}
