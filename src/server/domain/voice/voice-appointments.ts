import { z } from "zod";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  hasTimeConflict,
  isSlotInsideSchedule,
} from "~/server/domain/appointments/appointment-time";
import { recordAppointmentLifecycleEvent } from "~/server/domain/appointments/lifecycle";
import {
  cancelPendingAppointmentReminders,
  localTimeToUtc,
  resolveTimeZone,
  scheduleAppointmentReminders,
  zonedParts,
} from "~/server/domain/messaging/appointment-reminders";
import type { VoiceLine } from "./voice-context";
import { voiceAppointmentScope, voiceRequestKey } from "./voice-policy";

export class VoiceCommandError extends Error {}
export function voiceInstant(date: string, time: string, zone: string) {
  const day = new Date(date + "T00:00:00Z");
  const [hour, minute] = time.split(":").map(Number);
  if (hour === undefined || minute === undefined)
    throw new VoiceCommandError("Horario inválido.");
  const parts = {
    year: day.getUTCFullYear(),
    month: day.getUTCMonth() + 1,
    day: day.getUTCDate(),
    hour,
    minute,
  };
  const result = localTimeToUtc(parts, zone);
  const actual = zonedParts(result, zone);
  if (
    Object.entries(parts).some(
      ([key, value]) => actual[key as keyof typeof actual] !== value,
    )
  )
    throw new VoiceCommandError(
      "Horario no válido en la zona del consultorio.",
    );
  return result;
}
export function voiceSlots(
  date: string,
  duration: number,
  schedules: Array<{ startTime: string; endTime: string }>,
  busy: Array<{ time: string; duration: number }>,
  zone: string,
  now = new Date(),
) {
  const slots: string[] = [];
  for (let minute = 0; minute < 1440; minute += 15) {
    const time =
      String(Math.floor(minute / 60)).padStart(2, "0") +
      ":" +
      String(minute % 60).padStart(2, "0");
    if (
      !schedules.some((s) =>
        isSlotInsideSchedule(time, duration, s.startTime, s.endTime),
      ) ||
      hasTimeConflict(time, duration, busy)
    )
      continue;
    try {
      if (voiceInstant(date, time, zone) > now) slots.push(time);
    } catch {
      /* Skip nonexistent local times. */
    }
  }
  return slots;
}
export async function voiceAvailability(
  db: PrismaClient,
  line: VoiceLine,
  serviceId: string,
  date: string,
) {
  const day = new Date(date + "T00:00:00Z");
  if (Math.abs(day.getTime() - Date.now()) > 93 * 86400_000)
    throw new VoiceCommandError(
      "Consulta una fecha dentro de los próximos 90 días.",
    );
  const service = await db.service.findFirst({
    where: {
      id: serviceId,
      clinicId: line.clinicId,
      doctorId: line.doctorId,
      isActive: true,
    },
    select: { name: true, duration: true },
  });
  if (!service)
    throw new VoiceCommandError(
      "Servicio no disponible para este consultorio.",
    );
  const [schedules, busy] = await Promise.all([
    db.schedule.findMany({
      where: {
        doctorId: line.doctorId,
        clinicId: line.clinicId,
        isActive: true,
        dayOfWeek: day.getUTCDay(),
      },
      select: { startTime: true, endTime: true },
    }),
    db.appointment.findMany({
      where: {
        doctorId: line.doctorId,
        clinicId: line.clinicId,
        date: { gte: day, lt: new Date(day.getTime() + 86400_000) },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: { time: true, duration: true },
    }),
  ]);
  const timezone = resolveTimeZone(line.clinic.timezone);
  return {
    service: service.name,
    date,
    timezone,
    slots: voiceSlots(date, service.duration, schedules, busy, timezone),
  };
}
const resultSelect = {
  id: true,
  date: true,
  time: true,
  status: true,
  duration: true,
} satisfies Prisma.AppointmentSelect;
type ResultAppointment = Prisma.AppointmentGetPayload<{
  select: typeof resultSelect;
}>;
function appointmentDto(a: ResultAppointment) {
  return {
    id: a.id,
    date: a.date.toISOString().slice(0, 10),
    time: a.time,
    status: a.status,
    duration: a.duration,
  };
}
const reminderInclude = {
  patient: {
    select: { phone: true, user: { select: { id: true, name: true } } },
  },
  doctor: { select: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.AppointmentInclude;
type Command =
  | {
      name: "create_appointment";
      serviceId: string;
      date: string;
      time: string;
    }
  | {
      name: "reschedule_appointment";
      appointmentId: string;
      date: string;
      time: string;
    }
  | { name: "cancel_appointment"; appointmentId: string };

export async function executeVoiceAppointment(
  db: PrismaClient,
  line: VoiceLine,
  callId: string,
  command: Command,
) {
  if (!line.mutationsEnabled)
    throw new VoiceCommandError(
      "El médico solo habilitó consultas. Completa el cambio desde tu cuenta.",
    );
  const requestKey = voiceRequestKey(command.name, command);
  try {
    return await db.$transaction(
      async (tx) => {
        const now = new Date();
        const currentLine = await tx.voiceAgentLine.findFirst({
          where: {
            id: line.id,
            clinicId: line.clinicId,
            doctorId: line.doctorId,
            status: "ACTIVE",
            enabled: true,
            mutationsEnabled: true,
            doctor: { clinicId: line.clinicId },
            clinic: {
              subscription: {
                voiceAgentEnabled: true,
                status: { in: ["ACTIVE", "TRIALING"] },
              },
            },
          },
          select: { id: true },
        });
        if (!currentLine)
          throw new VoiceCommandError(
            "El asistente no tiene permiso para hacer cambios.",
          );
        const session = await tx.voiceCallSession.findUnique({
          where: { callId },
        });
        if (
          !session?.patientId ||
          session.lineId !== line.id ||
          session.expiresAt <= now
        )
          throw new VoiceCommandError(
            "Verifica primero tu identidad con un código de tu cuenta.",
          );
        const previous = await tx.voiceToolOperation.findUnique({
          where: {
            sessionId_requestKey: { sessionId: session.id, requestKey },
          },
        });
        if (previous)
          return z
            .object({
              appointment: z.object({
                id: z.string(),
                date: z.string(),
                time: z.string(),
                status: z.enum([
                  "PENDING",
                  "CONFIRMED",
                  "COMPLETED",
                  "CANCELLED",
                  "NO_SHOW",
                ]),
                duration: z.number(),
              }),
              timezone: z.string(),
              message: z.string(),
            })
            .parse(previous.result);
        const patient = await tx.patient.findUnique({
          where: { id: session.patientId },
          select: { id: true, userId: true },
        });
        if (!patient)
          throw new VoiceCommandError("No se pudo verificar el paciente.");
        const scope = voiceAppointmentScope(line, patient.id);
        const current =
          command.name === "create_appointment"
            ? null
            : await tx.appointment.findFirst({
                where: { id: command.appointmentId, ...scope },
              });
        if (command.name !== "create_appointment" && !current)
          throw new VoiceCommandError(
            "No encontramos esa cita en tu agenda con este médico.",
          );
        if (current && !["PENDING", "CONFIRMED"].includes(current.status))
          throw new VoiceCommandError("Esta cita ya no admite cambios.");
        if (current) {
          const attendance = await tx.appointmentLifecycleEvent.findFirst({
            where: {
              appointmentId: current.id,
              eventType: { in: ["CHECKED_IN", "CONSULTATION_STARTED"] },
            },
            select: { id: true },
          });
          const encounter = await tx.clinicalEncounter.findFirst({
            where: { appointmentId: current.id },
            select: { id: true },
          });
          if (attendance || encounter)
            throw new VoiceCommandError("Recepción debe gestionar esta cita.");
        }
        if (
          current &&
          voiceInstant(
            current.date.toISOString().slice(0, 10),
            current.time,
            resolveTimeZone(line.clinic.timezone),
          ) <= now
        )
          throw new VoiceCommandError(
            "Recepción debe gestionar una cita pasada.",
          );
        let duration = current?.duration ?? 0;
        if (command.name !== "cancel_appointment") {
          const zone = resolveTimeZone(line.clinic.timezone);
          if (voiceInstant(command.date, command.time, zone) <= now)
            throw new VoiceCommandError("Elige un horario futuro.");
          const day = new Date(command.date + "T00:00:00Z");
          if (day.getTime() > now.getTime() + 90 * 86400_000)
            throw new VoiceCommandError(
              "Agenda dentro de los próximos 90 días.",
            );
          if (command.name === "create_appointment") {
            const service = await tx.service.findFirst({
              where: {
                id: command.serviceId,
                doctorId: line.doctorId,
                clinicId: line.clinicId,
                isActive: true,
              },
              select: { duration: true },
            });
            if (!service)
              throw new VoiceCommandError(
                "Servicio no disponible para este médico.",
              );
            duration = service.duration;
          }
          const schedules = await tx.schedule.findMany({
            where: {
              clinicId: line.clinicId,
              doctorId: line.doctorId,
              dayOfWeek: day.getUTCDay(),
              isActive: true,
            },
            select: { startTime: true, endTime: true },
          });
          if (
            !schedules.some((s) =>
              isSlotInsideSchedule(
                command.time,
                duration,
                s.startTime,
                s.endTime,
              ),
            )
          )
            throw new VoiceCommandError(
              "Horario fuera de la jornada del médico.",
            );
          const busy = await tx.appointment.findMany({
            where: {
              clinicId: line.clinicId,
              doctorId: line.doctorId,
              ...(current ? { id: { not: current.id } } : {}),
              date: { gte: day, lt: new Date(day.getTime() + 86400_000) },
              status: { in: ["PENDING", "CONFIRMED"] },
            },
            select: { time: true, duration: true },
          });
          if (hasTimeConflict(command.time, duration, busy))
            throw new VoiceCommandError(
              "Ese horario ya está ocupado. Consulta disponibilidad otra vez.",
            );
        }
        const updated =
          command.name === "create_appointment"
            ? await tx.appointment.create({
                data: {
                  ...scope,
                  serviceId: command.serviceId,
                  date: new Date(command.date + "T00:00:00Z"),
                  time: command.time,
                  duration,
                  reason: "Solicitud por asistente telefónico",
                  status: "PENDING",
                },
                include: reminderInclude,
              })
            : await tx.appointment.update({
                where: { id: current!.id },
                data:
                  command.name === "cancel_appointment"
                    ? { status: "CANCELLED" }
                    : {
                        date: new Date(command.date + "T00:00:00Z"),
                        time: command.time,
                      },
                include: reminderInclude,
              });
        if (command.name !== "create_appointment")
          await cancelPendingAppointmentReminders(tx, updated.id);
        if (command.name !== "cancel_appointment")
          await scheduleAppointmentReminders(tx, updated);
        await recordAppointmentLifecycleEvent(tx, {
          clinicId: line.clinicId,
          doctorId: line.doctorId,
          patientId: patient.id,
          appointmentId: updated.id,
          actorUserId: patient.userId,
          eventType:
            command.name === "create_appointment"
              ? "CREATED"
              : command.name === "reschedule_appointment"
                ? "RESCHEDULED"
                : "STATUS_CHANGED",
          fromStatus: current?.status,
          toStatus: updated.status,
          scheduledAt: updated.date,
          scheduledTime: updated.time,
          idempotencyKey: "vapi:" + session.id + ":" + requestKey,
          metadata: { source: "VAPI", callId },
        });
        const type =
          command.name === "create_appointment"
            ? "APPOINTMENT_BOOKED"
            : command.name === "reschedule_appointment"
              ? "APPOINTMENT_RESCHEDULED"
              : "APPOINTMENT_CANCELLED";
        await tx.notification.createMany({
          data: [updated.patient.user.id, updated.doctor.user.id].map(
            (recipientUserId) => ({
              ...scope,
              recipientUserId,
              type,
              appointmentId: updated.id,
              title: "Actualización de cita por teléfono",
              message: "Consulta el estado de la cita en tu agenda.",
            }),
          ),
        });
        const result = {
          appointment: appointmentDto(updated),
          timezone: resolveTimeZone(line.clinic.timezone),
          message:
            updated.status === "PENDING"
              ? "Solicitud registrada, pendiente de confirmación del consultorio."
              : "Operación registrada.",
        };
        await tx.voiceToolOperation.create({
          data: { sessionId: session.id, requestKey, result },
        });
        return result;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 8000,
        maxWait: 2000,
      },
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2034", "P2002"].includes(e.code)
    )
      throw new VoiceCommandError(
        "La agenda cambió durante la operación. Consulta la cita antes de reintentar.",
      );
    throw e;
  }
}
export async function listVoiceAppointments(
  db: PrismaClient,
  line: VoiceLine,
  callId: string,
) {
  const session = await db.voiceCallSession.findUnique({ where: { callId } });
  if (
    !session?.patientId ||
    session.lineId !== line.id ||
    session.expiresAt <= new Date()
  )
    throw new VoiceCommandError("Verifica primero tu identidad.");
  const appointments = await db.appointment.findMany({
    where: {
      ...voiceAppointmentScope(line, session.patientId),
      date: { gte: new Date(Date.now() - 86400_000) },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: resultSelect,
    orderBy: [{ date: "asc" }, { time: "asc" }],
    take: 10,
  });
  return {
    appointments: appointments.map(appointmentDto),
    timezone: resolveTimeZone(line.clinic.timezone),
  };
}
