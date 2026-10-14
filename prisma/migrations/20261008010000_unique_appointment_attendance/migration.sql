-- A check-in and consultation start are each recorded at most once per appointment.
ALTER TABLE "AppointmentLifecycleEvent" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "AppointmentLifecycleEvent_idempotencyKey_key"
ON "AppointmentLifecycleEvent"("idempotencyKey");
