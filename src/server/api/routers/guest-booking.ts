import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { env } from "~/env";
import { enforceRateLimit } from "~/server/security/rate-limit";
import { bookingInput } from "~/server/domain/booking/guest-booking.schema";
import {
  createGuestBooking,
  GuestBookingError,
} from "~/server/domain/booking/guest-booking";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";
import {
  resolveOperationalActor,
  selectedDoctorCookie,
} from "~/server/domain/workspaces/operational-actor";
import type { PrismaClient, Role } from "@prisma/client";
import type { WorkspaceContext } from "~/server/domain/workspaces/workspace-context";

type StaffContext = {
  db: PrismaClient;
  session: { user: { id: string; role: Role } };
  headers: Headers;
  getWorkspace: () => Promise<WorkspaceContext | null>;
};
async function staffWorkspace(ctx: StaffContext, requestedDoctorId?: string) {
  const workspace = await ctx.getWorkspace();
  if (!workspace || ctx.session.user.role !== "DOCTOR")
    throw new GuestBookingError(
      "Selecciona un consultorio con permiso de agenda.",
      403,
    );
  const receptionist = workspace.membershipRole === "RECEPTIONIST";
  const allowed = receptionist
    ? (
        await ctx.db.agendaAdministrator.findMany({
          where: {
            userId: ctx.session.user.id,
            clinicId: workspace.clinicId,
            active: true,
            doctor: {
              clinicId: workspace.clinicId,
              bookingSettings: { agendaAdminEnabled: true },
            },
          },
          select: { doctorId: true },
        })
      ).map((item) => item.doctorId)
    : (
        await ctx.db.doctor.findMany({
          where: {
            clinicId: workspace.clinicId,
            ...(["OWNER", "ADMIN"].includes(workspace.membershipRole)
              ? {}
              : { userId: ctx.session.user.id }),
          },
          select: { id: true },
        })
      ).map((item) => item.id);
  const ownDoctor = receptionist
    ? null
    : await ctx.db.doctor.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });
  const fallback =
    ownDoctor && allowed.includes(ownDoctor.id) ? ownDoctor.id : allowed[0];
  const requested = requestedDoctorId ?? selectedDoctorCookie(ctx.headers);
  const doctorId =
    requested && allowed.includes(requested)
      ? requested
      : !requestedDoctorId
        ? fallback
        : undefined;
  if (!doctorId)
    throw new GuestBookingError(
      "No tienes permiso para operar esta agenda.",
      403,
    );
  if (receptionist) {
    const actor = await resolveOperationalActor(
      ctx.db,
      ctx.session.user,
      workspace,
      doctorId,
    );
    if (actor.operationalDoctorId !== doctorId)
      throw new GuestBookingError(
        "No tienes permiso para operar esta agenda.",
        403,
      );
  }
  return { ...workspace, doctorId, allowed, receptionist };
}
function failure(error: unknown) {
  if (error instanceof GuestBookingError)
    return trpcFailure("BOOKING_UNAVAILABLE", error.message, error.status);
  return trpcFailure(
    "BOOKING_UNAVAILABLE",
    "No se pudo guardar la solicitud. Consulta disponibilidad antes de reintentar.",
    409,
  );
}
export const guestBookingRouter = createTRPCRouter({
  publicCreate: publicProcedure
    .input(bookingInput)
    .mutation(async ({ ctx, input }) => {
      const origin = ctx.headers.get("origin");
      let expectedOrigin: string;
      try {
        expectedOrigin =
          env.NODE_ENV === "production" && env.APP_URL
            ? new URL(env.APP_URL).origin
            : new URL("http://" + (ctx.headers.get("host") ?? "localhost:3000"))
                .origin;
      } catch {
        return trpcFailure(
          "UNAVAILABLE",
          "La reserva pública no está configurada.",
          503,
        );
      }
      if (!origin || origin !== expectedOrigin)
        return trpcFailure("FORBIDDEN", "Solicitud no permitida.", 403);
      const limited = await enforceRateLimit(
        new Request(origin + "/api/trpc", { headers: ctx.headers }),
        "registration",
        [input.phone],
      );
      if (limited)
        return trpcFailure(
          "RATE_LIMITED",
          "Espera unos minutos antes de solicitar otra cita.",
          limited.status,
        );
      if (!input.intake)
        return trpcFailure(
          "INTAKE_REQUIRED",
          "Cuéntale al doctor el motivo de tu consulta.",
          400,
        );
      try {
        const patient =
          ctx.session?.user.role === "PATIENT"
            ? await ctx.db.patient.findUnique({
                where: { userId: ctx.session.user.id },
                select: { id: true },
              })
            : null;
        if (ctx.session?.user.role === "PATIENT" && !patient) {
          return trpcFailure(
            "PATIENT_PROFILE_REQUIRED",
            "No se pudo recuperar tu ficha. Contacta al consultorio antes de enviar otra solicitud.",
            409,
          );
        }
        const result = await createGuestBooking(ctx.db, input, {
          publicRequest: true,
          actorUserId: patient ? ctx.session?.user.id : undefined,
          existingPatientId: patient?.id,
        });
        return trpcSuccess(
          result,
          "Solicitud enviada. El consultorio debe confirmar el horario.",
          201,
        );
      } catch (error) {
        return failure(error);
      }
    }),
  staffContext: protectedProcedure.query(async ({ ctx }) => {
    try {
      const workspace = await staffWorkspace(ctx);
      const doctors = await ctx.db.doctor.findMany({
        where: { clinicId: workspace.clinicId, id: { in: workspace.allowed } },
        select: {
          id: true,
          userId: true,
          user: { select: { name: true } },
          services: {
            where: { clinicId: workspace.clinicId, isActive: true },
            select: { id: true, name: true, duration: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      return trpcSuccess(
        {
          doctors: doctors.map(({ userId: _userId, ...doctor }) => doctor),
          defaultDoctorId: workspace.doctorId,
          isReceptionist: workspace.receptionist,
        },
        "Agenda del consultorio.",
      );
    } catch (error) {
      return failure(error);
    }
  }),
  contacts: protectedProcedure
    .input(
      z.object({
        search: z.string().trim().min(2).max(100),
        doctorId: z.string().cuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const workspace = await staffWorkspace(ctx, input.doctorId);
        const digits = input.search.replace(/\D/g, "");
        const contacts = await ctx.db.patient.findMany({
          where: {
            AND: [
              {
                appointments: {
                  some: {
                    clinicId: workspace.clinicId,
                    doctorId: workspace.doctorId,
                  },
                },
              },
              {
                OR: [
                  {
                    user: {
                      name: { contains: input.search, mode: "insensitive" },
                    },
                  },
                  {
                    user: {
                      email: { equals: input.search, mode: "insensitive" },
                    },
                  },
                  ...(digits.length >= 4
                    ? [{ phone: { contains: digits } }]
                    : []),
                ],
              },
            ],
          },
          select: {
            id: true,
            phone: true,
            user: { select: { name: true, email: true } },
          },
          take: 8,
          orderBy: { updatedAt: "desc" },
        });
        return trpcSuccess(
          contacts,
          "Confirma con la persona si alguno de estos contactos corresponde.",
        );
      } catch (error) {
        return failure(error);
      }
    }),
  staffCreate: protectedProcedure
    .input(
      bookingInput.extend({ existingPatientId: z.string().cuid().optional() }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await staffWorkspace(ctx, input.doctorId);
        const result = await createGuestBooking(ctx.db, input, {
          publicRequest: false,
          clinicId: workspace.clinicId,
          actorUserId: ctx.session.user.id,
          existingPatientId: input.existingPatientId,
        });
        return trpcSuccess(
          result,
          "Cita registrada, pendiente de confirmación.",
          201,
        );
      } catch (error) {
        return failure(error);
      }
    }),
});
