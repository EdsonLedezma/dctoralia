import type Stripe from "stripe";
import type { PrismaClient, SubscriptionPlan } from "@prisma/client";
import { withBillingLock } from "~/server/domain/subscriptions/billing-lock";
import { subscriptionStatus } from "~/server/domain/subscriptions/billing-policy";
import { getSubscriptionPlan } from "~/server/domain/subscriptions/subscription-plan";
import { billingPrices, stripeClient } from "./stripe-client";

export async function processStripeWebhook(
  db: PrismaClient,
  event: Stripe.Event,
) {
  if (
    event.type !== "customer.subscription.created" &&
    event.type !== "customer.subscription.updated" &&
    event.type !== "customer.subscription.deleted"
  )
    return;
  if (
    await db.billingWebhookEvent.findUnique({
      where: { id: event.id },
      select: { id: true },
    })
  )
    return;
  const incoming = event.data.object;
  const customerId =
    typeof incoming.customer === "string"
      ? incoming.customer
      : incoming.customer.id;
  const clinicId = incoming.metadata.clinicId;
  if (!clinicId) return; // Not a Dopilot subscription.
  const local = await db.clinicSubscription.findUnique({
    where: { clinicId },
    select: { providerCustomerId: true },
  });
  if (!local || local.providerCustomerId !== customerId)
    throw new Error("BILLING_CUSTOMER_MISMATCH");

  await withBillingLock(db, clinicId, async (current, token) => {
    // Fetch while holding the shared checkout/webhook lease. Arrival order is not authoritative.
    const subscription = await stripeClient().subscriptions.retrieve(
      incoming.id,
    );
    const item = subscription.items.data[0];
    const prices = billingPrices();
    const plan = (Object.keys(prices) as SubscriptionPlan[]).find(
      (key) => prices[key] && prices[key] === item?.price.id,
    );
    if (
      !plan ||
      !item ||
      subscription.items.data.length !== 1 ||
      item.quantity !== 1
    )
      throw new Error("BILLING_UNRECOGNIZED_PRICE");
    if (
      item.price.currency !== "mxn" ||
      item.price.recurring?.interval !== "month" ||
      item.price.recurring.interval_count !== 1 ||
      (plan === "PRO" && item.price.unit_amount !== 80_000)
    )
      throw new Error("BILLING_INVALID_PRICE");
    if (
      current.providerSubscriptionId &&
      current.providerSubscriptionId !== subscription.id &&
      current.status !== "CANCELED"
    ) {
      // Old canceled subscription retries must not replace the new subscription.
      if (subscription.status === "canceled") return;
      throw new Error("BILLING_SUBSCRIPTION_CONFLICT");
    }
    const definition = getSubscriptionPlan(plan);
    const status = subscription.pause_collection
      ? "PAUSED"
      : subscriptionStatus(subscription.status);
    const periodStart = new Date(item.current_period_start * 1000);
    const periodEnd = new Date(item.current_period_end * 1000);
    await db.$transaction(async (tx) => {
      if (
        await tx.billingWebhookEvent.findUnique({
          where: { id: event.id },
          select: { id: true },
        })
      )
        return;
      await tx.clinicSubscription.update({
        where: {
          id: current.id,
          billingLockToken: token,
          billingLockUntil: { gt: new Date() },
        },
        data: {
          provider: "stripe",
          providerSubscriptionId: subscription.id,
          plan,
          status,
          monthlyPriceMxn:
            item.price.unit_amount !== null &&
            item.price.unit_amount % 100 === 0
              ? item.price.unit_amount / 100
              : null,
          includedMessagingMxn:
            plan === "PRO" || current.plan !== plan
              ? definition.includedMessagingMxn
              : current.includedMessagingMxn,
          customDevelopmentEnabled: definition.customDevelopmentEnabled,
          extendedMessagingEnabled: definition.extendedMessagingEnabled,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          ...(status === "CANCELED"
            ? { checkoutSessionId: null, checkoutAttempt: { increment: 1 } }
            : {}),
        },
      });
      await tx.subscriptionUsagePeriod.upsert({
        where: {
          clinicSubscriptionId_periodStart: {
            clinicSubscriptionId: current.id,
            periodStart,
          },
        },
        create: { clinicSubscriptionId: current.id, periodStart, periodEnd },
        update: { periodEnd },
      });
      await tx.billingWebhookEvent.create({
        data: { id: event.id, eventType: event.type },
      });
    });
  });
}
