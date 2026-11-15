import { createHash, createHmac } from "node:crypto";
import { z } from "zod";

export const voiceDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + "T00:00:00Z");
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
    );
  });
export const voiceTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const voiceSchemas = {
  list_services: z.object({}).strict(),
  get_available_slots: z
    .object({ serviceId: z.string().min(1), date: voiceDate })
    .strict(),
  get_booking_link: z
    .object({ serviceId: z.string().min(1), date: voiceDate, time: voiceTime })
    .strict(),
  verify_patient: z.object({ code: z.string().regex(/^\d{8}$/) }).strict(),
  list_my_appointments: z.object({}).strict(),
  create_appointment: z
    .object({
      serviceId: z.string().min(1),
      date: voiceDate,
      time: voiceTime,
      confirmed: z.literal(true),
    })
    .strict(),
  reschedule_appointment: z
    .object({
      appointmentId: z.string().cuid(),
      date: voiceDate,
      time: voiceTime,
      confirmed: z.literal(true),
    })
    .strict(),
  cancel_appointment: z
    .object({ appointmentId: z.string().cuid(), confirmed: z.literal(true) })
    .strict(),
};
export type VoiceToolName = keyof typeof voiceSchemas;
export function hashVoiceCode(code: string, lineId: string, secret: string) {
  return createHmac("sha256", secret)
    .update(lineId + ":" + code)
    .digest("hex");
}
export function voiceRequestKey(name: string, input: object) {
  return createHash("sha256")
    .update(JSON.stringify([name, input]))
    .digest("hex");
}
export function voiceAppointmentScope(
  line: { clinicId: string; doctorId: string },
  patientId: string,
) {
  return { clinicId: line.clinicId, doctorId: line.doctorId, patientId };
}
export function parsedArguments(input: unknown): unknown {
  if (typeof input !== "string") return input;
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}
