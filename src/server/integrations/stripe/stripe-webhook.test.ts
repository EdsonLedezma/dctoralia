import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "~/server/db";
import { processStripeWebhook } from "./stripe-webhook";

const mocks = vi.hoisted(() => ({
  eventLookup: vi.fn(),
  eventCreate: vi.fn(),
  update: vi.fn(),
  period: vi.fn(),
  retrieve: vi.fn(),
  subscriptionLookup: vi.fn(),
  local: {
    id: "local-1",
    plan: "PRO",
    status: "ACTIVE",
    providerSubscriptionId: "sub-1",
    includedMessagingMxn: 150,
  },
}));
vi.mock("~/server/db", () => {
  const tx = {
    billingWebhookEvent: {
      findUnique: mocks.eventLookup,
      create: mocks.eventCreate,
    },
    clinicSubscription: {
      update: mocks.update,
      findUnique: mocks.subscriptionLookup,
    },
    subscriptionUsagePeriod: { upsert: mocks.period },
  };
  return {
    db: {
      ...tx,
      $transaction: (action: (value: typeof tx) => Promise<unknown>) =>
        action(tx),
    },
  };
});
vi.mock("./stripe-client", () => ({
  stripeClient: () => ({ subscriptions: { retrieve: mocks.retrieve } }),
  billingPrices: () => ({ PRO: "price_pro" }),
}));
vi.mock("~/server/domain/subscriptions/billing-lock", () => ({
  withBillingLock: (
    _db: unknown,
    _clinic: string,
    action: (local: typeof mocks.local, token: string) => Promise<unknown>,
  ) => action(mocks.local, "lease-1"),
}));

// Verify the fixture through the real SDK signature parser; no network is used.
function eventFixture() {
  const stripe = new Stripe("sk_test_fixture_only");
  const payload = JSON.stringify({
    id: "evt-1",
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub-1",
        customer: "cus-1",
        metadata: { clinicId: "clinic-1" },
        status: "active",
      },
    },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: "test_secret",
  });
  return stripe.webhooks.constructEvent(payload, signature, "test_secret");
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.subscriptionLookup.mockResolvedValue({ providerCustomerId: "cus-1" });
  mocks.eventLookup.mockResolvedValue(null);
  mocks.retrieve.mockResolvedValue({
    id: "sub-1",
    status: "past_due",
    pause_collection: null,
    cancel_at_period_end: false,
    items: {
      data: [
        {
          quantity: 1,
          current_period_start: 1800000000,
          current_period_end: 1802592000,
          price: {
            id: "price_pro",
            currency: "mxn",
            unit_amount: 80000,
            recurring: { interval: "month", interval_count: 1 },
          },
        },
      ],
    },
  });
});
describe("sincronización Stripe", () => {
  it("usa estado actual del proveedor, no el snapshot recibido fuera de orden", async () => {
    await processStripeWebhook(db, eventFixture());
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ billingLockToken: "lease-1" }),
        data: expect.objectContaining({
          status: "PAST_DUE",
          includedMessagingMxn: 150,
        }),
      }),
    );
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: { id: "evt-1", eventType: "customer.subscription.updated" },
    });
  });
  it("omite eventos ya procesados", async () => {
    mocks.eventLookup.mockResolvedValue({ id: "evt-1" });
    await processStripeWebhook(db, eventFixture());
    expect(mocks.retrieve).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rechaza un cliente ajeno al workspace", async () => {
    mocks.subscriptionLookup.mockResolvedValue({
      providerCustomerId: "other-customer",
    });
    await expect(processStripeWebhook(db, eventFixture())).rejects.toThrow(
      "MISMATCH",
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("no confirma un evento si falla la persistencia", async () => {
    mocks.update.mockRejectedValue(new Error("database unavailable"));
    await expect(processStripeWebhook(db, eventFixture())).rejects.toThrow(
      "database unavailable",
    );
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });
});
