import type { MessageChannel, Prisma } from "@prisma/client";
import { env } from "~/env";
import {
  insidePatientHours,
  localTimeToUtc,
  recipientPhone,
  resolveTimeZone,
  zonedParts,
} from "./appointment-reminders";

type FollowUpReminderTx = Pick<
  Prisma.TransactionClient,
  "clinic" | "patientMessageConsent" | "messageOutbox"
>;

type FollowUpTaskForReminder = {
  id: string;
  clinicId: string;
  patientId: string;
  dueAt: Date | null;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  patient: { phone: string; user: { name: string | null } };
};

const activeTaskStatuses = ["OPEN", "IN_PROGRESS"] as const;

export async function cancelPendingFollowUpReminder(
  tx: FollowUpReminderTx,
  taskId: string,
) {
  await tx.messageOutbox.updateMany({
    where: {
      correlationId: taskId,
      idempotencyKey: { startsWith: `follow-up-reminder:${taskId}:` },
      status: { in: ["PENDING", "FAILED"] },
    },
    data: { status: "CANCELLED", lastErrorCode: "FOLLOW_UP_CLOSED" },
  });
}

export async function scheduleFollowUpReminder(
  tx: FollowUpReminderTx,
  task: FollowUpTaskForReminder,
  now = new Date(),
  onlyChannel?: Extract<MessageChannel, "SMS" | "WHATSAPP">,
) {
  if (
    !task.dueAt ||
    !activeTaskStatuses.includes(
      task.status as (typeof activeTaskStatuses)[number],
    ) ||
    !env.SENT_FOLLOW_UP_REMINDER_TEMPLATE
  ) {
    return;
  }
  const phone = recipientPhone(task.patient.phone);
  if (!phone) return;

  const [clinic, consents] = await Promise.all([
    tx.clinic.findUnique({
      where: { id: task.clinicId },
      select: { name: true, timezone: true },
    }),
    tx.patientMessageConsent.findMany({
      where: {
        patientId: task.patientId,
        clinicId: task.clinicId,
        purpose: "FOLLOW_UP_REMINDER",
        consentedAt: { not: null },
        revokedAt: null,
      },
      select: { channel: true },
    }),
  ]);
  if (!clinic || consents.length === 0) return;

  const timeZone = resolveTimeZone(clinic.timezone);
  const requestedAt = new Date(
    Math.max(task.dueAt.getTime() - 24 * 60 * 60_000, now.getTime()),
  );
  const nextAttemptAt = insidePatientHours(
    requestedAt,
    task.dueAt,
    timeZone,
    now,
  );
  if (!nextAttemptAt) return;

  const localSendTime = zonedParts(nextAttemptAt, timeZone);
  const quietHoursEnd = localTimeToUtc(
    { ...localSendTime, hour: 19, minute: 0 },
    timeZone,
  );
  const expiresAt = new Date(
    Math.min(
      task.dueAt.getTime(),
      quietHoursEnd.getTime(),
      nextAttemptAt.getTime() + 30 * 60_000,
    ),
  );
  if (expiresAt <= nextAttemptAt) return;

  const payload: Prisma.InputJsonObject = {
    patient_name: task.patient.user.name?.trim().split(/\s+/)[0] || "Paciente",
    clinic_name: clinic.name,
    due_date: new Intl.DateTimeFormat("es-MX", {
      timeZone,
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
    }).format(task.dueAt),
  };

  for (const consent of consents) {
    if (consent.channel !== "SMS" && consent.channel !== "WHATSAPP") continue;
    if (onlyChannel && consent.channel !== onlyChannel) continue;
    const idempotencyKey = `follow-up-reminder:${task.id}:${consent.channel}:${task.dueAt.toISOString()}`;
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
        clinicId: task.clinicId,
        channel: consent.channel,
        recipient: phone,
        template: env.SENT_FOLLOW_UP_REMINDER_TEMPLATE,
        payload,
        correlationId: task.id,
        idempotencyKey,
        nextAttemptAt,
        expiresAt,
        sandbox: env.SENT_SANDBOX !== "false",
      },
    });
  }
}
