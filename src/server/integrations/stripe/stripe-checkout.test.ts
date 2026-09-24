import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "~/server/db";
import { createCheckout } from "./stripe-checkout";

const mocks = vi.hoisted(() => ({
  price: vi.fn(),
  customer: vi.fn(),
  create: vi.fn(),
  retrieve: vi.fn(),
  subscriptions: vi.fn(),
  local: {
    id: "subscription-1",
    checkoutAttempt: 0,
    checkoutSessionId: null as string | null,
    providerCustomerId: null as string | null,
    providerSubscriptionId: null as string | null,
    status: "PAUSED",
  },
}));
vi.mock("~/server/db", () => ({
  db: {
    clinicSubscription: { update: vi.fn() },
    doctor: { count: vi.fn() },
    clinicLocation: { count: vi.fn() },
  },
}));
vi.mock("./stripe-client", () => ({
  stripeClient: () => ({
    prices: { retrieve: mocks.price },
    customers: { create: mocks.customer },
    checkout: { sessions: { create: mocks.create, retrieve: mocks.retrieve } },
    subscriptions: { list: mocks.subscriptions },
  }),
  billingPrices: () => ({
    PRO: "price_pro",
    ENTERPRISE: undefined,
    CUSTOM: undefined,
  }),
  billingReturnUrl: () => "https://dopilot.example/dashboard/workspace",
}));
vi.mock("~/server/domain/subscriptions/billing-lock", () => ({
  withBillingLock: (
    _db: unknown,
    _clinicId: string,
    action: (local: typeof mocks.local, token: string) => Promise<unknown>,
  ) => action(mocks.local, "token"),
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.local = {
    id: "subscription-1",
    checkoutAttempt: 0,
    checkoutSessionId: null,
    providerCustomerId: null,
    providerSubscriptionId: null,
    status: "PAUSED",
  };
  mocks.price.mockResolvedValue({
    active: true,
    currency: "mxn",
    unit_amount: 80000,
    recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
  });
  mocks.customer.mockResolvedValue({ id: "customer-1" });
  mocks.subscriptions.mockResolvedValue({ data: [] });
  mocks.create.mockResolvedValue({
    id: "checkout-1",
    url: "https://checkout.stripe.com/test",
  });
  vi.mocked(db.doctor.count).mockResolvedValue(1);
  vi.mocked(db.clinicLocation.count).mockResolvedValue(1);
});
describe("Checkout sin cobros reales", () => {
  it("no duplica suscripciones si el webhook aún no actualizó la base", async () => {
    mocks.subscriptions.mockResolvedValue({ data: [{ status: "active" }] });
    await expect(createCheckout(db, "clinic-1", "PRO")).rejects.toThrow(
      "ya tiene una suscripción",
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("usa precio del servidor, MXN y claves idempotentes", async () => {
    await expect(createCheckout(db, "clinic-1", "PRO")).resolves.toEqual({
      url: "https://checkout.stripe.com/test",
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "customer-1",
        line_items: [{ price: "price_pro", quantity: 1 }],
      }),
      { idempotencyKey: "checkout-subscription-1-0" },
    );
    expect(db.clinicSubscription.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });
  it("reutiliza una sesión abierta", async () => {
    mocks.local.checkoutSessionId = "checkout-1";
    mocks.retrieve.mockResolvedValue({
      status: "open",
      url: "https://checkout.stripe.com/existing",
      metadata: { plan: "PRO" },
    });
    await expect(createCheckout(db, "clinic-1", "PRO")).resolves.toEqual({
      url: "https://checkout.stripe.com/existing",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("no abre otro cobro mientras espera webhook", async () => {
    mocks.local.checkoutSessionId = "checkout-1";
    mocks.retrieve.mockResolvedValue({ status: "complete" });
    await expect(createCheckout(db, "clinic-1", "PRO")).rejects.toThrow(
      "confirmación",
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("bloquea precios incorrectos y planes sin cotización", async () => {
    mocks.price.mockResolvedValue({
      active: true,
      currency: "usd",
      unit_amount: 80000,
    });
    await expect(createCheckout(db, "clinic-1", "PRO")).rejects.toThrow(
      "contrato",
    );
    await expect(createCheckout(db, "clinic-1", "CUSTOM")).rejects.toThrow(
      "cotización",
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("evita bajar a Pro un workspace con varios doctores", async () => {
    vi.mocked(db.doctor.count).mockResolvedValue(2);
    await expect(createCheckout(db, "clinic-1", "PRO")).rejects.toThrow(
      "un doctor",
    );
  });
});
