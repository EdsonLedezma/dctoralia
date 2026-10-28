import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import type { ClinicalActor } from "~/server/domain/clinical/access";
import { recordClinicalRead } from "~/server/domain/clinical/audit";
import { clinicalObservationCatalog } from "~/lib/clinical-observations";
import { scheduleFollowUpReminder } from "~/server/domain/messaging/follow-up-reminders";
import {
  careEpisodeScope,
  patientClinicalScope,
  patientEpisodeCreationScope,
} from "~/server/domain/clinical/access";
import type {
  CreateCareEpisodeInput,
  AmendEncounterInput,
  CreateEncounterDraftInput,
  CreateFollowUpTaskInput,
  IssuePrescriptionInput,
  RecordOutcomeAssessmentInput,
  RecordClinicalObservationInput,
  UpdateEncounterDraftInput,
} from "~/server/domain/clinical/schemas";

type Db = PrismaClient;
type CreateEpisodeInput = CreateCareEpisodeInput;
type CreateEncounterInput = CreateEncounterDraftInput;
type UpdateEncounterInput = UpdateEncounterDraftInput;
type CreateFollowUpInput = CreateFollowUpTaskInput;
type RecordOutcomeInput = RecordOutcomeAssessmentInput;

export class ClinicalWorkflowError extends Error {
  constructor(
    readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "CONFLICT"
      | "INVALID_STATE"
      | "INVALID_RELATIONSHIP",
    message: string,
  ) {
    super(message);
  }
}

export async function recordClinicalObservation(
  db: Db,
  actor: ClinicalActor,
  input: RecordClinicalObservationInput,
) {
  await assertPatientInScope(db, actor, input.patientId);
  if (input.episodeId) {
    const episode = await db.careEpisode.findFirst({
      where: {
        id: input.episodeId,
        patientId: input.patientId,
        ...careEpisodeScope(actor),
      },
      select: { id: true },
    });
    if (!episode) {
      throw new ClinicalWorkflowError(
        "INVALID_RELATIONSHIP",
        "El episodio no pertenece a este expediente.",
      );
    }
  }
  if (input.encounterId) {
    const encounter = await db.clinicalEncounter.findFirst({
      where: {
        id: input.encounterId,
        patientId: input.patientId,
        clinicId: actor.clinicId,
        doctorId: actor.doctorId,
        ...(input.episodeId ? { episodeId: input.episodeId } : {}),
      },
      select: { id: true },
    });
    if (!encounter) {
      throw new ClinicalWorkflowError(
        "INVALID_RELATIONSHIP",
        "La consulta no pertenece a este expediente.",
      );
    }
  }

  return db.$transaction(async (tx) => {
    const observation = await tx.clinicalObservation.create({
      data: {
        clinicId: actor.clinicId,
        patientId: input.patientId,
        episodeId: input.episodeId,
        encounterId: input.encounterId,
        recordedByUserId: actor.userId,
        code: input.code,
        unit: clinicalObservationCatalog[input.code].unit,
        value: new Prisma.Decimal(input.value),
        context: input.context || null,
        measuredAt: input.measuredAt,
      },
      select: { id: true, code: true, measuredAt: true },
    });
    await tx.clinicalAuditEvent.create({
      data: {
        clinicId: actor.clinicId,
        patientId: input.patientId,
        actorUserId: actor.userId,
        resourceType: "CLINICAL_OBSERVATION",
        resourceId: observation.id,
        action: "CLINICAL_OBSERVATION_RECORDED",
        metadata: { code: observation.code },
      },
    });
    return observation;
  });
}

export async function voidClinicalObservation(
  db: Db,
  actor: ClinicalActor,
  input: { observationId: string; reason: string },
) {
  const observation = await db.clinicalObservation.findFirst({
    where: {
      id: input.observationId,
      clinicId: actor.clinicId,
      recordedByUserId: actor.userId,
      voidedAt: null,
    },
    select: { id: true, patientId: true },
  });
  if (!observation) {
    throw new ClinicalWorkflowError(
      "NOT_FOUND",
      "No se encontró una medición vigente registrada por ti.",
    );
  }
  await assertPatientInScope(db, actor, observation.patientId);
  return db.$transaction(async (tx) => {
    const updated = await tx.clinicalObservation.updateMany({
      where: { id: observation.id, clinicId: actor.clinicId, voidedAt: null },
      data: {
        voidedAt: new Date(),
        voidedByUserId: actor.userId,
        voidReason: input.reason,
      },
    });
    if (updated.count !== 1) {
      throw new ClinicalWorkflowError(
        "CONFLICT",
        "La medición cambió. Actualiza el expediente.",
      );
    }
    await tx.clinicalAuditEvent.create({
      data: {
        clinicId: actor.clinicId,
        patientId: observation.patientId,
        actorUserId: actor.userId,
        resourceType: "CLINICAL_OBSERVATION",
        resourceId: observation.id,
        action: "CLINICAL_OBSERVATION_VOIDED",
      },
    });
    return { id: observation.id };
  });
}

async function assertPatientInScope(
  db: Db,
  actor: ClinicalActor,
  patientId: string,
) {
  const patient = await db.patient.findFirst({
    where: { id: patientId, ...patientClinicalScope(actor) },
    select: { id: true, clinicId: true },
  });
  if (!patient) {
    throw new ClinicalWorkflowError(
      "NOT_FOUND",
      "No se encontró al paciente en tu seguimiento clínico.",
    );
  }
  return patient;
}

export async function openCareEpisode(
  db: Db,
  actor: ClinicalActor,
  input: CreateEpisodeInput,
) {
  const patient = await db.patient.findFirst({
    where: { id: input.patientId, ...patientEpisodeCreationScope(actor) },
    select: { id: true },
  });
  if (!patient) {
    throw new ClinicalWorkflowError(
      "NOT_FOUND",
      "No se encontró al paciente dentro de este consultorio.",
    );
  }

  return db.$transaction(async (tx) => {
    await tx.clinicPatient.upsert({
      where: {
        clinicId_patientId: {
          clinicId: actor.clinicId,
          patientId: patient.id,
        },
      },
      update: { status: "ACTIVE" },
      create: {
        clinicId: actor.clinicId,
        patientId: patient.id,
        addedByUserId: actor.userId,
      },
    });
    const episode = await tx.careEpisode.create({
      data: {
        clinicId: actor.clinicId,
        patientId: patient.id,
        primaryDoctorId: actor.doctorId,
        createdByUserId: actor.userId,
        title: input.title,
      },
    });
    await tx.clinicalAuditEvent.create({
      data: {
        clinicId: actor.clinicId,
        patientId: patient.id,
        actorUserId: actor.userId,
        resourceType: "CARE_EPISODE",
        resourceId: episode.id,
        action: "CARE_EPISODE_OPENED",
      },
    });
    return episode;
  });
}

export async function createEncounterDraft(
  db: Db,
  actor: ClinicalActor,
  input: CreateEncounterInput,
) {
  await assertPatientInScope(db, actor, input.patientId);
  if (input.episodeId) {
    const episode = await db.careEpisode.findFirst({
      where: { id: input.episodeId, ...careEpisodeScope(actor) },
      select: { id: true, patientId: true },
    });
    if (!episode || episode.patientId !== input.patientId) {
      throw new ClinicalWorkflowError(
        "INVALID_RELATIONSHIP",
        "El episodio no pertenece a este paciente o consultorio.",
      );
    }
  }
  if (input.appointmentId) {
    const appointment = await db.appointment.findFirst({
      where: {
        id: input.appointmentId,
        clinicId: actor.clinicId,
        doctorId: actor.doctorId,
        patientId: input.patientId,
      },
      select: { id: true },
    });
    if (!appointment) {
      throw new ClinicalWorkflowError(
        "INVALID_RELATIONSHIP",
        "La cita no corresponde a este paciente, doctor y consultorio.",
      );
    }
  }

  return db.$transaction(async (tx) => {
    const encounter = await tx.clinicalEncounter.create({
      data: {
        clinicId: actor.clinicId,
        patientId: input.patientId,
        doctorId: actor.doctorId,
        authoredByUserId: actor.userId,
        appointmentId: input.appointmentId,
        episodeId: input.episodeId,
        encounterAt: input.encounterAt,
        chiefComplaint: input.chiefComplaint,
        subjective: input.subjective,
        objective: input.objective,
        assessment: input.assessment,
        plan: input.plan,
        patientSummary: input.patientSummary,
      },
    });
    await tx.clinicalAuditEvent.create({
      data: {
        clinicId: actor.clinicId,
        patientId: input.patientId,
        actorUserId: actor.userId,
        resourceType: "CLINICAL_ENCOUNTER",
        resourceId: encounter.id,
        action: "CLINICAL_ENCOUNTER_DRAFT_CREATED",
      },
    });
    return encounter;
  });
}

export async function updateEncounterDraft(
  db: Db,
  actor: ClinicalActor,
  input: UpdateEncounterInput,
) {
  const existing = await db.clinicalEncounter.findFirst({
    where: {
      id: input.encounterId,
      clinicId: actor.clinicId,
      doctorId: actor.doctorId,
      authoredByUserId: actor.userId,
      status: "DRAFT",
    },
    select: { id: true, patientId: true },
  });
  if (!existing) {
    throw new ClinicalWorkflowError(
      "INVALID_STATE",
      "El borrador no existe, no te pertenece o ya fue firmado.",
    );
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.clinicalEncounter.updateMany({
      where: {
        id: existing.id,
        clinicId: actor.clinicId,
        authoredByUserId: actor.userId,
        status: "DRAFT",
      },
      data: {
        chiefComplaint: input.chiefComplaint,
        subjective: input.subjective,
        objective: input.objective,
        assessment: input.assessment,
        plan: input.plan,
        patientSummary: input.patientSummary,
      },
    });
    if (updated.count !== 1) {
      throw new ClinicalWorkflowError(
        "CONFLICT",
        "El borrador cambió; vuelve a cargarlo antes de guardar.",
      );
    }
    await tx.clinicalAuditEvent.create({
      data: {
        clinicId: actor.clinicId,
        patientId: existing.patientId,
        actorUserId: actor.userId,
        resourceType: "CLINICAL_ENCOUNTER",
        resourceId: existing.id,
        action: "CLINICAL_ENCOUNTER_DRAFT_UPDATED",
      },
    });
    return tx.clinicalEncounter.findUniqueOrThrow({
      where: { id: existing.id },
    });
  });
}

export async function signClinicalEncounter(
  db: Db,
  actor: ClinicalActor,
  encounterId: string,
) {
  const existing = await db.clinicalEncounter.findFirst({
    where: {
      id: encounterId,
      clinicId: actor.clinicId,
      doctorId: actor.doctorId,
      authoredByUserId: actor.userId,
      status: "DRAFT",
    },
    select: {
      id: true,
      patientId: true,
      chiefComplaint: true,
      subjective: true,
      objective: true,
      assessment: true,
      plan: true,
    },
  });
  if (!existing) {
    throw new ClinicalWorkflowError(
      "INVALID_STATE",
      "El borrador no existe, no te pertenece o ya fue firmado.",
    );
  }
  if (
    ![
      existing.chiefComplaint,
      existing.subjective,
      existing.objective,
      existing.assessment,
      existing.plan,
    ].some((value) => value?.trim())
  ) {
    throw new ClinicalWorkflowError(
      "INVALID_STATE",
      "Agrega al menos una nota clínica antes de firmar.",
    );
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.clinicalEncounter.updateMany({
      where: {
        id: existing.id,
        clinicId: actor.clinicId,
        authoredByUserId: actor.userId,
        status: "DRAFT",
      },
      data: { status: "SIGNED", signedAt: new Date() },
    });
    if (updated.count !== 1) {
      throw new ClinicalWorkflowError(
        "CONFLICT",
        "La consulta cambió antes de firmarse. Actualiza e inténtalo de nuevo.",
      );
    }
    await tx.clinicalAuditEvent.create({
      data: {
        clinicId: actor.clinicId,
        patientId: existing.patientId,
        actorUserId: actor.userId,
        resourceType: "CLINICAL_ENCOUNTER",
        resourceId: existing.id,
        action: "CLINICAL_ENCOUNTER_SIGNED",
      },
    });
    return tx.clinicalEncounter.findUniqueOrThrow({
      where: { id: existing.id },
    });
  });
}

export async function amendSignedEncounter(
  db: Db,
  actor: ClinicalActor,
  input: AmendEncounterInput,
) {
  const encounter = await db.clinicalEncounter.findFirst({
    where: {
      id: input.encounterId,
      clinicId: actor.clinicId,
      doctorId: actor.doctorId,
      authoredByUserId: actor.userId,
      status: "SIGNED",
    },
    select: { id: true, patientId: true },
  });
  if (!encounter) {
    throw new ClinicalWorkflowError(
      "INVALID_STATE",
      "Sólo puedes enmendar consultas firmadas por ti.",
    );
  }

  return db.$transaction(async (tx) => {
    const amendment = await tx.clinicalEncounterAmendment.create({
      data: {
        clinicId: actor.clinicId,
        encounterId: encounter.id,
        authoredByUserId: actor.userId,
        reason: input.reason,
        changes: JSON.parse(
          JSON.stringify(input.changes),
        ) as Prisma.InputJsonValue,
      },
    });
    await tx.clinicalAuditEvent.create({
      data: {
        clinicId: actor.clinicId,
        patientId: encounter.patientId,
        actorUserId: actor.userId,
        resourceType: "CLINICAL_ENCOUNTER",
        resourceId: encounter.id,
        action: "CLINICAL_ENCOUNTER_AMENDED",
        metadata: { amendmentId: amendment.id },
      },
    });
    return amendment;
  });
}

export async function issueClinicalPrescription(
  db: Db,
  actor: ClinicalActor,
  input: IssuePrescriptionInput,
) {
  const encounter = await db.clinicalEncounter.findFirst({
    where: {
      id: input.encounterId,
      clinicId: actor.clinicId,
      doctorId: actor.doctorId,
      authoredByUserId: actor.userId,
      status: "SIGNED",
    },
    select: { id: true, patientId: true },
  });
  if (!encounter) {
    throw new ClinicalWorkflowError(
      "INVALID_STATE",
      "Sólo puedes emitir recetas para consultas que hayas firmado.",
    );
  }

  return db.$transaction(async (tx) => {
    const prescription = await tx.clinicalPrescription.create({
      data: {
        clinicId: actor.clinicId,
        patientId: encounter.patientId,
        doctorId: actor.doctorId,
        encounterId: encounter.id,
        issuedByUserId: actor.userId,
        instructions: input.instructions || null,
        medications: { create: input.medications },
      },
      include: { medications: true },
    });
    await tx.clinicalAuditEvent.create({
      data: {
        clinicId: actor.clinicId,
        patientId: encounter.patientId,
        actorUserId: actor.userId,
        resourceType: "CLINICAL_PRESCRIPTION",
        resourceId: prescription.id,
        action: "CLINICAL_PRESCRIPTION_ISSUED",
      },
    });
    return prescription;
  });
}

export async function voidClinicalPrescription(
  db: Db,
  actor: ClinicalActor,
  prescriptionId: string,
  reason: string,
) {
  const prescription = await db.clinicalPrescription.findFirst({
    where: {
      id: prescriptionId,
      clinicId: actor.clinicId,
      doctorId: actor.doctorId,
      issuedByUserId: actor.userId,
      voidedAt: null,
    },
    select: { id: true, patientId: true },
  });
  if (!prescription) {
    throw new ClinicalWorkflowError(
      "INVALID_STATE",
      "La receta no existe, ya fue anulada o no te pertenece.",
    );
  }
  return db.$transaction(async (tx) => {
    const updated = await tx.clinicalPrescription.updateMany({
      where: {
        id: prescription.id,
        clinicId: actor.clinicId,
        issuedByUserId: actor.userId,
        voidedAt: null,
      },
      data: {
        voidedAt: new Date(),
        voidReason: reason,
        voidedByUserId: actor.userId,
      },
    });
    if (updated.count !== 1) {
      throw new ClinicalWorkflowError(
        "CONFLICT",
        "La receta cambió. Actualiza el expediente.",
      );
    }
    await tx.clinicalAuditEvent.create({
      data: {
        clinicId: actor.clinicId,
        patientId: prescription.patientId,
        actorUserId: actor.userId,
        resourceType: "CLINICAL_PRESCRIPTION",
        resourceId: prescription.id,
        action: "CLINICAL_PRESCRIPTION_VOIDED",
      },
    });
    return tx.clinicalPrescription.findUniqueOrThrow({
      where: { id: prescription.id },
    });
  });
}

export async function createFollowUpTask(
  db: Db,
  actor: ClinicalActor,
  input: CreateFollowUpInput,
) {
  await assertPatientInScope(db, actor, input.patientId);
  if (input.episodeId) {
    const episode = await db.careEpisode.findFirst({
      where: { id: input.episodeId, ...careEpisodeScope(actor) },
      select: { id: true, patientId: true },
    });
    if (!episode || episode.patientId !== input.patientId) {
      throw new ClinicalWorkflowError(
        "INVALID_RELATIONSHIP",
        "El episodio no pertenece a este paciente o consultorio.",
      );
    }
  }
  if (input.encounterId) {
    const encounter = await db.clinicalEncounter.findFirst({
      where: {
        id: input.encounterId,
        clinicId: actor.clinicId,
        doctorId: actor.doctorId,
        patientId: input.patientId,
        ...(input.episodeId ? { episodeId: input.episodeId } : {}),
      },
      select: { id: true },
    });
    if (!encounter) {
      throw new ClinicalWorkflowError(
        "INVALID_RELATIONSHIP",
        "La consulta no corresponde a este paciente y consultorio.",
      );
    }
  }
  if (input.assignedToUserId) {
    const assignee = await db.clinicMember.findFirst({
      where: {
        clinicId: actor.clinicId,
        userId: input.assignedToUserId,
        role: "DOCTOR",
        user: { role: "DOCTOR" },
      },
      select: { userId: true },
    });
    if (!assignee) {
      throw new ClinicalWorkflowError(
        "INVALID_RELATIONSHIP",
        "El responsable debe ser un doctor activo de este consultorio.",
      );
    }
  }

  return db.$transaction(async (tx) => {
    const task = await tx.followUpTask.create({
      data: {
        clinicId: actor.clinicId,
        patientId: input.patientId,
        episodeId: input.episodeId,
        encounterId: input.encounterId,
        assignedToUserId: input.assignedToUserId ?? actor.userId,
        createdByUserId: actor.userId,
        title: input.title,
        details: input.details,
        type: input.type,
        priority: input.priority,
        dueAt: input.dueAt,
      },
      include: {
        patient: { select: { phone: true, user: { select: { name: true } } } },
      },
    });
    await scheduleFollowUpReminder(tx, task);
    await tx.clinicalAuditEvent.create({
      data: {
        clinicId: actor.clinicId,
        patientId: input.patientId,
        actorUserId: actor.userId,
        resourceType: "FOLLOW_UP_TASK",
        resourceId: task.id,
        action: "FOLLOW_UP_TASK_CREATED",
        metadata: { status: task.status, priority: task.priority },
      },
    });
    if (task.assignedToUserId && task.assignedToUserId !== actor.userId) {
      await tx.notification.create({
        data: {
          recipientUserId: task.assignedToUserId,
          doctorId: actor.doctorId,
          patientId: task.patientId,
          clinicId: task.clinicId,
          followUpTaskId: task.id,
          type: "FOLLOW_UP_TASK_ASSIGNED",
          title: "Te asignaron un seguimiento",
          message: task.dueAt
            ? `Tienes una tarea de seguimiento pendiente para el ${task.dueAt.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}.`
            : "Tienes una nueva tarea de seguimiento pendiente.",
        },
      });
    }
    return task;
  });
}

export async function recordOutcomeAssessment(
  db: Db,
  actor: ClinicalActor,
  input: RecordOutcomeInput,
) {
  const episode = await db.careEpisode.findFirst({
    where: { id: input.episodeId, ...careEpisodeScope(actor) },
    select: { id: true, patientId: true },
  });
  if (!episode) {
    throw new ClinicalWorkflowError(
      "NOT_FOUND",
      "No se encontró el episodio de atención.",
    );
  }
  if (input.encounterId) {
    const encounter = await db.clinicalEncounter.findFirst({
      where: {
        id: input.encounterId,
        clinicId: actor.clinicId,
        doctorId: actor.doctorId,
        patientId: episode.patientId,
        episodeId: episode.id,
      },
      select: { id: true },
    });
    if (!encounter) {
      throw new ClinicalWorkflowError(
        "INVALID_RELATIONSHIP",
        "La consulta no pertenece a este episodio.",
      );
    }
  }

  return db.$transaction(async (tx) => {
    const result = await tx.outcomeAssessment.create({
      data: {
        clinicId: actor.clinicId,
        patientId: episode.patientId,
        episodeId: episode.id,
        encounterId: input.encounterId,
        recordedByUserId: actor.userId,
        instrumentCode: input.instrumentCode,
        instrumentVersion: input.instrumentVersion,
        score:
          input.score === undefined
            ? undefined
            : new Prisma.Decimal(input.score),
        scoreMin:
          input.scoreMin === undefined
            ? undefined
            : new Prisma.Decimal(input.scoreMin),
        scoreMax:
          input.scoreMax === undefined
            ? undefined
            : new Prisma.Decimal(input.scoreMax),
        responses: JSON.parse(
          JSON.stringify(input.responses),
        ) as Prisma.InputJsonValue,
        completedItemCount: input.completedItemCount,
        totalItemCount: input.totalItemCount,
        measuredAt: input.measuredAt,
      },
    });
    await tx.clinicalAuditEvent.create({
      data: {
        clinicId: actor.clinicId,
        patientId: episode.patientId,
        actorUserId: actor.userId,
        resourceType: "OUTCOME_ASSESSMENT",
        resourceId: result.id,
        action: "OUTCOME_ASSESSMENT_RECORDED",
        metadata: {
          instrumentCode: result.instrumentCode,
          instrumentVersion: result.instrumentVersion,
        },
      },
    });
    return result;
  });
}

export async function getOutcomeTrend(
  db: Db,
  actor: ClinicalActor,
  input: {
    episodeId: string;
    instrumentCode: string;
    instrumentVersion: string;
  },
) {
  const episode = await db.careEpisode.findFirst({
    where: { id: input.episodeId, ...careEpisodeScope(actor) },
    select: { id: true, patientId: true },
  });
  if (!episode) {
    throw new ClinicalWorkflowError(
      "NOT_FOUND",
      "No se encontró el episodio de atención.",
    );
  }
  await recordClinicalRead(db, actor, {
    resourceType: "OUTCOME_TREND",
    resourceId: episode.id,
    patientId: episode.patientId,
  });
  const assessments = await db.outcomeAssessment.findMany({
    where: {
      clinicId: actor.clinicId,
      episodeId: episode.id,
      instrumentCode: input.instrumentCode,
      instrumentVersion: input.instrumentVersion,
    },
    select: {
      id: true,
      score: true,
      scoreMin: true,
      scoreMax: true,
      completedItemCount: true,
      totalItemCount: true,
      measuredAt: true,
      encounterId: true,
    },
    orderBy: [{ measuredAt: "asc" }, { createdAt: "asc" }],
  });
  const firstScore = assessments[0]?.score?.toNumber();
  const latestScore = assessments.at(-1)?.score?.toNumber();

  return {
    instrumentCode: input.instrumentCode,
    instrumentVersion: input.instrumentVersion,
    points: assessments.map((assessment) => ({
      id: assessment.id,
      score: assessment.score?.toNumber() ?? null,
      scoreMin: assessment.scoreMin?.toNumber() ?? null,
      scoreMax: assessment.scoreMax?.toNumber() ?? null,
      completedItemCount: assessment.completedItemCount,
      totalItemCount: assessment.totalItemCount,
      measuredAt: assessment.measuredAt,
      encounterId: assessment.encounterId,
    })),
    baselineScore: firstScore ?? null,
    latestScore: latestScore ?? null,
    changeFromBaseline:
      firstScore === undefined || latestScore === undefined
        ? null
        : Number((latestScore - firstScore).toFixed(3)),
    interpretation: null as string | null,
  };
}
