import "server-only";

import type { PrismaClient } from "@prisma/client";

import {
  careEpisodeScope,
  clinicalFileScope,
  patientClinicalScope,
  type ClinicalActor,
} from "~/server/domain/clinical/access";
import { recordClinicalRead } from "~/server/domain/clinical/audit";

const MAX_RECORDS_PER_SECTION = 1_000;
const MAX_EXPORT_BYTES = 20 * 1024 * 1024;

export class ClinicalExportError extends Error {
  constructor(
    readonly status: 404 | 413,
    message: string,
  ) {
    super(message);
  }
}

/** Generate a bounded, clinician-scoped JSON snapshot without Blob credentials or URLs. */
export async function generateClinicalExport(
  db: PrismaClient,
  actor: ClinicalActor,
  patientId: string,
) {
  const patient = await db.patient.findFirst({
    where: { id: patientId, ...patientClinicalScope(actor) },
    select: {
      id: true,
      birthDate: true,
      gender: true,
      user: { select: { name: true } },
    },
  });
  if (!patient) {
    throw new ClinicalExportError(
      404,
      "Paciente no encontrado en tu seguimiento clínico.",
    );
  }

  // A requested export is auditable even when the snapshot cannot be generated.
  await recordClinicalRead(db, actor, {
    resourceType: "PATIENT_CLINICAL_EXPORT",
    resourceId: patient.id,
    patientId: patient.id,
    action: "CLINICAL_EXPORT_REQUESTED",
  });

  const snapshot = await db.$transaction(
    async (tx) => {
      const consent = await tx.medicalHistoryConsent.findUnique({
        where: {
          patientId_clinicId: {
            patientId: patient.id,
            clinicId: actor.clinicId,
          },
        },
        select: { status: true },
      });
      const [
        episodes,
        encounters,
        followUps,
        outcomes,
        observations,
        appointments,
        files,
        medicalHistory,
      ] = await Promise.all([
        tx.careEpisode.findMany({
          where: { ...careEpisodeScope(actor), patientId: patient.id },
          select: {
            id: true,
            title: true,
            status: true,
            openedAt: true,
            closedAt: true,
            createdAt: true,
          },
          orderBy: { openedAt: "asc" },
          take: MAX_RECORDS_PER_SECTION + 1,
        }),
        tx.clinicalEncounter.findMany({
          where: {
            clinicId: actor.clinicId,
            patientId: patient.id,
            doctorId: actor.doctorId,
          },
          select: {
            id: true,
            episodeId: true,
            appointmentId: true,
            status: true,
            encounterAt: true,
            chiefComplaint: true,
            subjective: true,
            objective: true,
            assessment: true,
            plan: true,
            signedAt: true,
            authoredBy: { select: { name: true } },
            amendments: {
              select: {
                reason: true,
                changes: true,
                createdAt: true,
                authoredBy: { select: { name: true } },
              },
              orderBy: { createdAt: "asc" },
              take: MAX_RECORDS_PER_SECTION + 1,
            },
          },
          orderBy: { encounterAt: "asc" },
          take: MAX_RECORDS_PER_SECTION + 1,
        }),
        tx.followUpTask.findMany({
          where: {
            clinicId: actor.clinicId,
            patientId: patient.id,
            OR: [
              { assignedToUserId: actor.userId },
              { createdByUserId: actor.userId },
            ],
          },
          select: {
            id: true,
            episodeId: true,
            encounterId: true,
            title: true,
            details: true,
            type: true,
            priority: true,
            status: true,
            dueAt: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" },
          take: MAX_RECORDS_PER_SECTION + 1,
        }),
        tx.outcomeAssessment.findMany({
          where: {
            clinicId: actor.clinicId,
            patientId: patient.id,
            episode: { primaryDoctorId: actor.doctorId },
          },
          select: {
            id: true,
            episodeId: true,
            encounterId: true,
            instrumentCode: true,
            instrumentVersion: true,
            score: true,
            scoreMin: true,
            scoreMax: true,
            responses: true,
            completedItemCount: true,
            totalItemCount: true,
            measuredAt: true,
            recordedBy: { select: { name: true } },
          },
          orderBy: { measuredAt: "asc" },
          take: MAX_RECORDS_PER_SECTION + 1,
        }),
        tx.clinicalObservation.findMany({
          where: {
            clinicId: actor.clinicId,
            patientId: patient.id,
            OR: [
              { recordedByUserId: actor.userId },
              { episode: { primaryDoctorId: actor.doctorId } },
              { encounter: { doctorId: actor.doctorId } },
            ],
          },
          select: {
            id: true,
            episodeId: true,
            encounterId: true,
            code: true,
            value: true,
            unit: true,
            context: true,
            measuredAt: true,
            voidedAt: true,
            voidReason: true,
            recordedBy: { select: { name: true } },
          },
          orderBy: { measuredAt: "asc" },
          take: MAX_RECORDS_PER_SECTION + 1,
        }),
        tx.appointment.findMany({
          where: {
            clinicId: actor.clinicId,
            patientId: patient.id,
            doctorId: actor.doctorId,
          },
          select: {
            id: true,
            date: true,
            time: true,
            duration: true,
            status: true,
            reason: true,
            notes: true,
            severity: true,
            service: { select: { name: true } },
          },
          orderBy: [{ date: "asc" }, { time: "asc" }],
          take: MAX_RECORDS_PER_SECTION + 1,
        }),
        tx.clinicalFile.findMany({
          where: { patientId: patient.id, ...clinicalFileScope(actor) },
          select: {
            id: true,
            episodeId: true,
            encounterId: true,
            originalFilename: true,
            mediaType: true,
            sizeBytes: true,
            category: true,
            createdAt: true,
            uploadedBy: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
          take: MAX_RECORDS_PER_SECTION + 1,
        }),
        consent?.status === "GRANTED"
          ? tx.medicalHistory.findUnique({
              where: { patientId: patient.id },
              select: {
                bloodType: true,
                allergies: true,
                medications: true,
                chronicDiseases: true,
                lastUpdated: true,
              },
            })
          : Promise.resolve(null),
      ]);

      const sections = {
        episodes,
        encounters,
        followUps,
        outcomes,
        observations,
        appointments,
        files,
      };
      if (
        Object.values(sections).some(
          (items) => items.length > MAX_RECORDS_PER_SECTION,
        ) ||
        encounters.some(
          (encounter) => encounter.amendments.length > MAX_RECORDS_PER_SECTION,
        )
      ) {
        throw new ClinicalExportError(
          413,
          "El expediente supera el tamaño permitido para la descarga directa.",
        );
      }

      return { ...sections, medicalHistory };
    },
    { isolationLevel: "RepeatableRead" },
  );

  const generatedAt = new Date().toISOString();
  const { medicalHistory, ...sections } = snapshot;
  const payload = {
    format: "dctoralia-clinical-export-v1",
    generatedAt,
    scope: { clinicId: actor.clinicId, doctorId: actor.doctorId },
    patient,
    patientReportedHistory: medicalHistory,
    ...sections,
    // Clinical files are metadata only. Each binary remains behind its authenticated route.
    fileContentsIncluded: false,
  };
  const body = JSON.stringify(payload, null, 2);
  const bytes = Buffer.byteLength(body, "utf8");
  if (bytes > MAX_EXPORT_BYTES) {
    throw new ClinicalExportError(
      413,
      "El expediente supera el tamaño permitido para la descarga directa.",
    );
  }

  await db.clinicalAuditEvent.create({
    data: {
      clinicId: actor.clinicId,
      patientId: patient.id,
      actorUserId: actor.userId,
      resourceType: "PATIENT_CLINICAL_EXPORT",
      resourceId: patient.id,
      action: "CLINICAL_EXPORT_GENERATED",
      metadata: {
        format: "json-v1",
        bytes,
        recordCounts: Object.fromEntries(
          Object.entries(snapshot)
            .filter(([, value]) => Array.isArray(value))
            .map(([section, value]) => [section, (value as unknown[]).length]),
        ),
      },
    },
  });

  return { body, bytes, generatedAt };
}
