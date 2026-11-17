import type { Prisma } from "@prisma/client";
import { enqueueMessage } from "~/server/domain/messaging/outbox";
import { normalizeVoicePhone } from "~/server/integrations/vapi/phone-number";

export async function queueAppointmentConfirmation(
  tx: Prisma.TransactionClient,
  appointment: {
    id: string;
    clinicId: string | null;
    doctorId: string;
    patientId: string;
    date: Date;
    time: string;
    locationName?: string | null;
    locationAddress?: string | null;
    locationDirections?: string | null;
    locationLatitude?: number | null;
    locationLongitude?: number | null;
  },
) {
  if (!appointment.clinicId) return { queued: false };
  const { env } = await import("~/env");
  const [settings, patient, doctor, clinic, consent] = await Promise.all([
    tx.doctorBookingSettings.findUnique({
      where: { doctorId: appointment.doctorId },
    }),
    tx.patient.findUnique({
      where: { id: appointment.patientId },
      select: { phone: true, user: { select: { name: true } } },
    }),
    tx.doctor.findUnique({
      where: { id: appointment.doctorId },
      select: { clinicId: true, phone: true, user: { select: { name: true } } },
    }),
    tx.clinic.findUnique({
      where: { id: appointment.clinicId },
      select: { timezone: true, name: true },
    }),
    tx.patientMessageConsent.findFirst({
      where: {
        clinicId: appointment.clinicId,
        patientId: appointment.patientId,
        channel: "WHATSAPP",
        purpose: "APPOINTMENT_CONFIRMATION",
        consentedAt: { not: null },
        revokedAt: null,
      },
      select: { id: true },
    }),
  ]);
  const phone = patient ? normalizeVoicePhone(patient.phone) : null;
  const supportPhone = normalizeVoicePhone(
    settings?.supportPhone ?? doctor?.phone ?? "",
  );
  const template =
    settings?.confirmationTemplate ??
    env.SENT_APPOINTMENT_CONFIRMATION_TEMPLATE;
  if (
    !phone ||
    !supportPhone ||
    !consent ||
    !template ||
    !clinic ||
    doctor?.clinicId !== appointment.clinicId ||
    settings?.sendConfirmation === false ||
    env.DEMO_MODE === "true" ||
    env.SENT_ENABLED !== "true"
  )
    return { queued: false };
  const result = await enqueueMessage(tx, {
    clinicId: appointment.clinicId,
    channel: "WHATSAPP",
    recipient: phone,
    template,
    payload: {
      patient_name: patient?.user.name ?? "Paciente",
      doctor_name: doctor.user.name,
      clinic_name: clinic.name,
      appointment_date: new Intl.DateTimeFormat("es-MX", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(appointment.date),
      appointment_time: appointment.time,
      contact_phone: supportPhone,
      location_name: appointment.locationName ?? clinic.name,
      location_address: appointment.locationAddress ?? "",
      location_directions: appointment.locationDirections ?? "",
      location_maps_url: appointment.locationAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.locationLatitude != null && appointment.locationLongitude != null ? `${appointment.locationLatitude},${appointment.locationLongitude}` : appointment.locationAddress)}`
        : "",
    },
    idempotencyKey: `appointment-confirmed:${appointment.id}:${appointment.date.toISOString().slice(0, 10)}:${appointment.time}`,
    correlationId: appointment.id,
    sandbox: env.SENT_SANDBOX !== "false",
  });
  return { queued: true, messageId: result.id };
}
