-- Patient-controlled access to global, self-reported medical history.
CREATE TYPE "MedicalHistoryConsentStatus" AS ENUM ('GRANTED', 'REVOKED');

CREATE TABLE "MedicalHistoryConsent" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "status" "MedicalHistoryConsentStatus" NOT NULL DEFAULT 'REVOKED',
  "policyVersion" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MedicalHistoryConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MedicalHistoryConsent_patientId_clinicId_key"
  ON "MedicalHistoryConsent"("patientId", "clinicId");
CREATE INDEX "MedicalHistoryConsent_clinicId_status_updatedAt_idx"
  ON "MedicalHistoryConsent"("clinicId", "status", "updatedAt");

ALTER TABLE "MedicalHistoryConsent"
  ADD CONSTRAINT "MedicalHistoryConsent_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicalHistoryConsent"
  ADD CONSTRAINT "MedicalHistoryConsent_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
