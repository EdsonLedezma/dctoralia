import type { PrismaClient } from "@prisma/client";
import { hashVoiceCode } from "./voice-policy";
import type { VoiceLine } from "./voice-context";

export async function getVoiceSession(
  db: PrismaClient,
  line: VoiceLine,
  callId: string,
  now = new Date(),
) {
  const session = await db.voiceCallSession.upsert({
    where: { callId },
    update: {},
    create: {
      callId,
      lineId: line.id,
      expiresAt: new Date(now.getTime() + 30 * 60_000),
    },
  });
  return session.lineId === line.id && session.expiresAt > now ? session : null;
}
export async function verifyVoicePatient(
  db: PrismaClient,
  line: VoiceLine,
  callId: string,
  code: string,
  secret: string,
) {
  const now = new Date();
  const session = await getVoiceSession(db, line, callId, now);
  if (!session || session.attempts >= 5)
    return {
      error: "Verificación no disponible. Usa tu cuenta o contacta recepción.",
    };
  const attempts = await db.voiceCallSession.aggregate({
    where: {
      lineId: line.id,
      createdAt: { gte: new Date(now.getTime() - 10 * 60_000) },
    },
    _sum: { attempts: true },
  });
  if ((attempts._sum.attempts ?? 0) >= 100)
    return {
      error: "Verificación temporalmente limitada. Contacta recepción.",
    };
  return db.$transaction(async (tx) => {
    const changed = await tx.voiceCallSession.updateMany({
      where: { id: session.id, attempts: { lt: 5 }, expiresAt: { gt: now } },
      data: { attempts: { increment: 1 } },
    });
    if (!changed.count) return { error: "Código inválido o vencido." };
    const grant = await tx.voicePatientCode.findUnique({
      where: { tokenHash: hashVoiceCode(code, line.id, secret) },
    });
    if (
      !grant ||
      grant.lineId !== line.id ||
      grant.expiresAt <= now ||
      grant.consumedAt ||
      (session.patientId && session.patientId !== grant.patientId)
    )
      return { error: "Código inválido o vencido." };
    const consumed = await tx.voicePatientCode.updateMany({
      where: { id: grant.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (!consumed.count) return { error: "Código inválido o vencido." };
    const bound = await tx.voiceCallSession.updateMany({
      where: {
        id: session.id,
        OR: [{ patientId: null }, { patientId: grant.patientId }],
      },
      data: { patientId: grant.patientId },
    });
    if (!bound.count)
      return { error: "Esta llamada ya fue autorizada con otra cuenta." };
    return {
      verified: true,
      message: "Identidad autorizada para esta llamada y este consultorio.",
    };
  });
}
