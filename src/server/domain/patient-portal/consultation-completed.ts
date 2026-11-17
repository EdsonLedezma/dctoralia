import type { Prisma } from "@prisma/client";
import type { ClinicalActor } from "~/server/domain/clinical/access";
import { enqueueMessage } from "~/server/domain/messaging/outbox";
import { normalizeVoicePhone } from "~/server/integrations/vapi/phone-number";
import { newPortalToken, portalTokenHash } from "./token";

type Encounter = {
  id: string;
  clinicId: string;
  doctorId: string;
  patientId: string;
  appointmentId: string | null;
};

export async function preparePortalInvitation(
  tx: Prisma.TransactionClient,
  encounter: Encounter,
  force = false,
) {
  const { env } = await import("~/env");
  const [patient, settings, consent, previous] = await Promise.all([
    tx.patient.findUnique({
      where: { id: encounter.patientId },
      select: {
        phone: true,
        user: { select: { name: true, isGuest: true } },
        accountLink: { select: { active: true } },
      },
    }),
    tx.doctorBookingSettings.findUnique({
      where: { doctorId: encounter.doctorId },
      include: { doctor: { select: { user: { select: { name: true } } } } },
    }),
    tx.patientMessageConsent.findFirst({
      where: {
        clinicId: encounter.clinicId,
        patientId: encounter.patientId,
        channel: "WHATSAPP",
        purpose: "PORTAL_INVITATION",
        consentedAt: { not: null },
        revokedAt: null,
      },
      select: { id: true },
    }),
    tx.patientPortalInvitation.findUnique({
      where: { encounterId: encounter.id },
      select: { id: true },
    }),
  ]);
  if (!patient?.user.isGuest || patient.accountLink?.active)
    return { queued: false, reason: "ACCOUNT_EXISTS" };
  if (previous && !force) return { queued: false, reason: "ALREADY_PREPARED" };
  const template =
    settings?.invitationTemplate ?? env.SENT_PORTAL_INVITATION_TEMPLATE;
  const phone = normalizeVoicePhone(patient.phone);
  if (
    !phone ||
    !consent ||
    !template ||
    !env.APP_URL ||
    settings?.inviteAfterConsultation === false ||
    env.DEMO_MODE === "true" ||
    env.SENT_ENABLED !== "true"
  )
    return { queued: false, reason: "NOT_CONFIGURED_OR_NO_CONSENT" };
  const token = newPortalToken(),
    tokenHash = portalTokenHash(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000);
  const invitation = await tx.patientPortalInvitation.upsert({
    where: { encounterId: encounter.id },
    create: {
      encounterId: encounter.id,
      clinicId: encounter.clinicId,
      doctorId: encounter.doctorId,
      patientId: encounter.patientId,
      recipientPhone: phone,
      tokenHash,
      expiresAt,
    },
    update: {
      tokenHash,
      recipientPhone: phone,
      expiresAt,
      consumedAt: null,
      claimAttempts: 0,
    },
  });
  const url = new URL("/activar", env.APP_URL);
  url.searchParams.set("token", token);
  await enqueueMessage(tx, {
    clinicId: encounter.clinicId,
    channel: "WHATSAPP",
    recipient: phone,
    template,
    payload: {
      patient_name: patient.user.name,
      doctor_name: settings?.doctor.user.name ?? "Tu doctor",
      activation_url: url.toString(),
    },
    idempotencyKey: `portal-invitation:${invitation.id}:${tokenHash.slice(0, 16)}`,
    correlationId: encounter.id,
    expiresAt,
    sandbox: env.SENT_SANDBOX !== "false",
  });
  return { queued: true, expiresAt };
}

export async function afterConsultationCompleted(
  tx: Prisma.TransactionClient,
  actor: ClinicalActor,
  encounter: Encounter,
) {
  if (
    encounter.clinicId !== actor.clinicId ||
    encounter.doctorId !== actor.doctorId
  )
    throw new Error("Invalid consultation scope");
  const patient = await tx.patient.findUnique({
    where: { id: encounter.patientId },
    select: {
      user: { select: { isGuest: true } },
      accountLink: { select: { active: true } },
    },
  });
  if (!patient) throw new Error("Patient unavailable");
  const portalSettings = await tx.doctorBookingSettings.findUnique({
    where: { doctorId: encounter.doctorId },
    select: { inviteAfterConsultation: true },
  });
  if (portalSettings?.inviteAfterConsultation !== false)
    await tx.patientPortalAccess.upsert({
      where: {
        patientId_doctorId: {
          patientId: encounter.patientId,
          doctorId: encounter.doctorId,
        },
      },
      update: {
        active: !patient.user.isGuest || patient.accountLink?.active === true,
      },
      create: {
        clinicId: encounter.clinicId,
        patientId: encounter.patientId,
        doctorId: encounter.doctorId,
        active: !patient.user.isGuest || patient.accountLink?.active === true,
      },
    });
  await tx.patientUploadGrant.upsert({
    where: { encounterId: encounter.id },
    update: {},
    create: {
      encounterId: encounter.id,
      clinicId: encounter.clinicId,
      doctorId: encounter.doctorId,
      patientId: encounter.patientId,
      capacity: 2,
    },
  });
  return preparePortalInvitation(tx, encounter);
}
