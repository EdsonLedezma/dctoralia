import type { PrismaClient, SubscriptionPlan } from "@prisma/client";
import { BillingError } from "~/server/domain/subscriptions/billing-error";
import { withBillingLock } from "~/server/domain/subscriptions/billing-lock";
import { billingPrices, billingReturnUrl, stripeClient } from "./stripe-client";

export async function createCheckout(
  db: PrismaClient,
  clinicId: string,
  plan: SubscriptionPlan,
) {
  const stripe = stripeClient();
  const priceId = billingPrices()[plan];
  if (!priceId)
    throw new BillingError(
      "PLAN_NOT_CONFIGURED",
      "Este plan requiere una cotización y configuración de precio.",
      503,
    );
  const returnUrl = billingReturnUrl();
  // Prices are selected by the server, never supplied by the browser.
  const price = await stripe.prices.retrieve(priceId);
  if (
    !price.active ||
    price.currency !== "mxn" ||
    price.recurring?.interval !== "month" ||
    price.recurring.interval_count !== 1 ||
    price.recurring.usage_type !== "licensed" ||
    price.unit_amount === null ||
    price.unit_amount % 100 !== 0 ||
    (plan === "PRO" && price.unit_amount !== 80_000)
  ) {
    throw new BillingError(
      "INVALID_PRICE_CONFIGURATION",
      "El precio de Stripe no coincide con el contrato mensual en MXN.",
      503,
    );
  }
  return withBillingLock(db, clinicId, async (local, token) => {
    if (local.providerSubscriptionId && local.status !== "CANCELED")
      throw new BillingError(
        "SUBSCRIPTION_EXISTS",
        "Administra la suscripción existente desde el portal.",
      );
    if (plan === "PRO") {
      const [doctors, locations] = await Promise.all([
        db.doctor.count({ where: { clinicId } }),
        db.clinicLocation.count({ where: { clinicId, isActive: true } }),
      ]);
      if (doctors > 1 || locations > 1)
        throw new BillingError(
          "PRO_LIMIT",
          "Pro admite un doctor y un consultorio.",
        );
    }
    let attempt = local.checkoutAttempt;
    if (local.checkoutSessionId) {
      const existing = await stripe.checkout.sessions.retrieve(
        local.checkoutSessionId,
      );
      if (existing.status === "open" && existing.url) {
        if (existing.metadata?.plan !== plan)
          throw new BillingError(
            "CHECKOUT_ALREADY_OPEN",
            "Ya tienes un Checkout abierto para otro plan. Complétalo o espera a que expire.",
          );
        return { url: existing.url };
      }
      if (existing.status === "complete")
        throw new BillingError(
          "PAYMENT_PROCESSING",
          "Estamos esperando la confirmación de Stripe.",
        );
      attempt += 1;
      await db.clinicSubscription.update({
        where: { id: local.id, billingLockToken: token },
        data: { checkoutAttempt: attempt, checkoutSessionId: null },
      });
    }
    const customerId =
      local.providerCustomerId ??
      (
        await stripe.customers.create(
          { metadata: { clinicId } },
          { idempotencyKey: `customer-${local.id}` },
        )
      ).id;
    await db.clinicSubscription.update({
      where: { id: local.id, billingLockToken: token },
      data: { provider: "stripe", providerCustomerId: customerId },
    });
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });
    if (
      existingSubscriptions.data.some(
        (item) =>
          item.status !== "canceled" && item.status !== "incomplete_expired",
      )
    ) {
      throw new BillingError(
        "PAYMENT_PROCESSING",
        "Stripe ya tiene una suscripción para este workspace. Espera la sincronización o revisa el portal.",
      );
    }
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: clinicId,
        metadata: { clinicId, plan },
        subscription_data: { metadata: { clinicId, plan } },
        success_url: `${returnUrl}?checkout=returned`,
        cancel_url: returnUrl,
      },
      { idempotencyKey: `checkout-${local.id}-${attempt}` },
    );
    if (!session.url)
      throw new BillingError(
        "CHECKOUT_UNAVAILABLE",
        "Stripe no pudo abrir Checkout.",
        502,
      );
    await db.clinicSubscription.update({
      where: { id: local.id, billingLockToken: token },
      data: { checkoutSessionId: session.id },
    });
    return { url: session.url };
  });
}

export async function createBillingPortal(db: PrismaClient, clinicId: string) {
  const subscription = await db.clinicSubscription.findUnique({
    where: { clinicId },
    select: { providerCustomerId: true },
  });
  if (!subscription?.providerCustomerId)
    throw new BillingError(
      "CUSTOMER_NOT_FOUND",
      "Primero inicia una suscripción.",
      404,
    );
  const session = await stripeClient().billingPortal.sessions.create({
    customer: subscription.providerCustomerId,
    return_url: billingReturnUrl(),
  });
  return { url: session.url };
}
