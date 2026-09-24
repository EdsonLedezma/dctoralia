import { Prisma, type Role } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  canInviteDoctor,
  canJoinDoctorWorkspace,
  canManageWorkspace,
} from "~/server/domain/subscriptions/workspace-policy";
import {
  hasWorkspaceAccess,
  resolveSubscriptionEntitlements,
} from "~/server/domain/subscriptions/subscription-plan";
import {
  createInvitationToken,
  hashInvitationToken,
  normalizeInvitationEmail,
} from "~/server/domain/workspaces/invitation-token";
import type { WorkspaceContext } from "~/server/domain/workspaces/workspace-context";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";
import {
  assertWorkspaceCapacity,
  WorkspaceCapacityError,
} from "~/server/domain/workspaces/workspace-capacity";

type RouterContext = {
  getWorkspace: () => Promise<WorkspaceContext | null>;
  session: { user: { id: string; email?: string | null; role: Role } };
};

async function getWorkspaceManager(ctx: RouterContext) {
  const workspace = await ctx.getWorkspace();
  if (!workspace) {
    return {
      workspace: null,
      error: trpcFailure(
        "WORKSPACE_NOT_FOUND",
        "No tienes un workspace asignado",
        404,
      ),
    } as const;
  }

  if (!workspace.subscription) {
    return {
      workspace: null,
      error: trpcFailure(
        "SUBSCRIPTION_NOT_CONFIGURED",
        "El workspace todavía no tiene una suscripción activa",
        409,
      ),
    } as const;
  }

  const plan = resolveSubscriptionEntitlements(workspace.subscription);
  const policyContext = {
    platformRole: ctx.session.user.role,
    membershipRole: workspace.membershipRole,
    subscriptionStatus: workspace.subscription.status,
    plan,
    currentDoctorCount: 0,
    currentLocationCount: 0,
  };

  if (!hasWorkspaceAccess(workspace.subscription.status)) {
    return {
      workspace: null,
      error: trpcFailure(
        "WORKSPACE_INACTIVE",
        "La suscripción del workspace no está activa",
        403,
      ),
    } as const;
  }

  if (!canManageWorkspace(policyContext)) {
    return {
      workspace: null,
      error: trpcFailure(
        "WORKSPACE_FORBIDDEN",
        "No tienes permisos para administrar invitaciones",
        403,
      ),
    } as const;
  }

  return { workspace, plan, error: null } as const;
}

export const workspaceInvitationsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const managed = await getWorkspaceManager(ctx);
    if (managed.error) return managed.error;

    try {
      const invitations = await ctx.db.clinicInvitation.findMany({
        where: { clinicId: managed.workspace.clinicId },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return trpcSuccess(invitations, "Invitaciones recuperadas correctamente");
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "No fue posible recuperar las invitaciones",
        500,
      );
    }
  }),

  create: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        expiresInDays: z.number().int().min(1).max(30).default(7),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const managed = await getWorkspaceManager(ctx);
      if (managed.error) return managed.error;

      const email = normalizeInvitationEmail(input.email);
      try {
        const doctorCount = await ctx.db.doctor.count({
          where: { clinicId: managed.workspace.clinicId },
        });

        if (
          !canInviteDoctor({
            platformRole: ctx.session.user.role,
            membershipRole: managed.workspace.membershipRole,
            subscriptionStatus:
              managed.workspace.subscription?.status ?? "CANCELED",
            plan: managed.plan,
            currentDoctorCount: doctorCount,
            currentLocationCount: 0,
          })
        ) {
          return trpcFailure(
            "DOCTOR_LIMIT_REACHED",
            "El plan actual no permite invitar otro doctor",
            409,
          );
        }

        const pendingInvitation = await ctx.db.clinicInvitation.findFirst({
          where: {
            clinicId: managed.workspace.clinicId,
            email,
            role: "DOCTOR",
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        });

        if (pendingInvitation) {
          return trpcFailure(
            "INVITATION_ALREADY_EXISTS",
            "Ya existe una invitación pendiente para este correo",
            409,
          );
        }

        const token = createInvitationToken();
        const expiresAt = new Date();
        expiresAt.setUTCDate(expiresAt.getUTCDate() + input.expiresInDays);

        const invitation = await ctx.db.clinicInvitation.create({
          data: {
            clinicId: managed.workspace.clinicId,
            invitedByUserId: ctx.session.user.id,
            email,
            role: "DOCTOR",
            tokenHash: hashInvitationToken(token),
            expiresAt,
          },
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            createdAt: true,
          },
        });

        return trpcSuccess(
          { invitation, inviteToken: token },
          "Invitación creada; envíala mediante el canal configurado",
          201,
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible crear la invitación",
          500,
        );
      }
    }),

  revoke: protectedProcedure
    .input(z.object({ invitationId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const managed = await getWorkspaceManager(ctx);
      if (managed.error) return managed.error;

      try {
        const revoked = await ctx.db.clinicInvitation.updateMany({
          where: {
            id: input.invitationId,
            clinicId: managed.workspace.clinicId,
            acceptedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });

        if (revoked.count === 0) {
          return trpcFailure(
            "INVITATION_NOT_FOUND",
            "Invitación pendiente no encontrada",
            404,
          );
        }

        return trpcSuccess(
          { id: input.invitationId },
          "Invitación revocada correctamente",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible revocar la invitación",
          500,
        );
      }
    }),

  accept: protectedProcedure
    .input(z.object({ token: z.string().min(40).max(200) }))
    .mutation(async ({ input, ctx }) => {
      try {
        const invitation = await ctx.db.clinicInvitation.findUnique({
          where: { tokenHash: hashInvitationToken(input.token) },
          select: {
            id: true,
            clinicId: true,
            email: true,
            role: true,
            expiresAt: true,
            acceptedAt: true,
            revokedAt: true,
            clinic: {
              select: {
                name: true,
                slug: true,
                timezone: true,
                subscription: {
                  select: {
                    plan: true,
                    status: true,
                    monthlyPriceMxn: true,
                    includedMessagingMxn: true,
                    messagingOverageAllowed: true,
                    customDevelopmentEnabled: true,
                    extendedMessagingEnabled: true,
                  },
                },
              },
            },
          },
        });

        if (
          !invitation ||
          invitation.acceptedAt ||
          invitation.revokedAt ||
          invitation.expiresAt <= new Date()
        ) {
          return trpcFailure(
            "INVITATION_INVALID",
            "La invitación no es válida o ya expiró",
            400,
          );
        }

        const sessionEmail = normalizeInvitationEmail(
          ctx.session.user.email ?? "",
        );
        if (!sessionEmail || sessionEmail !== invitation.email) {
          return trpcFailure(
            "INVITATION_EMAIL_MISMATCH",
            "La invitación no corresponde al correo autenticado",
            403,
          );
        }

        if (invitation.role !== "DOCTOR" || !invitation.clinic.subscription) {
          return trpcFailure(
            "INVITATION_UNSUPPORTED",
            "Esta invitación no puede aceptarse todavía",
            409,
          );
        }

        if (ctx.session.user.role !== "DOCTOR") {
          return trpcFailure(
            "DOCTOR_REQUIRED",
            "Debes tener una cuenta de doctor para aceptar esta invitación",
            403,
          );
        }

        const plan = resolveSubscriptionEntitlements(
          invitation.clinic.subscription,
        );
        if (!hasWorkspaceAccess(invitation.clinic.subscription.status)) {
          return trpcFailure(
            "WORKSPACE_INACTIVE",
            "La suscripción del workspace no está activa",
            403,
          );
        }

        const doctor = await ctx.db.doctor.findUnique({
          where: { userId: ctx.session.user.id },
          select: { id: true, clinicId: true },
        });
        if (!doctor) {
          return trpcFailure(
            "DOCTOR_NOT_FOUND",
            "No se encontró tu perfil de doctor",
            404,
          );
        }

        if (doctor.clinicId && doctor.clinicId !== invitation.clinicId) {
          return trpcFailure(
            "DOCTOR_ALREADY_ASSIGNED",
            "Ya perteneces a otro workspace",
            409,
          );
        }

        const doctorCount = await ctx.db.doctor.count({
          where: { clinicId: invitation.clinicId },
        });
        if (
          !canJoinDoctorWorkspace({
            platformRole: ctx.session.user.role,
            membershipRole: "DOCTOR",
            subscriptionStatus: invitation.clinic.subscription.status,
            plan,
            currentDoctorCount: doctorCount,
            currentLocationCount: 0,
          })
        ) {
          return trpcFailure(
            "DOCTOR_LIMIT_REACHED",
            "El plan no permite agregar más doctores",
            409,
          );
        }

        const member = await ctx.db.$transaction(
          async (tx) => {
            await assertWorkspaceCapacity(tx, invitation.clinicId, "doctor");
            const currentDoctor = await tx.doctor.findUnique({
              where: { id: doctor.id },
              select: { clinicId: true },
            });
            if (
              !currentDoctor ||
              (currentDoctor.clinicId &&
                currentDoctor.clinicId !== invitation.clinicId)
            )
              throw new WorkspaceCapacityError(
                "Ya perteneces a otro workspace.",
              );
            const createdMember = await tx.clinicMember.create({
              data: {
                clinicId: invitation.clinicId,
                userId: ctx.session.user.id,
                role: "DOCTOR",
              },
              select: { id: true, role: true },
            });

            await tx.doctor.update({
              where: { id: doctor.id },
              data: { clinicId: invitation.clinicId },
            });

            await tx.clinicInvitation.update({
              where: {
                id: invitation.id,
                acceptedAt: null,
                revokedAt: null,
                expiresAt: { gt: new Date() },
              },
              data: { acceptedAt: new Date() },
            });

            return createdMember;
          },
          { isolationLevel: "Serializable" },
        );

        return trpcSuccess(
          {
            member,
            clinic: invitation.clinic,
          },
          "Invitación aceptada correctamente",
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return trpcFailure(
            "MEMBER_ALREADY_EXISTS",
            "Ya perteneces a este workspace",
            409,
          );
        }

        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible aceptar la invitación",
          500,
        );
      }
    }),
});
