import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { BillingError } from "~/server/domain/subscriptions/billing-error";
import { canManageBilling } from "~/server/domain/subscriptions/billing-policy";
import {
  createBillingPortal,
  createCheckout,
} from "~/server/integrations/stripe/stripe-checkout";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

function billingFailure(error: unknown) {
  return error instanceof BillingError
    ? trpcFailure(error.code, error.message, error.status)
    : trpcFailure(
        "BILLING_UNAVAILABLE",
        "No pudimos conectar con facturación. Intenta nuevamente.",
        503,
      );
}

export const billingRouter = createTRPCRouter({
  checkout: protectedProcedure
    .input(z.object({ plan: z.enum(["PRO", "ENTERPRISE", "CUSTOM"]) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await ctx.getWorkspace();
        if (!workspace || !canManageBilling(workspace.membershipRole))
          return trpcFailure(
            "BILLING_FORBIDDEN",
            "Solo el propietario puede administrar la suscripción.",
            403,
          );
        return trpcSuccess(
          await createCheckout(ctx.db, workspace.clinicId, input.plan),
          "Checkout preparado",
        );
      } catch (error) {
        return billingFailure(error);
      }
    }),
  portal: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const workspace = await ctx.getWorkspace();
      if (!workspace || !canManageBilling(workspace.membershipRole))
        return trpcFailure(
          "BILLING_FORBIDDEN",
          "Solo el propietario puede administrar la suscripción.",
          403,
        );
      return trpcSuccess(
        await createBillingPortal(ctx.db, workspace.clinicId),
        "Portal preparado",
      );
    } catch (error) {
      return billingFailure(error);
    }
  }),
  summary: protectedProcedure.query(async ({ ctx }) => {
    try {
      const workspace = await ctx.getWorkspace();
      if (!workspace || !canManageBilling(workspace.membershipRole))
        return trpcFailure(
          "BILLING_FORBIDDEN",
          "Solo el propietario puede consultar facturación.",
          403,
        );
      const subscription = await ctx.db.clinicSubscription.findUnique({
        where: { clinicId: workspace.clinicId },
        select: {
          plan: true,
          status: true,
          monthlyPriceMxn: true,
          includedMessagingMxn: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          providerCustomerId: true,
          providerSubscriptionId: true,
        },
      });
      if (!subscription)
        return trpcFailure(
          "SUBSCRIPTION_NOT_FOUND",
          "Configura primero tu workspace.",
          404,
        );
      const { providerCustomerId, providerSubscriptionId, ...summary } =
        subscription;
      return trpcSuccess(
        {
          ...summary,
          hasCustomer: !!providerCustomerId,
          hasSubscription: !!providerSubscriptionId,
        },
        "Suscripción recuperada",
      );
    } catch (error) {
      return billingFailure(error);
    }
  }),
});
