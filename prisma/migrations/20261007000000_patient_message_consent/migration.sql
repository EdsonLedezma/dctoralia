-- Patient-controlled opt-in for appointment reminders. No existing patient is opted in.
ALTER TABLE "MessageOutbox" ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE TABLE "PatientMessageConsent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "consentedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMessageConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientMessageConsent_patientId_clinicId_channel_key"
ON "PatientMessageConsent"("patientId", "clinicId", "channel");

CREATE INDEX "PatientMessageConsent_clinicId_channel_consentedAt_idx"
ON "PatientMessageConsent"("clinicId", "channel", "consentedAt");

ALTER TABLE "PatientMessageConsent"
ADD CONSTRAINT "PatientMessageConsent_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientMessageConsent"
ADD CONSTRAINT "PatientMessageConsent_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
