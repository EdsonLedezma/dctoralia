ALTER TABLE "Notification"
ADD COLUMN "recipientUserId" TEXT;

UPDATE "Notification" AS notification
SET "recipientUserId" = doctor."userId"
FROM "Doctor" AS doctor
WHERE notification."doctorId" = doctor."id";

ALTER TABLE "Notification"
ALTER COLUMN "recipientUserId" SET NOT NULL;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_recipientUserId_fkey"
FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Notification_recipientUserId_isRead_createdAt_idx"
ON "Notification"("recipientUserId", "isRead", "createdAt");

ALTER TYPE "NotificationType" ADD VALUE 'FOLLOW_UP_TASK_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'FOLLOW_UP_TASK_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_COMPLETED';

ALTER TABLE "Notification"
ADD COLUMN "followUpTaskId" TEXT;

ALTER TABLE "Notification"
ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "Notification_idempotencyKey_key"
ON "Notification"("idempotencyKey");

ALTER TABLE "FollowUpTask"
ADD COLUMN "dueAlertedAt" TIMESTAMP(3);

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_followUpTaskId_fkey"
FOREIGN KEY ("followUpTaskId") REFERENCES "FollowUpTask"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
