import { Prisma } from "@prisma/client";
import { hash, verify } from "argon2";
import { z } from "zod";
import { LEGAL_VERSION } from "~/lib/legal/company";
import { env } from "~/env";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";
import {
  portalTokenHash,
  portalTokenValid,
} from "~/server/domain/patient-portal/token";
import { preparePortalInvitation } from "~/server/domain/patient-portal/consultation-completed";
import { normalizeVoicePhone } from "~/server/integrations/vapi/phone-number";
const tokenInput = z.string().min(40).max(100);
const usernamePattern = /^[a-z0-9._-]{3,40}$/;

export const patientPortalRouter = createTRPCRouter({
  inspect: publicProcedure
    .input(z.object({ token: tokenInput }).strict())
    .mutation(async ({ ctx, input }) => {
      try {
        const invite = await ctx.db.patientPortalInvitation.findUnique({
          where: { tokenHash: portalTokenHash(input.token) },
          select: {
            expiresAt: true,
            consumedAt: true,
            recipientPhone: true,
            patient: {
              select: {
                user: { select: { name: true, isGuest: true } },
                accountLink: { select: { active: true } },
              },
            },
            doctor: { select: { user: { select: { name: true } } } },
          },
        });
        if (!invite || !portalTokenValid(invite.expiresAt, invite.consumedAt))
          return trpcFailure(
            "INVALID_INVITATION",
            "El enlace venció o ya fue utilizado. Solicita otro al consultorio.",
            404,
          );
        return trpcSuccess(
          {
            name: invite.patient.user.name,
            doctorName: invite.doctor.user.name,
            phoneSuffix: invite.recipientPhone.slice(-4),
            expiresAt: invite.expiresAt,
            alreadyActive:
              !invite.patient.user.isGuest ||
              invite.patient.accountLink?.active === true,
          },
          "Invitación disponible.",
        );
      } catch {
        return trpcFailure(
          "PORTAL_UNAVAILABLE",
          "No fue posible completar la operación. Intenta nuevamente.",
          500,
        );
      }
    }),
  claim: publicProcedure
    .input(
      z
        .object({
          token: tokenInput,
          username: z.string().trim().toLowerCase().min(3).max(128),
          password: z.string().min(8).max(128),
          acceptedTerms: z.literal(true),
        })
        .strict(),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const invitation = await ctx.db.patientPortalInvitation.findUnique({
          where: { tokenHash: portalTokenHash(input.token) },
          include: {
            patient: {
              select: { userId: true, user: { select: { isGuest: true } } },
            },
          },
        });
        if (
          !invitation ||
          !portalTokenValid(invitation.expiresAt, invitation.consumedAt) ||
          !invitation.patient.user.isGuest
        )
          return trpcFailure(
            "INVALID_INVITATION",
            "El enlace no está disponible. Inicia sesión si tu cuenta ya está activa.",
            409,
          );
        const attempt = await ctx.db.patientPortalInvitation.updateMany({
          where: {
            id: invitation.id,
            claimAttempts: { lt: 8 },
            consumedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { claimAttempts: { increment: 1 } },
        });
        if (!attempt.count)
          return trpcFailure(
            "INVITATION_LIMITED",
            "Solicita un nuevo enlace al consultorio.",
            429,
          );
        const existing = await ctx.db.user.findFirst({
          where: {
            OR: [{ username: input.username }, { email: input.username }],
          },
          select: { id: true, password: true, isGuest: true, role: true },
        });
        if (
          existing &&
          (existing.role !== "PATIENT" ||
            existing.isGuest ||
            !existing.password ||
            !(await verify(existing.password, input.password)))
        )
          return trpcFailure(
            "ACCOUNT_CONFLICT",
            "Ese usuario ya existe. Usa la contraseña de tu cuenta o elige un usuario diferente.",
            409,
          );
        if (!existing && !usernamePattern.test(input.username))
          return trpcFailure(
            "INVALID_USERNAME",
            "Usa de 3 a 40 letras, números, puntos, guiones o guiones bajos.",
            400,
          );
        if (!existing && input.password.length < 10)
          return trpcFailure(
            "WEAK_PASSWORD",
            "La nueva contraseña debe tener al menos 10 caracteres.",
            400,
          );
        const password = existing ? null : await hash(input.password);
        await ctx.db.$transaction(
          async (tx) => {
            const consumed = await tx.patientPortalInvitation.updateMany({
              where: {
                id: invitation.id,
                tokenHash: invitation.tokenHash,
                consumedAt: null,
                expiresAt: { gt: new Date() },
              },
              data: { consumedAt: new Date() },
            });
            if (consumed.count !== 1) throw new Error("INVITATION_USED");
            const userId = existing?.id ?? invitation.patient.userId;
            if (!existing && password) {
              const activated = await tx.user.updateMany({
                where: { id: userId, isGuest: true, password: null },
                data: {
                  username: input.username,
                  password,
                  isGuest: false,
                  termsVersion: LEGAL_VERSION,
                  termsAcceptedAt: new Date(),
                },
              });
              if (activated.count !== 1) throw new Error("ACCOUNT_CHANGED");
            }
            await tx.patientAccountLink.upsert({
              where: { patientId: invitation.patientId },
              update: {},
              create: { patientId: invitation.patientId, userId, active: true },
            });
            const ownership = await tx.patientAccountLink.findUnique({
              where: { patientId: invitation.patientId },
              select: { userId: true, active: true },
            });
            if (!ownership?.active || ownership.userId !== userId)
              throw new Error("ACCOUNT_CHANGED");
            await tx.patientPortalAccess.upsert({
              where: {
                patientId_doctorId: {
                  patientId: invitation.patientId,
                  doctorId: invitation.doctorId,
                },
              },
              update: { active: true },
              create: {
                patientId: invitation.patientId,
                doctorId: invitation.doctorId,
                clinicId: invitation.clinicId,
                active: true,
              },
            });
            await tx.patientPortalAccess.updateMany({
              where: { patientId: invitation.patientId },
              data: { active: true },
            });
            await tx.patientPortalInvitation.updateMany({
              where: { patientId: invitation.patientId, consumedAt: null },
              data: { consumedAt: new Date() },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return trpcSuccess(
          { login: input.username },
          "Tu expediente quedó vinculado. Ya puedes iniciar sesión.",
        );
      } catch (error) {
        return trpcFailure(
          "ACTIVATION_UNAVAILABLE",
          error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
            ? "Ese usuario ya está ocupado. Elige otro."
            : "No se pudo activar el acceso. Revisa el enlace o solicita uno nuevo.",
          409,
        );
      }
    }),
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    try {
      const workspace = await ctx.getWorkspace();
      if (
        !workspace ||
        workspace.membershipRole === "RECEPTIONIST" ||
        ctx.session.user.role !== "DOCTOR"
      )
        return trpcFailure(
          "FORBIDDEN",
          "Solo el doctor puede configurar las reservas.",
          403,
        );
      const doctor = await ctx.db.doctor.findFirst({
        where: { userId: ctx.session.user.id, clinicId: workspace.clinicId },
        select: { id: true, phone: true, bookingSettings: true },
      });
      if (!doctor)
        return trpcFailure("FORBIDDEN", "Selecciona tu consultorio.", 403);
      return trpcSuccess(
        {
          supportPhone: doctor.bookingSettings?.supportPhone ?? doctor.phone,
          publicBookingEnabled:
            doctor.bookingSettings?.publicBookingEnabled ?? true,
          sendConfirmation: doctor.bookingSettings?.sendConfirmation ?? true,
          inviteAfterConsultation:
            doctor.bookingSettings?.inviteAfterConsultation ?? true,
          confirmationsReady:
            env.SENT_ENABLED === "true" &&
            env.DEMO_MODE !== "true" &&
            !!(
              doctor.bookingSettings?.confirmationTemplate ??
              env.SENT_APPOINTMENT_CONFIRMATION_TEMPLATE
            ),
          invitationsReady:
            env.SENT_ENABLED === "true" &&
            env.DEMO_MODE !== "true" &&
            !!env.APP_URL &&
            !!(
              doctor.bookingSettings?.invitationTemplate ??
              env.SENT_PORTAL_INVITATION_TEMPLATE
            ),
        },
        "Configuración de reservas.",
      );
    } catch {
      return trpcFailure(
        "PORTAL_UNAVAILABLE",
        "No fue posible completar la operación. Intenta nuevamente.",
        500,
      );
    }
  }),
  configure: protectedProcedure
    .input(
      z
        .object({
          supportPhone: z.string().trim().min(10).max(25),
          publicBookingEnabled: z.boolean(),
          sendConfirmation: z.boolean(),
          inviteAfterConsultation: z.boolean(),
        })
        .strict(),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await ctx.getWorkspace();
        if (
          !workspace ||
          workspace.membershipRole === "RECEPTIONIST" ||
          ctx.session.user.role !== "DOCTOR"
        )
          return trpcFailure(
            "FORBIDDEN",
            "Solo el doctor puede configurar las reservas.",
            403,
          );
        const phone = normalizeVoicePhone(input.supportPhone);
        if (!phone)
          return trpcFailure(
            "INVALID_PHONE",
            "Escribe un teléfono válido con código de país.",
            400,
          );
        const doctor = await ctx.db.doctor.findFirst({
          where: { userId: ctx.session.user.id, clinicId: workspace.clinicId },
          select: { id: true },
        });
        if (!doctor)
          return trpcFailure("FORBIDDEN", "Selecciona tu consultorio.", 403);
        const settings = await ctx.db.doctorBookingSettings.upsert({
          where: { doctorId: doctor.id },
          update: { ...input, supportPhone: phone },
          create: {
            doctorId: doctor.id,
            clinicId: workspace.clinicId,
            ...input,
            supportPhone: phone,
          },
          select: { id: true },
        });
        return trpcSuccess(settings, "Preferencias guardadas.");
      } catch {
        return trpcFailure(
          "PORTAL_UNAVAILABLE",
          "No fue posible completar la operación. Intenta nuevamente.",
          500,
        );
      }
    }),
  resendInvitation: protectedProcedure
    .input(z.object({ patientId: z.string().cuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await ctx.getWorkspace();
        if (
          !workspace ||
          workspace.membershipRole === "RECEPTIONIST" ||
          ctx.session.user.role !== "DOCTOR"
        )
          return trpcFailure(
            "FORBIDDEN",
            "Solo el doctor puede invitar al portal.",
            403,
          );
        const encounter = await ctx.db.clinicalEncounter.findFirst({
          where: {
            patientId: input.patientId,
            clinicId: workspace.clinicId,
            doctor: { userId: ctx.session.user.id },
            status: "SIGNED",
          },
          orderBy: { signedAt: "desc" },
          select: {
            id: true,
            doctorId: true,
            clinicId: true,
            patientId: true,
            appointmentId: true,
          },
        });
        if (!encounter)
          return trpcFailure(
            "CONSULTATION_REQUIRED",
            "Primero finaliza una consulta de este paciente.",
            409,
          );
        const recent = await ctx.db.patientPortalInvitation.findUnique({
          where: { encounterId: encounter.id },
          select: { updatedAt: true },
        });
        if (recent && recent.updatedAt.getTime() > Date.now() - 60_000)
          return trpcFailure(
            "RATE_LIMITED",
            "Espera un minuto antes de reenviar la invitación.",
            429,
          );
        const result = await ctx.db.$transaction(
          (tx) => preparePortalInvitation(tx, encounter, true),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return result.queued
          ? trpcSuccess(null, "Invitación en cola de envío.")
          : trpcFailure(
              "INVITATION_NOT_SENT",
              "No se envió: revisa consentimiento, teléfono, configuración o si el paciente ya tiene cuenta.",
              409,
            );
      } catch {
        return trpcFailure(
          "PORTAL_UNAVAILABLE",
          "No fue posible completar la operación. Intenta nuevamente.",
          500,
        );
      }
    }),
});
