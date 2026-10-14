import type { MessageChannel, Prisma } from "@prisma/client";
import { env } from "~/env";

type ReminderTx = Pick<
  Prisma.TransactionClient,
  "clinic" | "patientMessageConsent" | "messageOutbox"
>;

type AppointmentForReminder = {
  id: string;
  clinicId: string | null;
  patientId: string;
  date: Date;
  time: string;
  patient: { phone: string; user: { name: string | null } };
  doctor: { user: { name: string | null } };
};

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function zonedParts(date: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

export function localTimeToUtc(parts: LocalParts, timeZone: string): Date {
  const target = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
  let candidate = target;
  // Correct the UTC guess against the requested IANA timezone, including DST.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedParts(new Date(candidate), timeZone);
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );
    const difference = target - represented;
    if (difference === 0) break;
    candidate += difference;
  }
  return new Date(candidate);
}

function appointmentInstant(date: Date, time: string, timeZone: string): Date {
  const [hour, minute] = time.split(":").map(Number);
  return localTimeToUtc(
    {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: hour ?? 0,
      minute: minute ?? 0,
    },
    timeZone,
  );
}

function addLocalDay(
  parts: LocalParts,
  hour: number,
  minute: number,
): LocalParts {
  const nextDay = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + 1),
  );
  return {
    year: nextDay.getUTCFullYear(),
    month: nextDay.getUTCMonth() + 1,
    day: nextDay.getUTCDate(),
    hour,
    minute,
  };
}

export function insidePatientHours(
  date: Date,
  appointment: Date,
  timeZone: string,
  now: Date,
): Date | null {
  let parts = zonedParts(date, timeZone);
  let candidate = date;
  if (parts.hour < 9) {
    candidate = localTimeToUtc({ ...parts, hour: 9, minute: 0 }, timeZone);
  } else if (parts.hour >= 19) {
    candidate = localTimeToUtc(addLocalDay(parts, 9, 0), timeZone);
  }
  if (candidate <= now || candidate >= appointment) return null;
  return candidate;
}

function dateLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function resolveTimeZone(value: string | null | undefined): string {
  if (value) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return value;
    } catch {
      // Fall through to the product's Mexico default for invalid legacy values.
    }
  }
  return "America/Mexico_City";
}

export function recipientPhone(value: string): string | null {
  const normalized = value.replace(/[\s()-]/g, "");
  if (/^\d{10}$/.test(normalized)) return `+52${normalized}`;
  if (/^52\d{10}$/.test(normalized)) return `+${normalized}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

export async function cancelPendingAppointmentReminders(
  tx: ReminderTx,
  appointmentId: string,
) {
  await tx.messageOutbox.updateMany({
    where: {
      correlationId: appointmentId,
      idempotencyKey: { startsWith: `appointment-reminder:${appointmentId}:` },
      status: { in: ["PENDING", "FAILED"] },
    },
    data: { status: "CANCELLED", lastErrorCode: "APPOINTMENT_CHANGED" },
  });
}

export async function scheduleAppointmentReminders(
  tx: ReminderTx,
  appointment: AppointmentForReminder,
  now = new Date(),
) {
  if (!appointment.clinicId || !env.SENT_APPOINTMENT_REMINDER_TEMPLATE) return;
  const phone = recipientPhone(appointment.patient.phone);
  if (!phone) return;

  const [clinic, consents] = await Promise.all([
    tx.clinic.findUnique({
      where: { id: appointment.clinicId },
      select: { timezone: true },
    }),
    tx.patientMessageConsent.findMany({
      where: {
        patientId: appointment.patientId,
        clinicId: appointment.clinicId,
        purpose: "APPOINTMENT_REMINDER",
        consentedAt: { not: null },
        revokedAt: null,
      },
      select: { channel: true },
    }),
  ]);
  if (!clinic || consents.length === 0) return;

  const timeZone = resolveTimeZone(clinic.timezone);
  const appointmentAt = appointmentInstant(
    appointment.date,
    appointment.time,
    timeZone,
  );
  const channels = consents
    .map((consent) => consent.channel)
    .filter(
      (channel): channel is Extract<MessageChannel, "SMS" | "WHATSAPP"> =>
        channel === "SMS" || channel === "WHATSAPP",
    );
  const payload: Prisma.InputJsonObject = {
    patient_name:
      appointment.patient.user.name?.trim().split(/\s+/)[0] || "Paciente",
    doctor_name: appointment.doctor.user.name || "tu doctor",
    appointment_date: dateLabel(appointment.date),
    appointment_time: appointment.time,
  };

  for (const channel of channels) {
    for (const [kind, hoursBefore] of [
      ["24h", 24],
      ["2h", 2],
    ] as const) {
      const requestedAt = new Date(
        appointmentAt.getTime() - hoursBefore * 60 * 60_000,
      );
      const nextAttemptAt = insidePatientHours(
        requestedAt,
        appointmentAt,
        timeZone,
        now,
      );
      if (!nextAttemptAt) continue;
      const localSendTime = zonedParts(nextAttemptAt, timeZone);
      const quietHoursEnd = localTimeToUtc(
        { ...localSendTime, hour: 19, minute: 0 },
        timeZone,
      );
      const expiresAt = new Date(
        Math.min(
          appointmentAt.getTime(),
          quietHoursEnd.getTime(),
          nextAttemptAt.getTime() + 30 * 60_000,
        ),
      );
      if (expiresAt <= nextAttemptAt) continue;
      const idempotencyKey = `appointment-reminder:${appointment.id}:${channel}:${kind}:${nextAttemptAt.toISOString()}`;
      await tx.messageOutbox.updateMany({
        where: { idempotencyKey, status: "CANCELLED" },
        data: {
          status: "PENDING",
          attempts: 0,
          nextAttemptAt,
          expiresAt,
          failedAt: null,
          sentAt: null,
          deliveredAt: null,
          lastErrorCode: null,
        },
      });
      await tx.messageOutbox.upsert({
        where: { idempotencyKey },
        update: {},
        create: {
          clinicId: appointment.clinicId,
          channel,
          recipient: phone,
          template: env.SENT_APPOINTMENT_REMINDER_TEMPLATE,
          payload,
          correlationId: appointment.id,
          idempotencyKey,
          nextAttemptAt,
          expiresAt,
          sandbox: env.SENT_SANDBOX !== "false",
        },
      });
    }
  }
}
