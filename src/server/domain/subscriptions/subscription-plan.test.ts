import { describe, expect, it } from "vitest";

import {
  SUBSCRIPTION_PLANS,
  calculateMessagingOverageMxn,
  canAddDoctor,
  canAddLocation,
  getSubscriptionPlan,
  hasWorkspaceAccess,
  resolveSubscriptionEntitlements,
} from "./subscription-plan";

describe("subscription plan catalog", () => {
  it("keeps Pro for a single independent doctor", () => {
    const plan = getSubscriptionPlan("PRO");

    expect(plan.workspaceMode).toBe("SOLO_PRACTICE");
    expect(plan.maxDoctors).toBe(1);
    expect(plan.monthlyPriceMxn).toBe(800);
    expect(plan.includedMessagingMxn).toBe(150);
  });

  it("allows Enterprise and Custom to grow as workspaces", () => {
    expect(canAddDoctor(SUBSCRIPTION_PLANS.ENTERPRISE, 25)).toBe(true);
    expect(canAddLocation(SUBSCRIPTION_PLANS.CUSTOM, 10)).toBe(true);
    expect(SUBSCRIPTION_PLANS.CUSTOM.customDevelopmentEnabled).toBe(true);
    expect(SUBSCRIPTION_PLANS.CUSTOM.extendedMessagingEnabled).toBe(true);
  });

  it("calculates only the Pro messaging overage", () => {
    expect(calculateMessagingOverageMxn(SUBSCRIPTION_PLANS.PRO, 140, 30)).toBe(
      20,
    );
    expect(calculateMessagingOverageMxn(SUBSCRIPTION_PLANS.PRO, 100, 20)).toBe(
      0,
    );
    expect(
      calculateMessagingOverageMxn(SUBSCRIPTION_PLANS.ENTERPRISE, 100, 20),
    ).toBeNull();
  });

  it("keeps persisted overrides explicit for a contracted workspace", () => {
    const plan = resolveSubscriptionEntitlements({
      plan: "ENTERPRISE",
      status: "ACTIVE",
      monthlyPriceMxn: null,
      includedMessagingMxn: 500,
      messagingOverageAllowed: true,
      customDevelopmentEnabled: false,
      extendedMessagingEnabled: true,
    });

    expect(plan.includedMessagingMxn).toBe(500);
    expect(plan.messagingBilling).toBe("BILLABLE_OVERAGE");
    expect(plan.extendedMessagingEnabled).toBe(true);
    expect(hasWorkspaceAccess("ACTIVE")).toBe(true);
    expect(hasWorkspaceAccess("PAUSED")).toBe(false);
  });
});
