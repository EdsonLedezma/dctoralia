import { FollowUpTaskStatus } from "@prisma/client";
import type { PrismaClient, Role } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  careEpisodeScope,
  patientClinicalScope,
  resolveClinicalActor,
} from "~/server/domain/clinical/access";
import { recordClinicalRead } from "~/server/domain/clinical/audit";
import {
  amendSignedEncounter,
  ClinicalWorkflowError,
  createEncounterDraft,
  createFollowUpTask,
  getOutcomeTrend,
  openCareEpisode,
  recordOutcomeAssessment,
  signClinicalEncounter,
  updateEncounterDraft,
} from "~/server/domain/clinical/workflows";
import {
  amendEncounterInput,
  createCareEpisodeInput,
  createEncounterDraftInput,
  createFollowUpTaskInput,
  listFollowUpTasksInput,
  operationalAnalyticsInput,
  outcomeTrendInput,
  recordOutcomeAssessmentInput,
  signEncounterInput,
  updateEncounterDraftInput,
  updateFollowUpTaskStatusInput,
} from "~/server/domain/clinical/schemas";
import type { WorkspaceContext } from "~/server/domain/workspaces/workspace-context";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

type ClinicalContext = {
  db: PrismaClient;
  session: { user: { id: string; role: Role } };
  getWorkspace: () => Promise<WorkspaceContext | null>;
};

async function getActor(ctx: ClinicalContext) {
  const actor = await resolveClinicalActor({
    db: ctx.db,
    userId: ctx.session.user.id,
    role: ctx.session.user.role,
    workspace: await ctx.getWorkspace(),
  });
  return actor;
}

function workflowFailure(error: unknown) {
  if (error instanceof ClinicalWorkflowError) {
    const status =
      error.code === "FORBIDDEN"
        ? 403
        : error.code === "NOT_FOUND"
          ? 404
          : error.code === "CONFLICT" || error.code === "INVALID_STATE"
            ? 409
            : 400;
    return trpcFailure(error.code, error.message, status);
  }
  console.error("Clinical workflow failed", error);
  return trpcFailure(
    "INTERNAL_ERROR",
    "No se pudo completar la operación clínica. Inténtalo de nuevo.",
    500,
  );
}

export const clinicalRouter = createTRPCRouter({
  openEpisode: protectedProcedure
    .input(createCareEpisodeInput)
    .mutation(async ({ input, ctx }) => {
      const actor = await getActor(ctx);
      if (!actor) {
        return trpcFailure(
          "CLINICAL_ACCESS_REQUIRED",
          "Se requiere un perfil de doctor y acceso clínico al consultorio.",
          403,
        );
      }
      try {
        const episode = await openCareEpisode(ctx.db, actor, input);
        return trpcSuccess(episode, "Episodio de atención abierto", 201);
      } catch (error) {
        return workflowFailure(error);
      }
    }),

  createEncounterDraft: protectedProcedure
    .input(createEncounterDraftInput)
    .mutation(async ({ input, ctx }) => {
      const actor = await getActor(ctx);
      if (!actor) {
        return trpcFailure(
          "CLINICAL_ACCESS_REQUIRED",
          "Acceso clínico requerido",
          403,
        );
      }
      try {
        const encounter = await createEncounterDraft(ctx.db, actor, input);
        return trpcSuccess(encounter, "Borrador de consulta creado", 201);
      } catch (error) {
        return workflowFailure(error);
      }
    }),

  updateEncounterDraft: protectedProcedure
    .input(updateEncounterDraftInput)
    .mutation(async ({ input, ctx }) => {
      const actor = await getActor(ctx);
      if (!actor) {
        return trpcFailure(
          "CLINICAL_ACCESS_REQUIRED",
          "Acceso clínico requerido",
          403,
        );
      }
      try {
        const encounter = await updateEncounterDraft(ctx.db, actor, input);
        return trpcSuccess(encounter, "Borrador actualizado");
      } catch (error) {
        return workflowFailure(error);
      }
    }),

  signEncounter: protectedProcedure
    .input(signEncounterInput)
    .mutation(async ({ input, ctx }) => {
      const actor = await getActor(ctx);
      if (!actor) {
        return trpcFailure(
          "CLINICAL_ACCESS_REQUIRED",
          "Acceso clínico requerido",
          403,
        );
      }
      try {
        const encounter = await signClinicalEncounter(
          ctx.db,
          actor,
          input.encounterId,
        );
        return trpcSuccess(encounter, "Consulta firmada");
      } catch (error) {
        return workflowFailure(error);
      }
    }),

  amendEncounter: protectedProcedure
    .input(amendEncounterInput)
    .mutation(async ({ input, ctx }) => {
      const actor = await getActor(ctx);
      if (!actor) {
        return trpcFailure(
          "CLINICAL_ACCESS_REQUIRED",
          "Acceso clínico requerido",
          403,
        );
      }
      try {
        const amendment = await amendSignedEncounter(ctx.db, actor, input);
        return trpcSuccess(amendment, "Enmienda clínica registrada", 201);
      } catch (error) {
        return workflowFailure(error);
      }
    }),

  createFollowUpTask: protectedProcedure
    .input(createFollowUpTaskInput)
    .mutation(async ({ input, ctx }) => {
      const actor = await getActor(ctx);
      if (!actor) {
        return trpcFailure(
          "CLINICAL_ACCESS_REQUIRED",
          "Acceso clínico requerido",
          403,
        );
      }
      try {
        const task = await createFollowUpTask(ctx.db, actor, input);
        return trpcSuccess(task, "Seguimiento creado", 201);
      } catch (error) {
        return workflowFailure(error);
      }
    }),

  listFollowUpTasks: protectedProcedure
    .input(listFollowUpTasksInput)
    .query(async ({ input, ctx }) => {
      const actor = await getActor(ctx);
      if (!actor) {
        return trpcFailure(
          "CLINICAL_ACCESS_REQUIRED",
          "Acceso clínico requerido",
          403,
        );
      }
      const tasks = await ctx.db.followUpTask.findMany({
        where: {
          clinicId: actor.clinicId,
          OR: [
            { assignedToUserId: actor.userId },
            { createdByUserId: actor.userId },
          ],
          ...(input.status
            ? { status: input.status }
            : input.includeClosed
              ? {}
              : { status: { in: ["OPEN", "IN_PROGRESS"] as const } }),
          ...(input.dueAfter || input.dueBefore
            ? {
                dueAt: {
                  gte: input.dueAfter,
                  lte: input.dueBefore,
                },
              }
            : {}),
        },
        select: {
          id: true,
          patientId: true,
          episodeId: true,
          encounterId: true,
          assignedToUserId: true,
          createdByUserId: true,
          title: true,
          details: true,
          type: true,
          priority: true,
          status: true,
          dueAt: true,
          completedAt: true,
          createdAt: true,
          patient: { select: { user: { select: { name: true } } } },
        },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        take: input.limit,
      });
      await recordClinicalRead(ctx.db, actor, {
        resourceType: "FOLLOW_UP_TASK_LIST",
        resourceId: actor.clinicId,
        action: "FOLLOW_UP_TASK_LIST_READ",
      });
      return trpcSuccess(
        tasks.map(({ createdByUserId, ...task }) => ({
          ...task,
          canUpdate:
            task.assignedToUserId === actor.userId ||
            (!task.assignedToUserId && createdByUserId === actor.userId),
        })),
        "Seguimientos obtenidos",
      );
    }),

  updateFollowUpStatus: protectedProcedure
    .input(updateFollowUpTaskStatusInput)
    .mutation(async ({ input, ctx }) => {
      const actor = await getActor(ctx);
      if (!actor) {
        return trpcFailure(
          "CLINICAL_ACCESS_REQUIRED",
          "Acceso clínico requerido",
          403,
        );
      }
      try {
        const task = await ctx.db.followUpTask.findFirst({
          where: {
            id: input.taskId,
            clinicId: actor.clinicId,
            OR: [
              { assignedToUserId: actor.userId },
              { assignedToUserId: null, createdByUserId: actor.userId },
            ],
          },
          select: { id: true, patientId: true, status: true },
        });
        if (!task) {
          return trpcFailure(
            "FOLLOW_UP_NOT_FOUND",
            "Seguimiento no encontrado",
            404,
          );
        }
        if (task.status === input.status) {
          return trpcSuccess(task, "El seguimiento ya tenía ese estado");
        }

        const completed = input.status === "COMPLETED";
        const updated = await ctx.db.$transaction(async (tx) => {
          const result = await tx.followUpTask.updateMany({
            where: {
              id: task.id,
              clinicId: actor.clinicId,
              status: task.status,
              OR: [
                { assignedToUserId: actor.userId },
                { assignedToUserId: null, createdByUserId: actor.userId },
              ],
            },
            data: {
              status: input.status,
              completedAt: completed ? new Date() : null,
              completedByUserId: completed ? actor.userId : null,
            },
          });
          if (result.count !== 1) {
            throw new ClinicalWorkflowError(
              "CONFLICT",
              "El seguimiento cambió. Actualiza la lista e inténtalo de nuevo.",
            );
          }
          await tx.clinicalAuditEvent.create({
            data: {
              clinicId: actor.clinicId,
              patientId: task.patientId,
              actorUserId: actor.userId,
              resourceType: "FOLLOW_UP_TASK",
              resourceId: task.id,
              action: "FOLLOW_UP_TASK_STATUS_CHANGED",
              metadata: { from: task.status, to: input.status },
            },
          });
          return tx.followUpTask.findUniqueOrThrow({ where: { id: task.id } });
        });
        return trpcSuccess(updated, "Estado del seguimiento actualizado");
      } catch (error) {
        return workflowFailure(error);
      }
    }),

  patientTimeline: protectedProcedure
    .input(
      z.object({
        patientId: z.string().cuid(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      const actor = await getActor(ctx);
      if (!actor) {
        return trpcFailure(
          "CLINICAL_ACCESS_REQUIRED",
          "Acceso clínico requerido",
          403,
        );
      }
      const patient = await ctx.db.patient.findFirst({
        where: { id: input.patientId, ...patientClinicalScope(actor) },
        select: {
          id: true,
          clinicId: true,
          birthDate: true,
          gender: true,
          user: { select: { name: true } },
        },
      });
      if (!patient) {
        return trpcFailure("PATIENT_NOT_FOUND", "Paciente no encontrado", 404);
      }

      const historyConsent = await ctx.db.medicalHistoryConsent.findUnique({
        where: {
          patientId_clinicId: {
            patientId: patient.id,
            clinicId: actor.clinicId,
          },
        },
        select: { status: true },
      });
      const hasMedicalHistoryAccess = historyConsent?.status === "GRANTED";

      const [
        episodes,
        encounters,
        tasks,
        assessments,
        clinicalFiles,
        medicalHistory,
      ] = await Promise.all([
        ctx.db.careEpisode.findMany({
          where: { ...careEpisodeScope(actor), patientId: patient.id },
          select: {
            id: true,
            title: true,
            status: true,
            openedAt: true,
            closedAt: true,
          },
          orderBy: { openedAt: "desc" },
        }),
        ctx.db.clinicalEncounter.findMany({
          where: {
            clinicId: actor.clinicId,
            doctorId: actor.doctorId,
            patientId: patient.id,
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
            amendments: {
              select: {
                id: true,
                reason: true,
                changes: true,
                createdAt: true,
                authoredBy: { select: { name: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { encounterAt: "desc" },
          take: input.limit,
        }),
        ctx.db.followUpTask.findMany({
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
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        }),
        ctx.db.outcomeAssessment.findMany({
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
            completedItemCount: true,
            totalItemCount: true,
            measuredAt: true,
          },
          orderBy: { measuredAt: "desc" },
          take: input.limit,
        }),
        ctx.db.clinicalFile.findMany({
          where: { clinicId: actor.clinicId, patientId: patient.id },
          select: {
            id: true,
            originalFilename: true,
            mediaType: true,
            sizeBytes: true,
            category: true,
            createdAt: true,
            uploadedBy: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        }),
        hasMedicalHistoryAccess
          ? ctx.db.medicalHistory.findUnique({
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

      await Promise.all([
        recordClinicalRead(ctx.db, actor, {
          resourceType: "PATIENT_TIMELINE",
          resourceId: patient.id,
          patientId: patient.id,
        }),
        recordClinicalRead(ctx.db, actor, {
          resourceType: "CLINICAL_FILE_LIST",
          resourceId: patient.id,
          patientId: patient.id,
          action: "CLINICAL_FILE_LIST_READ",
        }),
        ...(hasMedicalHistoryAccess
          ? [
              recordClinicalRead(ctx.db, actor, {
                resourceType: "MEDICAL_HISTORY",
                resourceId: patient.id,
                patientId: patient.id,
                action: "MEDICAL_HISTORY_READ",
              }),
            ]
          : []),
      ]);

      return trpcSuccess(
        {
          patient: { ...patient, medicalHistory },
          medicalHistoryAccess: hasMedicalHistoryAccess,
          storageClinicId: actor.clinicId,
          episodes,
          encounters,
          followUpTasks: tasks,
          clinicalFiles,
          outcomeAssessments: assessments.map((assessment) => ({
            ...assessment,
            score: assessment.score?.toNumber() ?? null,
            scoreMin: assessment.scoreMin?.toNumber() ?? null,
            scoreMax: assessment.scoreMax?.toNumber() ?? null,
          })),
        },
        "Línea de tiempo clínica obtenida",
      );
    }),

  recordOutcomeAssessment: protectedProcedure
    .input(recordOutcomeAssessmentInput)
    .mutation(async ({ input, ctx }) => {
      const actor = await getActor(ctx);
      if (!actor) {
        return trpcFailure(
          "CLINICAL_ACCESS_REQUIRED",
          "Acceso clínico requerido",
          403,
        );
      }
      try {
        const assessment = await recordOutcomeAssessment(ctx.db, actor, input);
        return trpcSuccess(assessment, "Medición registrada", 201);
      } catch (error) {
        return workflowFailure(error);
      }
    }),

  outcomeTrend: protectedProcedure
    .input(outcomeTrendInput)
    .query(async ({ input, ctx }) => {
      const actor = await getActor(ctx);
      if (!actor) {
        return trpcFailure(
          "CLINICAL_ACCESS_REQUIRED",
          "Acceso clínico requerido",
          403,
        );
      }
      try {
        const trend = await getOutcomeTrend(ctx.db, actor, input);
        return trpcSuccess(trend, "Tendencia de resultados obtenida");
      } catch (error) {
        return workflowFailure(error);
      }
    }),

  operationalAnalytics: protectedProcedure
    .input(operationalAnalyticsInput)
    .query(async ({ input, ctx }) => {
      const actor = await getActor(ctx);
      if (!actor) {
        return trpcFailure(
          "CLINICAL_ACCESS_REQUIRED",
          "Acceso clínico requerido",
          403,
        );
      }
      const [
        appointmentsByStatus,
        appointmentEvents,
        followUpTasks,
        followUpEvents,
        signedEncounters,
        assessments,
      ] = await Promise.all([
        ctx.db.appointment.groupBy({
          by: ["status"],
          where: {
            clinicId: actor.clinicId,
            doctorId: actor.doctorId,
            date: { gte: input.from, lt: input.to },
          },
          _count: { _all: true },
        }),
        ctx.db.appointmentLifecycleEvent.groupBy({
          by: ["eventType", "toStatus"],
          where: {
            clinicId: actor.clinicId,
            doctorId: actor.doctorId,
            occurredAt: { gte: input.from, lt: input.to },
          },
          _count: { _all: true },
        }),
        ctx.db.followUpTask.groupBy({
          by: ["status"],
          where: {
            clinicId: actor.clinicId,
            OR: [
              { assignedToUserId: actor.userId },
              { assignedToUserId: null, createdByUserId: actor.userId },
            ],
            dueAt: { gte: input.from, lt: input.to },
          },
          _count: { _all: true },
        }),
        ctx.db.clinicalAuditEvent.findMany({
          where: {
            clinicId: actor.clinicId,
            actorUserId: actor.userId,
            action: {
              in: ["FOLLOW_UP_TASK_CREATED", "FOLLOW_UP_TASK_STATUS_CHANGED"],
            },
            createdAt: { gte: input.from, lt: input.to },
          },
          select: { action: true, metadata: true },
        }),
        ctx.db.clinicalEncounter.count({
          where: {
            clinicId: actor.clinicId,
            doctorId: actor.doctorId,
            status: "SIGNED",
            signedAt: { gte: input.from, lt: input.to },
          },
        }),
        ctx.db.outcomeAssessment.count({
          where: {
            clinicId: actor.clinicId,
            recordedByUserId: actor.userId,
            measuredAt: { gte: input.from, lt: input.to },
          },
        }),
      ]);

      const appointmentCounts = Object.fromEntries(
        appointmentsByStatus.map((item) => [item.status, item._count._all]),
      );
      const followUpCounts = Object.fromEntries(
        followUpTasks.map((item) => [item.status, item._count._all]),
      );
      const totalAppointments = appointmentsByStatus.reduce(
        (sum, item) => sum + item._count._all,
        0,
      );
      const totalDueTasks = followUpTasks.reduce(
        (sum, item) => sum + item._count._all,
        0,
      );
      const completedTasks = followUpCounts[FollowUpTaskStatus.COMPLETED] ?? 0;
      const cancelledDueTasks =
        followUpCounts[FollowUpTaskStatus.CANCELLED] ?? 0;
      const eligibleDueTasks = totalDueTasks - cancelledDueTasks;
      const appointmentEventCount = (type: string, status?: string) =>
        appointmentEvents
          .filter(
            (item) =>
              item.eventType === type && (!status || item.toStatus === status),
          )
          .reduce((sum, item) => sum + item._count._all, 0);
      const followUpTaskTransitions = followUpEvents.reduce(
        (counts, event) => {
          if (event.action === "FOLLOW_UP_TASK_CREATED") {
            counts.created += 1;
          } else if (event.action === "FOLLOW_UP_TASK_STATUS_CHANGED") {
            const metadata = event.metadata;
            if (
              metadata &&
              typeof metadata === "object" &&
              "to" in metadata &&
              typeof metadata.to === "string"
            ) {
              if (metadata.to === "COMPLETED") counts.completed += 1;
              if (metadata.to === "CANCELLED") counts.cancelled += 1;
              if (metadata.to === "IN_PROGRESS") counts.started += 1;
            }
          }
          return counts;
        },
        { created: 0, started: 0, completed: 0, cancelled: 0 },
      );

      await recordClinicalRead(ctx.db, actor, {
        resourceType: "OPERATIONAL_ANALYTICS",
        resourceId: actor.clinicId,
        action: "OPERATIONAL_ANALYTICS_READ",
      });

      return trpcSuccess(
        {
          period: {
            from: input.from,
            to: input.to,
            clinicTimezone:
              (await ctx.getWorkspace())?.clinic.timezone ?? "UTC",
          },
          appointments: {
            denominator: totalAppointments,
            lifecycleEvents: {
              created: appointmentEventCount("CREATED"),
              rescheduled: appointmentEventCount("RESCHEDULED"),
              completed: appointmentEventCount("STATUS_CHANGED", "COMPLETED"),
              noShow: appointmentEventCount("STATUS_CHANGED", "NO_SHOW"),
              cancelled: appointmentEventCount("STATUS_CHANGED", "CANCELLED"),
            },
            statesAtQueryTime: {
              pending: appointmentCounts.PENDING ?? 0,
              confirmed: appointmentCounts.CONFIRMED ?? 0,
              completed: appointmentCounts.COMPLETED ?? 0,
              noShow: appointmentCounts.NO_SHOW ?? 0,
              cancelled: appointmentCounts.CANCELLED ?? 0,
            },
          },
          followUps: {
            tasksDueInPeriod: totalDueTasks,
            denominator: eligibleDueTasks,
            transitionsInPeriod: followUpTaskTransitions,
            statesAtQueryTime: {
              open: followUpCounts.OPEN ?? 0,
              inProgress: followUpCounts.IN_PROGRESS ?? 0,
              completed: completedTasks,
              cancelled: followUpCounts.CANCELLED ?? 0,
            },
            completionRate:
              eligibleDueTasks === 0
                ? null
                : Number((completedTasks / eligibleDueTasks).toFixed(3)),
          },
          signedEncounters,
          recordedOutcomeAssessments: assessments,
          caveats: [
            "Los estados actuales son una fotografía del momento de consulta. Los eventos de transición sólo existen desde que se habilite esta versión; no se reconstruye historial anterior.",
            "Las puntuaciones de instrumentos diferentes no se combinan ni se interpretan como mejoría automáticamente.",
          ],
        },
        "Resumen operativo obtenido",
      );
    }),
});
