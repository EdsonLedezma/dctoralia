import { z } from "zod";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  validationFeedbackInput,
  validationWindow,
} from "~/server/domain/validation/feedback-policy";
import {
  createValidationFeedback,
  FeedbackLimitError,
  listValidationFeedback,
} from "~/server/domain/validation/feedback-service";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

function windowState() {
  return validationWindow(
    env.VALIDATION_FEEDBACK_ENABLED,
    env.VALIDATION_FEEDBACK_UNTIL,
  );
}

export const validationFeedbackRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({ cursor: z.string().cuid().optional() }).strict().optional(),
    )
    .query(async ({ ctx, input }) => {
      const window = windowState();
      if (!window.enabled)
        return trpcSuccess(
          { ...window, items: [], nextCursor: null },
          "La etapa de feedback está cerrada.",
        );
      try {
        return trpcSuccess(
          {
            ...window,
            ...(await listValidationFeedback(ctx.db, input?.cursor)),
          },
          "Notas de validación.",
        );
      } catch {
        return trpcFailure(
          "FEEDBACK_UNAVAILABLE",
          "No pudimos cargar las notas. Intenta nuevamente.",
          503,
        );
      }
    }),
  create: protectedProcedure
    .input(validationFeedbackInput)
    .mutation(async ({ ctx, input }) => {
      if (!windowState().enabled)
        return trpcFailure(
          "VALIDATION_CLOSED",
          "La etapa de feedback está cerrada.",
          410,
        );
      try {
        const note = await createValidationFeedback(
          ctx.db,
          ctx.session.user.id,
          input.body,
        );
        return trpcSuccess(
          note,
          "Gracias. Tu nota ya es visible para los usuarios de prueba.",
          201,
        );
      } catch (error: unknown) {
        if (error instanceof FeedbackLimitError)
          return trpcFailure("RATE_LIMITED", error.message, 429);
        return trpcFailure(
          "FEEDBACK_UNAVAILABLE",
          "No se pudo guardar tu nota. Intenta nuevamente.",
          503,
        );
      }
    }),
});
