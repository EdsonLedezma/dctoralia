import Stripe from "stripe";
import { env } from "~/env";
import { BillingError } from "~/server/domain/subscriptions/billing-error";

export function stripeClient() {
  if (!env.STRIPE_SECRET_KEY)
    throw new BillingError(
      "BILLING_NOT_CONFIGURED",
      "La facturación aún no está configurada.",
      503,
    );
  return new Stripe(env.STRIPE_SECRET_KEY, {
    timeout: 10_000,
    maxNetworkRetries: 1,
  });
}

export function billingReturnUrl() {
  if (!env.APP_URL)
    throw new BillingError(
      "BILLING_NOT_CONFIGURED",
      "Falta configurar la URL de la aplicación.",
      503,
    );
  return new URL("/dashboard/workspace", env.APP_URL).toString();
}

export function billingPrices() {
  return {
    PRO: env.STRIPE_PRICE_PRO,
    ENTERPRISE: env.STRIPE_PRICE_ENTERPRISE,
    CUSTOM: env.STRIPE_PRICE_CUSTOM,
  };
}
