import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";
import { resolveSubscriptionEntitlements } from "~/server/domain/subscriptions/subscription-plan";
import { workspaceMembersRouter } from "~/server/api/routers/workspace-members";
import { workspaceInvitationsRouter } from "~/server/api/routers/workspace-invitations";
import { workspaceLocationsRouter } from "~/server/api/routers/workspace-locations";
import { z } from "zod";
import { createDoctorWorkspace } from "~/server/domain/workspaces/create-workspace";
import { BillingError } from "~/server/domain/subscriptions/billing-error";

export const workspaceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string().trim().min(2).max(100) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await createDoctorWorkspace(
          ctx.db,
          ctx.session.user.id,
          input.name,
        );
        ctx.setWorkspaceCookie(result.clinicId);
        return trpcSuccess(
          result,
          "Workspace creado; selecciona tu suscripción",
          201,
        );
      } catch (error) {
        if (error instanceof BillingError)
          return trpcFailure(error.code, error.message, error.status);
        return trpcFailure(
          "WORKSPACE_CREATE_FAILED",
          "No fue posible crear el workspace. Actualiza antes de reintentar.",
          409,
        );
      }
    }),
  members: workspaceMembersRouter,
  invitations: workspaceInvitationsRouter,
  locations: workspaceLocationsRouter,
  select: protectedProcedure
    .input(z.object({ clinicId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const workspace = (await ctx.getWorkspaces()).find(
          (item) => item.clinicId === input.clinicId,
        );
        if (!workspace) {
          return trpcFailure(
            "WORKSPACE_FORBIDDEN",
            "No tienes acceso a este workspace",
            403,
          );
        }

        ctx.setWorkspaceCookie(input.clinicId);
        return trpcSuccess(
          { clinicId: input.clinicId },
          "Workspace seleccionado correctamente",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible seleccionar el workspace",
          500,
        );
      }
    }),
  listMine: protectedProcedure.query(async ({ ctx }) => {
    try {
      const [activeWorkspace, workspaces] = await Promise.all([
        ctx.getWorkspace(),
        ctx.getWorkspaces(),
      ]);

      return trpcSuccess(
        {
          activeClinicId: activeWorkspace?.clinicId ?? null,
          workspaces: workspaces.map((workspace) => ({
            clinicId: workspace.clinicId,
            name: workspace.clinic.name,
            slug: workspace.clinic.slug,
            membershipRole: workspace.membershipRole,
            plan: workspace.subscription?.plan ?? null,
            status: workspace.subscription?.status ?? null,
          })),
        },
        "Workspaces recuperados correctamente",
      );
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "No fue posible recuperar tus workspaces",
        500,
      );
    }
  }),
  getMine: protectedProcedure.query(async ({ ctx }) => {
    try {
      const workspace = await ctx.getWorkspace();
      if (!workspace) {
        return trpcFailure(
          "WORKSPACE_NOT_FOUND",
          "No tienes un workspace asignado",
          404,
        );
      }

      const entitlements = workspace.subscription
        ? resolveSubscriptionEntitlements(workspace.subscription)
        : null;

      return trpcSuccess(
        {
          clinicId: workspace.clinicId,
          membershipRole: workspace.membershipRole,
          clinic: workspace.clinic,
          subscription: workspace.subscription
            ? {
                plan: workspace.subscription.plan,
                status: workspace.subscription.status,
                monthlyPriceMxn: workspace.subscription.monthlyPriceMxn,
                includedMessagingMxn:
                  workspace.subscription.includedMessagingMxn,
              }
            : null,
          entitlements,
        },
        "Workspace recuperado correctamente",
      );
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "No fue posible recuperar el workspace",
        500,
      );
    }
  }),
});
