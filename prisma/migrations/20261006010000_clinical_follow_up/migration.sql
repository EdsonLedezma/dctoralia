-- CreateEnum
CREATE TYPE "AppointmentLifecycleEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "ClinicPatientStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClinicPatientSource" AS ENUM ('MANUAL', 'LEGACY_BACKFILL');

-- CreateEnum
CREATE TYPE "CareEpisodeStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClinicalEncounterStatus" AS ENUM ('DRAFT', 'SIGNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FollowUpTaskType" AS ENUM ('FOLLOW_UP_APPOINTMENT', 'REVIEW_RESULT', 'PATIENT_CHECK_IN', 'ADMINISTRATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "FollowUpTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "MedicalHistory" ADD COLUMN     "emergencyName" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "emergencyRelation" TEXT,
ADD COLUMN     "height" TEXT,
ADD COLUMN     "insuranceNumber" TEXT,
ADD COLUMN     "insuranceProvider" TEXT,
ADD COLUMN     "weight" TEXT;

-- CreateTable
CREATE TABLE "ClinicPatient" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "addedByUserId" TEXT,
    "source" "ClinicPatientSource" NOT NULL DEFAULT 'MANUAL',
    "status" "ClinicPatientStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicPatient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareEpisode" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "primaryDoctorId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CareEpisodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalEncounter" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "episodeId" TEXT,
    "authoredByUserId" TEXT NOT NULL,
    "status" "ClinicalEncounterStatus" NOT NULL DEFAULT 'DRAFT',
    "encounterAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chiefComplaint" TEXT,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalEncounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalEncounterAmendment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "authoredByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalEncounterAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpTask" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "episodeId" TEXT,
    "encounterId" TEXT,
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "completedByUserId" TEXT,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "type" "FollowUpTaskType" NOT NULL DEFAULT 'OTHER',
    "priority" "FollowUpTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "FollowUpTaskStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutcomeAssessment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "episodeId" TEXT,
    "encounterId" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "instrumentCode" TEXT NOT NULL,
    "instrumentVersion" TEXT NOT NULL,
    "score" DECIMAL(10,3),
    "scoreMin" DECIMAL(10,3),
    "scoreMax" DECIMAL(10,3),
    "responses" JSONB NOT NULL,
    "completedItemCount" INTEGER,
    "totalItemCount" INTEGER,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutcomeAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalAuditEvent" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT,
    "actorUserId" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentLifecycleEvent" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "appointmentId" TEXT,
    "patientId" TEXT,
    "doctorId" TEXT,
    "actorUserId" TEXT,
    "eventType" "AppointmentLifecycleEventType" NOT NULL,
    "fromStatus" "AppointmentStatus",
    "toStatus" "AppointmentStatus" NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicPatient_clinicId_status_updatedAt_idx" ON "ClinicPatient"("clinicId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ClinicPatient_patientId_status_idx" ON "ClinicPatient"("patientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicPatient_clinicId_patientId_key" ON "ClinicPatient"("clinicId", "patientId");

-- CreateIndex
CREATE INDEX "CareEpisode_clinicId_patientId_status_updatedAt_idx" ON "CareEpisode"("clinicId", "patientId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "CareEpisode_clinicId_primaryDoctorId_status_updatedAt_idx" ON "CareEpisode"("clinicId", "primaryDoctorId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalEncounter_appointmentId_key" ON "ClinicalEncounter"("appointmentId");

-- CreateIndex
CREATE INDEX "ClinicalEncounter_clinicId_patientId_encounterAt_idx" ON "ClinicalEncounter"("clinicId", "patientId", "encounterAt" DESC);

-- CreateIndex
CREATE INDEX "ClinicalEncounter_clinicId_doctorId_encounterAt_idx" ON "ClinicalEncounter"("clinicId", "doctorId", "encounterAt" DESC);

-- CreateIndex
CREATE INDEX "ClinicalEncounter_clinicId_episodeId_encounterAt_idx" ON "ClinicalEncounter"("clinicId", "episodeId", "encounterAt" DESC);

-- CreateIndex
CREATE INDEX "ClinicalEncounterAmendment_clinicId_encounterId_createdAt_idx" ON "ClinicalEncounterAmendment"("clinicId", "encounterId", "createdAt");

-- CreateIndex
CREATE INDEX "FollowUpTask_clinicId_status_dueAt_idx" ON "FollowUpTask"("clinicId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "FollowUpTask_clinicId_assignedToUserId_status_dueAt_idx" ON "FollowUpTask"("clinicId", "assignedToUserId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "FollowUpTask_clinicId_patientId_createdAt_idx" ON "FollowUpTask"("clinicId", "patientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "OutcomeAssessment_clinicId_patientId_instrumentCode_instrum_idx" ON "OutcomeAssessment"("clinicId", "patientId", "instrumentCode", "instrumentVersion", "measuredAt");

-- CreateIndex
CREATE INDEX "OutcomeAssessment_clinicId_episodeId_measuredAt_idx" ON "OutcomeAssessment"("clinicId", "episodeId", "measuredAt");

-- CreateIndex
CREATE INDEX "ClinicalAuditEvent_clinicId_patientId_createdAt_idx" ON "ClinicalAuditEvent"("clinicId", "patientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ClinicalAuditEvent_clinicId_resourceType_resourceId_created_idx" ON "ClinicalAuditEvent"("clinicId", "resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalAuditEvent_clinicId_actorUserId_createdAt_idx" ON "ClinicalAuditEvent"("clinicId", "actorUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AppointmentLifecycleEvent_clinicId_occurredAt_eventType_idx" ON "AppointmentLifecycleEvent"("clinicId", "occurredAt", "eventType");

-- CreateIndex
CREATE INDEX "AppointmentLifecycleEvent_clinicId_doctorId_occurredAt_idx" ON "AppointmentLifecycleEvent"("clinicId", "doctorId", "occurredAt");

-- CreateIndex
CREATE INDEX "AppointmentLifecycleEvent_appointmentId_occurredAt_idx" ON "AppointmentLifecycleEvent"("appointmentId", "occurredAt");

-- AddForeignKey
ALTER TABLE "ClinicPatient" ADD CONSTRAINT "ClinicPatient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicPatient" ADD CONSTRAINT "ClinicPatient_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicPatient" ADD CONSTRAINT "ClinicPatient_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareEpisode" ADD CONSTRAINT "CareEpisode_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareEpisode" ADD CONSTRAINT "CareEpisode_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareEpisode" ADD CONSTRAINT "CareEpisode_primaryDoctorId_fkey" FOREIGN KEY ("primaryDoctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareEpisode" ADD CONSTRAINT "CareEpisode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEncounter" ADD CONSTRAINT "ClinicalEncounter_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEncounter" ADD CONSTRAINT "ClinicalEncounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEncounter" ADD CONSTRAINT "ClinicalEncounter_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEncounter" ADD CONSTRAINT "ClinicalEncounter_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEncounter" ADD CONSTRAINT "ClinicalEncounter_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "CareEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEncounter" ADD CONSTRAINT "ClinicalEncounter_authoredByUserId_fkey" FOREIGN KEY ("authoredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEncounterAmendment" ADD CONSTRAINT "ClinicalEncounterAmendment_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "ClinicalEncounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEncounterAmendment" ADD CONSTRAINT "ClinicalEncounterAmendment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEncounterAmendment" ADD CONSTRAINT "ClinicalEncounterAmendment_authoredByUserId_fkey" FOREIGN KEY ("authoredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "CareEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "ClinicalEncounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeAssessment" ADD CONSTRAINT "OutcomeAssessment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeAssessment" ADD CONSTRAINT "OutcomeAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeAssessment" ADD CONSTRAINT "OutcomeAssessment_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "CareEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeAssessment" ADD CONSTRAINT "OutcomeAssessment_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "ClinicalEncounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeAssessment" ADD CONSTRAINT "OutcomeAssessment_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuditEvent" ADD CONSTRAINT "ClinicalAuditEvent_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuditEvent" ADD CONSTRAINT "ClinicalAuditEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuditEvent" ADD CONSTRAINT "ClinicalAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLifecycleEvent" ADD CONSTRAINT "AppointmentLifecycleEvent_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLifecycleEvent" ADD CONSTRAINT "AppointmentLifecycleEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLifecycleEvent" ADD CONSTRAINT "AppointmentLifecycleEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLifecycleEvent" ADD CONSTRAINT "AppointmentLifecycleEvent_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLifecycleEvent" ADD CONSTRAINT "AppointmentLifecycleEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill clinic membership from the legacy single-clinic patient field and
-- appointment clinic/doctor assignment. Keep the historical actor unknown.
WITH "PatientClinicPairs" AS (
    SELECT p."clinicId", p."id" AS "patientId"
    FROM "Patient" AS p
    WHERE p."clinicId" IS NOT NULL

    UNION

    SELECT COALESCE(a."clinicId", d."clinicId") AS "clinicId", a."patientId"
    FROM "Appointment" AS a
    INNER JOIN "Doctor" AS d ON d."id" = a."doctorId"
    WHERE COALESCE(a."clinicId", d."clinicId") IS NOT NULL
)
INSERT INTO "ClinicPatient" (
    "id",
    "clinicId",
    "patientId",
    "addedByUserId",
    "source",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy_' || md5("PatientClinicPairs"."clinicId" || ':' || "PatientClinicPairs"."patientId"),
    "PatientClinicPairs"."clinicId",
    "PatientClinicPairs"."patientId",
    NULL,
    'LEGACY_BACKFILL'::"ClinicPatientSource",
    'ACTIVE'::"ClinicPatientStatus",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "PatientClinicPairs"
ON CONFLICT ("clinicId", "patientId") DO NOTHING;

