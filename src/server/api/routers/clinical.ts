import { FollowUpTaskStatus } from "@prisma/client";
import type { PrismaClient, Role } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  careEpisodeScope,
  clinicalFileScope,
  patientClinicalScope,
  resolveClinicalActor,
} from "~/server/domain/clinical/access";
import { recordClinicalRead } from "~/server/domain/clinical/audit";
import {
  cancelPendingFollowUpReminder,
  scheduleFollowUpReminder,
} from "~/server/domain/messaging/follow-up-reminders";
import {
  amendSignedEncounter,
  ClinicalWorkflowError,
  createEncounterDraft,
  createFollowUpTask,
  getOutcomeTrend,
  openCareEpisode,
  recordOutcomeAssessment,
  recordClinicalObservation,
  voidClinicalObservation,
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
  recordClinicalObservationInput,
  voidClinicalObservationInput,
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

type MinuteWindow = { start: number; end: number };

function clockMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

function mergeWindows(windows: MinuteWindow[]): MinuteWindow[] {
  const merged: MinuteWindow[] = [];
  for (const window of windows.sort((a, b) => a.start - b.start)) {
    const previous = merged.at(-1);
    if (previous && window.start <= previous.end) {
      previous.end = Math.max(previous.end, window.end);
    } else {
      merged.push({ ...window });
    }
  }
  return merged;
}

function localDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function getUpcomingCapacity(
  db: PrismaClient,
  actor: NonNullable<Awaited<ReturnType<typeof resolveClinicalActor>>>,
  requestedTimeZone: string,
) {
  let timeZone = requestedTimeZone;
  try {
    new Intl.DateTimeFormat("en", { timeZone });
  } catch {
    timeZone = "America/Mexico_City";
  }
  const now = new Date();
  const startKey = localDateKey(now, timeZone);
  const [year, month, day] = startKey.split("-").map(Number);
  const startDay = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  const dayKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDay);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const endDay = new Date(startDay);
  endDay.setUTCDate(endDay.getUTCDate() + 7);
  const [schedules, appointments] = await Promise.all([
    db.schedule.findMany({
      where: {
        doctorId: actor.doctorId,
        isActive: true,
        OR: [{ clinicId: actor.clinicId }, { clinicId: null }],
      },
      select: { dayOfWeek: true, startTime: true, endTime: true },
    }),
    db.appointment.findMany({
      where: {
        clinicId: actor.clinicId,
        doctorId: actor.doctorId,
        status: { in: ["PENDING", "CONFIRMED"] },
        date: { gte: startDay, lt: endDay },
      },
      select: { date: true, time: true, duration: true },
    }),
  ]);
  const scheduleByDay = new Map<number, MinuteWindow[]>();
  for (const schedule of schedules) {
    const start = clockMinutes(schedule.startTime);
    const end = clockMinutes(schedule.endTime);
    if (start === null || end === null || end <= start) continue;
    const dayWindows = scheduleByDay.get(schedule.dayOfWeek) ?? [];
    dayWindows.push({ start, end });
    scheduleByDay.set(schedule.dayOfWeek, dayWindows);
  }
  const appointmentsByDate = new Map<string, MinuteWindow[]>();
  const currentLocalTime = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const currentMinutes = clockMinutes(currentLocalTime) ?? 0;
  for (const appointment of appointments) {
    const dateKey = appointment.date.toISOString().slice(0, 10);
    let start = clockMinutes(appointment.time);
    if (start === null) continue;
    const end = start + appointment.duration;
    if (dateKey === startKey) {
      if (end <= currentMinutes) continue;
      start = Math.max(start, currentMinutes);
    }
    const dayWindows = appointmentsByDate.get(dateKey) ?? [];
    dayWindows.push({ start, end });
    appointmentsByDate.set(dateKey, dayWindows);
  }

  let availableMinutes = 0;
  let bookedMinutes = 0;
  for (const dateKey of dayKeys) {
    const [dateYear, dateMonth, dateDay] = dateKey.split("-").map(Number);
    const weekday = new Date(
      Date.UTC(dateYear ?? 1970, (dateMonth ?? 1) - 1, dateDay ?? 1),
    ).getUTCDay();
    const windows = mergeWindows(scheduleByDay.get(weekday) ?? []);
    const busy = appointmentsByDate.get(dateKey) ?? [];
    availableMinutes += windows.reduce(
      (sum, window) => sum + window.end - window.start,
      0,
    );
    for (const window of windows) {
      const overlaps = busy
        .map((appointment) => ({
          start: Math.max(window.start, appointment.start),
          end: Math.min(window.end, appointment.end),
        }))
        .filter((interval) => interval.end > interval.start);
      bookedMinutes += mergeWindows(overlaps).reduce(
        (sum, interval) => sum + interval.end - interval.start,
        0,
      );
    }
  }

  return {
    from: startDay,
    through: new Date(endDay.getTime() - 1),
    availableMinutes,
    bookedMinutes,
    freeMinutes: Math.max(0, availableMinutes - bookedMinutes),
    occupancyRate:
      availableMinutes === 0
        ? null
        : Number((bookedMinutes / availableMinutes).toFixed(3)),
  };
}

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
  console.error("Clinical workflow failed");
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
        orderBy: [
          { dueAt: { sort: "asc", nulls: "last" } },
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        take: input.limit,
      });
      const reminderMessages = tasks.length
        ? await ctx.db.messageOutbox.findMany({
            where: {
              clinicId: actor.clinicId,
              correlationId: { in: tasks.map((task) => task.id) },
              idempotencyKey: { startsWith: "follow-up-reminder:" },
            },
            select: {
              correlationId: true,
              channel: true,
              status: true,
              nextAttemptAt: true,
              sentAt: true,
              deliveredAt: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: tasks.length * 2,
          })
        : [];
      const remindersByTask = new Map<
        string,
        Map<string, (typeof reminderMessages)[number]>
      >();
      for (const message of reminderMessages) {
        if (!message.correlationId) continue;
        const byChannel =
          remindersByTask.get(message.correlationId) ?? new Map();
        if (!byChannel.has(message.channel)) {
          byChannel.set(message.channel, message);
          remindersByTask.set(message.correlationId, byChannel);
        }
      }
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
          reminderStatuses: [
            ...(remindersByTask.get(task.id)?.values() ?? []),
          ].map(({ channel, status, nextAttemptAt, sentAt, deliveredAt }) => ({
            channel,
            status,
            nextAttemptAt,
            sentAt,
            deliveredAt,
          })),
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
          select: { id: true, patientId: true, status: true, dueAt: true },
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
          const updatedTask = await tx.followUpTask.findUniqueOrThrow({
            where: { id: task.id },
            include: {
              patient: {
                select: { phone: true, user: { select: { name: true } } },
              },
            },
          });
          if (input.status === "COMPLETED" || input.status === "CANCELLED") {
            await cancelPendingFollowUpReminder(tx, task.id);
            await tx.notification.updateMany({
              where: {
                followUpTaskId: task.id,
                recipientUserId: actor.userId,
                isRead: false,
              },
              data: { isRead: true },
            });
          } else {
            await scheduleFollowUpReminder(tx, updatedTask);
          }
          return updatedTask;
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
        observations,
        clinicalFiles,
        medicalHistory,
        appointmentIntakes,
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
        ctx.db.clinicalObservation.findMany({
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
            recordedByUserId: true,
            recordedBy: { select: { name: true } },
          },
          orderBy: [{ measuredAt: "desc" }, { id: "desc" }],
          take: input.limit,
        }),
        ctx.db.clinicalFile.findMany({
          where: { patientId: patient.id, ...clinicalFileScope(actor) },
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
        ctx.db.appointment.findMany({
          where: {
            clinicId: actor.clinicId,
            doctorId: actor.doctorId,
            patientId: patient.id,
            intakeSymptoms: { not: null },
          },
          select: {
            id: true,
            date: true,
            time: true,
            status: true,
            intakeSymptoms: true,
            intakeAllergies: true,
            intakeMedications: true,
            intakeContext: true,
          },
          orderBy: [{ date: "desc" }, { time: "desc" }],
          take: input.limit,
        }),
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
          appointmentIntakes,
          outcomeAssessments: assessments.map((assessment) => ({
            ...assessment,
            score: assessment.score?.toNumber() ?? null,
            scoreMin: assessment.scoreMin?.toNumber() ?? null,
            scoreMax: assessment.scoreMax?.toNumber() ?? null,
          })),
          clinicalObservations: observations.map((observation) => ({
            ...observation,
            value: observation.value.toNumber(),
            canVoid:
              observation.recordedByUserId === actor.userId &&
              observation.voidedAt === null,
          })),
        },
        "Línea de tiempo clínica obtenida",
      );
    }),

  recordClinicalObservation: protectedProcedure
    .input(recordClinicalObservationInput)
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
        const observation = await recordClinicalObservation(
          ctx.db,
          actor,
          input,
        );
        return trpcSuccess(observation, "Medición clínica registrada", 201);
      } catch (error) {
        return workflowFailure(error);
      }
    }),

  voidClinicalObservation: protectedProcedure
    .input(voidClinicalObservationInput)
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
        const observation = await voidClinicalObservation(ctx.db, actor, input);
        return trpcSuccess(
          observation,
          "Medición anulada con motivo registrado",
        );
      } catch (error) {
        return workflowFailure(error);
      }
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
      const clinicTimezone =
        (await ctx.getWorkspace())?.clinic.timezone ?? "America/Mexico_City";
      const [
        appointmentsByStatus,
        appointmentEvents,
        attendanceEvents,
        followUpTasks,
        followUpEvents,
        signedEncounters,
        assessments,
        upcomingCapacity,
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
        ctx.db.appointmentLifecycleEvent.findMany({
          where: {
            clinicId: actor.clinicId,
            doctorId: actor.doctorId,
            eventType: { in: ["CHECKED_IN", "CONSULTATION_STARTED"] },
            appointmentId: { not: null },
            scheduledAt: { gte: input.from, lt: input.to },
          },
          select: { appointmentId: true, eventType: true, occurredAt: true },
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
        getUpcomingCapacity(ctx.db, actor, clinicTimezone),
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
      const attendanceByAppointment = new Map<
        string,
        { checkIn?: Date; started?: Date }
      >();
      for (const event of attendanceEvents) {
        if (!event.appointmentId) continue;
        const current = attendanceByAppointment.get(event.appointmentId) ?? {};
        if (event.eventType === "CHECKED_IN" && !current.checkIn) {
          current.checkIn = event.occurredAt;
        }
        if (event.eventType === "CONSULTATION_STARTED" && !current.started) {
          current.started = event.occurredAt;
        }
        attendanceByAppointment.set(event.appointmentId, current);
      }
      const waitingSamples = [...attendanceByAppointment.values()]
        .filter(
          (pair): pair is { checkIn: Date; started: Date } =>
            !!pair.checkIn && !!pair.started && pair.started >= pair.checkIn,
        )
        .map(
          (pair) => (pair.started.getTime() - pair.checkIn.getTime()) / 60_000,
        )
        .sort((a, b) => a - b);
      const medianIndex = Math.floor(waitingSamples.length / 2);
      const medianWaitMinutes =
        waitingSamples.length === 0
          ? null
          : waitingSamples.length % 2 === 0
            ? Number(
                (
                  ((waitingSamples[medianIndex - 1] ?? 0) +
                    (waitingSamples[medianIndex] ?? 0)) /
                  2
                ).toFixed(1),
              )
            : Number((waitingSamples[medianIndex] ?? 0).toFixed(1));
      const averageWaitMinutes =
        waitingSamples.length === 0
          ? null
          : Number(
              (
                waitingSamples.reduce((total, value) => total + value, 0) /
                waitingSamples.length
              ).toFixed(1),
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
            clinicTimezone,
          },
          upcomingCapacity,
          waitingTime: {
            pairedAppointments: waitingSamples.length,
            medianMinutes: medianWaitMinutes,
            averageMinutes: averageWaitMinutes,
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
            "La espera se calcula sólo si una cita tiene llegada e inicio registrados, usando la diferencia entre ambas marcas. No representa el tiempo entre reserva y cita.",
            "Las puntuaciones de instrumentos diferentes no se combinan ni se interpretan como mejoría automáticamente.",
          ],
        },
        "Resumen operativo obtenido",
      );
    }),
});
