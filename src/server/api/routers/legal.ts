import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { LEGAL_VERSION } from "~/lib/legal/company";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

export const legalRouter = createTRPCRouter({
  termsStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { termsVersion: true, termsAcceptedAt: true },
      });
      return trpcSuccess(
        {
          currentVersion: LEGAL_VERSION,
          acceptedVersion: user?.termsVersion ?? null,
          acceptedAt: user?.termsAcceptedAt ?? null,
          isCurrent: user?.termsVersion === LEGAL_VERSION,
        },
        "Estado de términos",
      );
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "No se pudo consultar el estado de los términos",
        500,
      );
    }
  }),

  acceptTerms: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const user = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { termsVersion: LEGAL_VERSION, termsAcceptedAt: new Date() },
        select: { termsVersion: true, termsAcceptedAt: true },
      });
      return trpcSuccess(
        {
          acceptedVersion: user.termsVersion,
          acceptedAt: user.termsAcceptedAt,
        },
        "Términos aceptados",
      );
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "No se pudo registrar la aceptación de los términos",
        500,
      );
    }
  }),
});
