-- Keep appointment reminders and clinical follow-up reminders under separate explicit consent.
CREATE TYPE "PatientMessagePurpose" AS ENUM ('APPOINTMENT_REMINDER', 'FOLLOW_UP_REMINDER');

ALTER TABLE "PatientMessageConsent"
ADD COLUMN "purpose" "PatientMessagePurpose" NOT NULL DEFAULT 'APPOINTMENT_REMINDER';

DROP INDEX "PatientMessageConsent_patientId_clinicId_channel_key";
CREATE UNIQUE INDEX "PatientMessageConsent_patientId_clinicId_channel_purpose_key"
ON "PatientMessageConsent"("patientId", "clinicId", "channel", "purpose");

DROP INDEX "PatientMessageConsent_clinicId_channel_consentedAt_idx";
CREATE INDEX "PatientMessageConsent_clinicId_channel_purpose_consentedAt_idx"
ON "PatientMessageConsent"("clinicId", "channel", "purpose", "consentedAt");
