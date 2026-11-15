import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import type { VoiceLine } from "~/server/domain/voice/voice-context";
import {
  voiceSchemas,
  parsedArguments,
} from "~/server/domain/voice/voice-policy";
import {
  executeVoiceAppointment,
  listVoiceAppointments,
  voiceAvailability,
  VoiceCommandError,
} from "~/server/domain/voice/voice-appointments";
import { verifyVoicePatient } from "~/server/domain/voice/voice-verification";
export { vapiPhoneNumberId } from "~/server/domain/voice/voice-context";

const toolCallSchema = z.object({
  id: z.string().min(1).max(200),
  function: z.object({
    name: z.string().min(1).max(80),
    arguments: z.unknown().optional(),
  }),
});
export type VapiToolCall = z.infer<typeof toolCallSchema>;
export function parseVapiToolCalls(message: unknown): VapiToolCall[] | null {
  const parsed = z
    .object({ toolCallList: z.array(toolCallSchema).min(1).max(5) })
    .safeParse(message);
  if (
    !parsed.success ||
    new Set(parsed.data.toolCallList.map((t) => t.id)).size !==
      parsed.data.toolCallList.length
  )
    return null;
  return parsed.data.toolCallList;
}
export async function runVapiTool(
  db: PrismaClient,
  line: VoiceLine,
  tool: VapiToolCall,
  appUrl: string | undefined,
  callId: string,
  secret: string,
) {
  const args = parsedArguments(tool.function.arguments ?? {});
  switch (tool.function.name) {
    case "list_services": {
      if (!voiceSchemas.list_services.safeParse(args).success)
        throw new VoiceCommandError("Argumentos no válidos.");
      const services = await db.service.findMany({
        where: {
          doctorId: line.doctorId,
          clinicId: line.clinicId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          duration: true,
          price: true,
        },
        orderBy: { name: "asc" },
        take: 30,
      });
      return {
        services,
        changesEnabled: line.mutationsEnabled,
        verificationUrl: appUrl
          ? new URL(
              "/patient/voice-access?doctorId=" +
                encodeURIComponent(line.doctorId),
              appUrl,
            ).toString()
          : null,
        message:
          "El enlace de verificación está preparado, no enviado. El paciente debe iniciar sesión para generar su código.",
      };
    }
    case "get_available_slots": {
      const input = voiceSchemas.get_available_slots.parse(args);
      return voiceAvailability(db, line, input.serviceId, input.date);
    }
    case "get_booking_link": {
      const input = voiceSchemas.get_booking_link.parse(args);
      if (!appUrl)
        throw new VoiceCommandError("El enlace no está configurado.");
      const availability = await voiceAvailability(
        db,
        line,
        input.serviceId,
        input.date,
      );
      if (!availability.slots.includes(input.time))
        throw new VoiceCommandError("Horario ya no disponible.");
      const url = new URL("/book-appointment/" + line.doctorId, appUrl);
      url.searchParams.set("serviceId", input.serviceId);
      url.searchParams.set("date", input.date);
      url.searchParams.set("time", input.time);
      return {
        bookingUrl: url.toString(),
        message:
          "Enlace preparado, no enviado. La persona debe abrirlo y confirmar la reserva.",
      };
    }
    case "verify_patient": {
      const input = voiceSchemas.verify_patient.parse(args);
      return verifyVoicePatient(db, line, callId, input.code, secret);
    }
    case "list_my_appointments": {
      voiceSchemas.list_my_appointments.parse(args);
      return listVoiceAppointments(db, line, callId);
    }
    case "create_appointment": {
      const input = voiceSchemas.create_appointment.parse(args);
      return executeVoiceAppointment(db, line, callId, {
        name: "create_appointment",
        serviceId: input.serviceId,
        date: input.date,
        time: input.time,
      });
    }
    case "reschedule_appointment": {
      const input = voiceSchemas.reschedule_appointment.parse(args);
      return executeVoiceAppointment(db, line, callId, {
        name: "reschedule_appointment",
        appointmentId: input.appointmentId,
        date: input.date,
        time: input.time,
      });
    }
    case "cancel_appointment": {
      const input = voiceSchemas.cancel_appointment.parse(args);
      return executeVoiceAppointment(db, line, callId, {
        name: "cancel_appointment",
        appointmentId: input.appointmentId,
      });
    }
    default:
      throw new VoiceCommandError("Herramienta no autorizada.");
  }
}
export async function handleVapiToolCalls(
  db: PrismaClient,
  line: VoiceLine,
  calls: VapiToolCall[],
  appUrl: string | undefined,
  callId: string,
  secret: string,
) {
  const results: Array<
    | { toolCallId: string; result: string }
    | { toolCallId: string; error: string }
  > = [];
  // Sequential: verification precedes a mutation; writes in a batch must not race.
  for (const tool of calls) {
    try {
      const value = await runVapiTool(db, line, tool, appUrl, callId, secret);
      results.push(
        "error" in value && typeof value.error === "string"
          ? { toolCallId: tool.id, error: value.error }
          : { toolCallId: tool.id, result: JSON.stringify(value) },
      );
    } catch (e: unknown) {
      results.push({
        toolCallId: tool.id,
        error:
          e instanceof VoiceCommandError
            ? e.message
            : e instanceof z.ZodError
              ? "Argumentos no válidos. Consulta los servicios y horarios antes de continuar."
              : "No pude completar la operación. Consulta la cita antes de reintentar o contacta recepción.",
      });
    }
  }
  return { results };
}
