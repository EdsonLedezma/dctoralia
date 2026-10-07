-- Clinical documents use a separate private Vercel Blob store. Only opaque
-- pathnames and display metadata are persisted in PostgreSQL.
CREATE TYPE "ClinicalFileCategory" AS ENUM (
  'LAB_RESULT',
  'IMAGING',
  'PRESCRIPTION',
  'REFERRAL',
  'CONSENT',
  'OTHER'
);

CREATE TABLE "ClinicalFile" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "episodeId" TEXT,
  "encounterId" TEXT,
  "uploadedByUserId" TEXT NOT NULL,
  "blobPathname" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "mediaType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "category" "ClinicalFileCategory" NOT NULL DEFAULT 'OTHER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClinicalFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicalFile_blobPathname_key"
  ON "ClinicalFile"("blobPathname");
CREATE INDEX "ClinicalFile_clinicId_patientId_createdAt_idx"
  ON "ClinicalFile"("clinicId", "patientId", "createdAt" DESC);
CREATE INDEX "ClinicalFile_clinicId_episodeId_createdAt_idx"
  ON "ClinicalFile"("clinicId", "episodeId", "createdAt" DESC);

ALTER TABLE "ClinicalFile"
  ADD CONSTRAINT "ClinicalFile_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalFile"
  ADD CONSTRAINT "ClinicalFile_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalFile"
  ADD CONSTRAINT "ClinicalFile_episodeId_fkey"
  FOREIGN KEY ("episodeId") REFERENCES "CareEpisode"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalFile"
  ADD CONSTRAINT "ClinicalFile_encounterId_fkey"
  FOREIGN KEY ("encounterId") REFERENCES "ClinicalEncounter"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalFile"
  ADD CONSTRAINT "ClinicalFile_uploadedByUserId_fkey"
  FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
