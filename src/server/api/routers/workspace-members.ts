import { Prisma } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  canInviteDoctor,
  canManageWorkspace,
} from "~/server/domain/subscriptions/workspace-policy";
import {
  hasWorkspaceAccess,
  resolveSubscriptionEntitlements,
} from "~/server/domain/subscriptions/subscription-plan";
import type { WorkspaceContext } from "~/server/domain/workspaces/workspace-context";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";
import {
  assertWorkspaceCapacity,
  WorkspaceCapacityError,
} from "~/server/domain/workspaces/workspace-capacity";

const memberInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
  },
} satisfies Prisma.ClinicMemberInclude;

async function getManagedWorkspace(ctx: {
  getWorkspace: () => Promise<WorkspaceContext | null>;
  session: { user: { id: string; role: "DOCTOR" | "PATIENT" | "ADMIN" } };
}) {
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
        "No tienes permisos para administrar este workspace",
        403,
      ),
    } as const;
  }

  return { workspace, plan, error: null } as const;
}

export const workspaceMembersRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const workspace = await ctx.getWorkspace();
    if (!workspace) {
      return trpcFailure(
        "WORKSPACE_NOT_FOUND",
        "No tienes un workspace asignado",
        404,
      );
    }

    try {
      const members = await ctx.db.clinicMember.findMany({
        where: { clinicId: workspace.clinicId },
        include: memberInclude,
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      });

      return trpcSuccess(members, "Miembros recuperados correctamente");
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "No fue posible recuperar los miembros",
        500,
      );
    }
  }),

  addDoctor: protectedProcedure
    .input(z.object({ userId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const managed = await getManagedWorkspace(ctx);
      if (managed.error) return managed.error;

      const { workspace, plan } = managed;

      try {
        const doctorCount = await ctx.db.doctor.count({
          where: { clinicId: workspace.clinicId },
        });

        if (
          !canInviteDoctor({
            platformRole: ctx.session.user.role,
            membershipRole: workspace.membershipRole,
            subscriptionStatus: workspace.subscription?.status ?? "CANCELED",
            plan,
            currentDoctorCount: doctorCount,
            currentLocationCount: 0,
          })
        ) {
          return trpcFailure(
            "DOCTOR_LIMIT_REACHED",
            "El plan actual no permite agregar otro doctor",
            409,
          );
        }

        const target = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: {
            role: true,
            doctor: { select: { id: true, clinicId: true } },
          },
        });

        if (!target || target.role !== "DOCTOR" || !target.doctor) {
          return trpcFailure(
            "DOCTOR_NOT_FOUND",
            "El usuario seleccionado no tiene un perfil de doctor válido",
            404,
          );
        }

        const doctor = target.doctor;
        if (doctor.clinicId && doctor.clinicId !== workspace.clinicId) {
          return trpcFailure(
            "DOCTOR_ALREADY_ASSIGNED",
            "El doctor ya pertenece a otro workspace",
            409,
          );
        }

        const existing = await ctx.db.clinicMember.findUnique({
          where: {
            clinicId_userId: {
              clinicId: workspace.clinicId,
              userId: input.userId,
            },
          },
          select: { id: true },
        });

        if (existing) {
          return trpcFailure(
            "MEMBER_ALREADY_EXISTS",
            "El doctor ya es miembro de este workspace",
            409,
          );
        }

        const member = await ctx.db.$transaction(
          async (tx) => {
            await assertWorkspaceCapacity(
              tx,
              workspace.clinicId,
              "doctor",
              ctx.session.user.id,
            );
            const currentDoctor = await tx.doctor.findUnique({
              where: { id: doctor.id },
              select: { clinicId: true },
            });
            if (
              !currentDoctor ||
              (currentDoctor.clinicId &&
                currentDoctor.clinicId !== workspace.clinicId)
            )
              throw new WorkspaceCapacityError(
                "El doctor ya pertenece a otro workspace.",
              );
            await tx.doctor.update({
              where: { id: doctor.id },
              data: { clinicId: workspace.clinicId },
            });

            return tx.clinicMember.create({
              data: {
                clinicId: workspace.clinicId,
                userId: input.userId,
                role: "DOCTOR",
              },
              include: memberInclude,
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        return trpcSuccess(member, "Doctor agregado al workspace", 201);
      } catch (error) {
        if (error instanceof WorkspaceCapacityError)
          return trpcFailure("WORKSPACE_CHANGED", error.message, 409);
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034"
        ) {
          return trpcFailure(
            "WORKSPACE_CHANGED",
            "El workspace cambió; vuelve a intentarlo",
            409,
          );
        }

        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible agregar al doctor",
          500,
        );
      }
    }),

  removeDoctor: protectedProcedure
    .input(z.object({ memberId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const managed = await getManagedWorkspace(ctx);
      if (managed.error) return managed.error;

      const { workspace } = managed;

      try {
        const member = await ctx.db.clinicMember.findFirst({
          where: { id: input.memberId, clinicId: workspace.clinicId },
          select: { id: true, userId: true, role: true },
        });

        if (!member) {
          return trpcFailure("MEMBER_NOT_FOUND", "Miembro no encontrado", 404);
        }

        if (member.userId === ctx.session.user.id) {
          return trpcFailure(
            "SELF_REMOVAL_FORBIDDEN",
            "No puedes retirarte a ti mismo del workspace",
            400,
          );
        }

        if (member.role !== "DOCTOR") {
          return trpcFailure(
            "MEMBER_ROLE_PROTECTED",
            "Este tipo de miembro requiere una política específica",
            409,
          );
        }

        await ctx.db.$transaction(async (tx) => {
          await tx.doctor.updateMany({
            where: { userId: member.userId, clinicId: workspace.clinicId },
            data: { clinicId: null },
          });
          await tx.clinicMember.delete({ where: { id: member.id } });
        });

        return trpcSuccess({ id: member.id }, "Doctor retirado del workspace");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible retirar al doctor",
          500,
        );
      }
    }),
});
