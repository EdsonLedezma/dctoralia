import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  canCreateLocation,
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

const locationInput = z.object({
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().max(180).optional(),
  timezone: z
    .string()
    .trim()
    .max(80)
    .refine((value) => {
      if (!value) return true;
      try {
        new Intl.DateTimeFormat("es-MX", { timeZone: value }).format();
        return true;
      } catch {
        return false;
      }
    }, "Zona horaria no válida")
    .optional(),
});

async function getManagedWorkspace(ctx: {
  getWorkspace: () => Promise<WorkspaceContext | null>;
  session: { user: { role: "DOCTOR" | "PATIENT" | "ADMIN" } };
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

export const workspaceLocationsRouter = createTRPCRouter({
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
      const locations = await ctx.db.clinicLocation.findMany({
        where: { clinicId: workspace.clinicId },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          address: true,
          timezone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return trpcSuccess(locations, "Ubicaciones recuperadas correctamente");
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "No fue posible recuperar las ubicaciones",
        500,
      );
    }
  }),

  create: protectedProcedure
    .input(locationInput)
    .mutation(async ({ input, ctx }) => {
      const managed = await getManagedWorkspace(ctx);
      if (managed.error) return managed.error;

      const { workspace, plan } = managed;
      try {
        const currentLocationCount = await ctx.db.clinicLocation.count({
          where: { clinicId: workspace.clinicId, isActive: true },
        });

        if (
          !canCreateLocation({
            platformRole: ctx.session.user.role,
            membershipRole: workspace.membershipRole,
            subscriptionStatus: workspace.subscription?.status ?? "CANCELED",
            plan,
            currentDoctorCount: 0,
            currentLocationCount,
          })
        ) {
          return trpcFailure(
            "LOCATION_LIMIT_REACHED",
            "El plan actual no permite agregar otra ubicación",
            409,
          );
        }

        const location = await ctx.db.$transaction(
          async (tx) => {
            await assertWorkspaceCapacity(
              tx,
              workspace.clinicId,
              "location",
              ctx.session.user.role === "ADMIN"
                ? undefined
                : ctx.session.user.id,
            );
            return tx.clinicLocation.create({
              data: {
                clinicId: workspace.clinicId,
                name: input.name,
                address: input.address || null,
                timezone: input.timezone || null,
              },
              select: {
                id: true,
                name: true,
                address: true,
                timezone: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
              },
            });
          },
          { isolationLevel: "Serializable" },
        );
        return trpcSuccess(location, "Ubicación creada correctamente", 201);
      } catch (error) {
        if (error instanceof WorkspaceCapacityError)
          return trpcFailure("LOCATION_LIMIT_REACHED", error.message, 409);
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible crear la ubicación",
          500,
        );
      }
    }),

  update: protectedProcedure
    .input(locationInput.extend({ locationId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const managed = await getManagedWorkspace(ctx);
      if (managed.error) return managed.error;

      try {
        const location = await ctx.db.clinicLocation.updateMany({
          where: { id: input.locationId, clinicId: managed.workspace.clinicId },
          data: {
            name: input.name,
            address: input.address || null,
            timezone: input.timezone || null,
          },
        });
        if (location.count === 0) {
          return trpcFailure(
            "LOCATION_NOT_FOUND",
            "Ubicación no encontrada",
            404,
          );
        }
        return trpcSuccess({ id: input.locationId }, "Ubicación actualizada");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar la ubicación",
          500,
        );
      }
    }),

  archive: protectedProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const managed = await getManagedWorkspace(ctx);
      if (managed.error) return managed.error;

      try {
        const location = await ctx.db.clinicLocation.updateMany({
          where: {
            id: input.locationId,
            clinicId: managed.workspace.clinicId,
            isActive: true,
          },
          data: { isActive: false },
        });
        if (location.count === 0) {
          return trpcFailure(
            "LOCATION_NOT_FOUND",
            "Ubicación no encontrada",
            404,
          );
        }
        return trpcSuccess({ id: input.locationId }, "Ubicación archivada");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible archivar la ubicación",
          500,
        );
      }
    }),
});
