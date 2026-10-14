CREATE TABLE "ClinicalObservation" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "episodeId" TEXT,
    "encounterId" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "value" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "context" VARCHAR(240),
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedByUserId" TEXT,
    "voidReason" VARCHAR(500),
    CONSTRAINT "ClinicalObservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClinicalObservation_clinicId_patientId_code_measuredAt_idx"
ON "ClinicalObservation"("clinicId", "patientId", "code", "measuredAt" DESC);
CREATE INDEX "ClinicalObservation_clinicId_episodeId_measuredAt_idx"
ON "ClinicalObservation"("clinicId", "episodeId", "measuredAt" DESC);

ALTER TABLE "ClinicalObservation" ADD CONSTRAINT "ClinicalObservation_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalObservation" ADD CONSTRAINT "ClinicalObservation_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalObservation" ADD CONSTRAINT "ClinicalObservation_episodeId_fkey"
FOREIGN KEY ("episodeId") REFERENCES "CareEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalObservation" ADD CONSTRAINT "ClinicalObservation_encounterId_fkey"
FOREIGN KEY ("encounterId") REFERENCES "ClinicalEncounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalObservation" ADD CONSTRAINT "ClinicalObservation_recordedByUserId_fkey"
FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalObservation" ADD CONSTRAINT "ClinicalObservation_voidedByUserId_fkey"
FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
