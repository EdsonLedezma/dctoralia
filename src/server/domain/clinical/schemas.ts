import { z } from "zod";

const optionalClinicalText = z
  .string()
  .trim()
  .max(12_000)
  .nullable()
  .optional();

export const createCareEpisodeInput = z.object({
  patientId: z.string().cuid(),
  title: z.string().trim().min(2).max(160),
});

export const createEncounterDraftInput = z.object({
  patientId: z.string().cuid(),
  appointmentId: z.string().cuid().optional(),
  episodeId: z.string().cuid().optional(),
  encounterAt: z.coerce.date().optional(),
  chiefComplaint: optionalClinicalText,
  subjective: optionalClinicalText,
  objective: optionalClinicalText,
  assessment: optionalClinicalText,
  plan: optionalClinicalText,
});

export const updateEncounterDraftInput = z.object({
  encounterId: z.string().cuid(),
  chiefComplaint: optionalClinicalText,
  subjective: optionalClinicalText,
  objective: optionalClinicalText,
  assessment: optionalClinicalText,
  plan: optionalClinicalText,
});

export const signEncounterInput = z.object({
  encounterId: z.string().cuid(),
});

export const amendEncounterInput = z
  .object({
    encounterId: z.string().cuid(),
    reason: z.string().trim().min(5).max(1_000),
    changes: z
      .object({
        chiefComplaint: optionalClinicalText,
        subjective: optionalClinicalText,
        objective: optionalClinicalText,
        assessment: optionalClinicalText,
        plan: optionalClinicalText,
      })
      .strict(),
  })
  .refine(
    ({ changes }) =>
      Object.values(changes).some((value) => value !== undefined),
    { path: ["changes"], message: "Incluye al menos un campo que corregir." },
  );

export const createFollowUpTaskInput = z.object({
  patientId: z.string().cuid(),
  episodeId: z.string().cuid().optional(),
  encounterId: z.string().cuid().optional(),
  assignedToUserId: z.string().cuid().optional(),
  title: z.string().trim().min(2).max(160),
  details: z.string().trim().max(4_000).optional(),
  type: z.enum([
    "FOLLOW_UP_APPOINTMENT",
    "REVIEW_RESULT",
    "PATIENT_CHECK_IN",
    "ADMINISTRATIVE",
    "OTHER",
  ]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  dueAt: z.coerce.date().optional(),
});

export const listFollowUpTasksInput = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  includeClosed: z.boolean().default(false),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const updateFollowUpTaskStatusInput = z.object({
  taskId: z.string().cuid(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

export const recordOutcomeAssessmentInput = z
  .object({
    episodeId: z.string().cuid(),
    encounterId: z.string().cuid().optional(),
    instrumentCode: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[A-Za-z0-9._-]+$/)
      .transform((value) => value.toUpperCase()),
    instrumentVersion: z.string().trim().min(1).max(40),
    score: z.number().finite().optional(),
    scoreMin: z.number().finite().optional(),
    scoreMax: z.number().finite().optional(),
    responses: z.record(z.string(), z.unknown()),
    completedItemCount: z.number().int().nonnegative().optional(),
    totalItemCount: z.number().int().positive().optional(),
    measuredAt: z.coerce.date().optional(),
  })
  .superRefine((input, context) => {
    if (
      input.scoreMin !== undefined &&
      input.scoreMax !== undefined &&
      input.scoreMin >= input.scoreMax
    ) {
      context.addIssue({
        code: "custom",
        path: ["scoreMax"],
        message: "El límite máximo debe ser mayor que el mínimo.",
      });
    }
    if (
      input.score !== undefined &&
      ((input.scoreMin !== undefined && input.score < input.scoreMin) ||
        (input.scoreMax !== undefined && input.score > input.scoreMax))
    ) {
      context.addIssue({
        code: "custom",
        path: ["score"],
        message: "El resultado debe estar dentro del rango indicado.",
      });
    }
    if (
      input.completedItemCount !== undefined &&
      input.totalItemCount !== undefined &&
      input.completedItemCount > input.totalItemCount
    ) {
      context.addIssue({
        code: "custom",
        path: ["completedItemCount"],
        message: "Las respuestas completadas superan el total de preguntas.",
      });
    }
  });

export const outcomeTrendInput = z.object({
  episodeId: z.string().cuid(),
  instrumentCode: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[A-Za-z0-9._-]+$/)
    .transform((value) => value.toUpperCase()),
  instrumentVersion: z.string().trim().min(1).max(40),
});

export const operationalAnalyticsInput = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine((value) => value.from < value.to, {
    path: ["to"],
    message: "El final del periodo debe ser posterior al inicio.",
  })
  .refine(
    (value) =>
      value.to.getTime() - value.from.getTime() <= 93 * 24 * 60 * 60 * 1000,
    { path: ["to"], message: "El periodo máximo es de 93 días." },
  );

export type CreateCareEpisodeInput = z.infer<typeof createCareEpisodeInput>;
export type CreateEncounterDraftInput = z.infer<
  typeof createEncounterDraftInput
>;
export type UpdateEncounterDraftInput = z.infer<
  typeof updateEncounterDraftInput
>;
export type AmendEncounterInput = z.infer<typeof amendEncounterInput>;
export type CreateFollowUpTaskInput = z.infer<typeof createFollowUpTaskInput>;
export type RecordOutcomeAssessmentInput = z.infer<
  typeof recordOutcomeAssessmentInput
>;
