import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { listPatientUploadSpaces } from "~/server/domain/patient-portal/uploads";
import { trpcSuccess, trpcFailure } from "~/types/trpc-response";
export const patientPortalUploadsRouter = createTRPCRouter({
  spaces: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "PATIENT")
      return trpcFailure(
        "FORBIDDEN",
        "Esta sección está disponible para pacientes.",
        403,
      );
    try {
      return trpcSuccess(
        await listPatientUploadSpaces(ctx.db, ctx.session.user.id),
        "Consultorios y cupos disponibles.",
      );
    } catch {
      return trpcFailure(
        "PORTAL_UNAVAILABLE",
        "No se pudieron cargar tus documentos.",
        503,
      );
    }
  }),
});
