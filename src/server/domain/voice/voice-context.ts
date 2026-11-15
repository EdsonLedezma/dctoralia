import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

const uuid = z.string().uuid();
const envelope = z.object({
  phoneNumber: z.object({ id: uuid }).optional(),
  call: z.object({
    id: uuid,
    type: z.literal("inboundPhoneCall"),
    phoneNumberId: uuid.optional(),
    phoneNumber: z.object({ id: uuid }).optional(),
    assistantId: uuid.nullish(),
  }),
});
export function vapiPhoneNumberId(input: unknown): string | null {
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
    .safeParse(input);
  if (!parsed.success) return null;
  const ids = [
    parsed.data.call?.phoneNumberId,
    parsed.data.call?.phoneNumber?.id,
    parsed.data.phoneNumber?.id,
  ].filter((id): id is string => !!id);
  return ids.length && new Set(ids).size === 1 ? (ids[0] ?? null) : null;
}
export function parseVoiceEnvelope(input: unknown) {
  const parsed = envelope.safeParse(input);
  if (!parsed.success) return null;
  const phoneNumberId = vapiPhoneNumberId(input);
  return phoneNumberId
    ? {
        callId: parsed.data.call.id,
        phoneNumberId,
        assistantId: parsed.data.call.assistantId,
      }
    : null;
}
export async function resolveVoiceLine(
  db: PrismaClient,
  phoneNumberId: string,
) {
  const line = await db.voiceAgentLine.findUnique({
    where: { vapiPhoneNumberId: phoneNumberId },
    select: {
      id: true,
      clinicId: true,
      doctorId: true,
      status: true,
      enabled: true,
      mutationsEnabled: true,
      vapiAssistantId: true,
      doctor: { select: { clinicId: true, userId: true } },
      clinic: {
        select: {
          timezone: true,
          subscription: { select: { status: true, voiceAgentEnabled: true } },
        },
      },
    },
  });
  if (
    !line ||
    line.status !== "ACTIVE" ||
    !line.enabled ||
    !line.vapiAssistantId ||
    line.doctor.clinicId !== line.clinicId ||
    !line.clinic.subscription?.voiceAgentEnabled ||
    !["ACTIVE", "TRIALING"].includes(line.clinic.subscription.status)
  )
    return null;
  return line;
}
export type VoiceLine = NonNullable<
  Awaited<ReturnType<typeof resolveVoiceLine>>
>;
