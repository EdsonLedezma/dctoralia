import { describe, expect, it } from "vitest";

import { SUBSCRIPTION_PLANS } from "./subscription-plan";
import {
  canBillMessagingOverage,
  canCreateLocation,
  canInviteDoctor,
  canJoinDoctorWorkspace,
  canManageWorkspace,
  canRequestCustomDevelopment,
  canUseExtendedMessaging,
  type WorkspacePolicyContext,
} from "./workspace-policy";

const enterpriseContext: WorkspacePolicyContext = {
  platformRole: "PATIENT",
  membershipRole: "OWNER",
  subscriptionStatus: "ACTIVE",
  plan: SUBSCRIPTION_PLANS.ENTERPRISE,
  currentDoctorCount: 12,
  currentLocationCount: 3,
};

describe("workspace subscription policy", () => {
  it("lets an Enterprise owner manage a growing workspace", () => {
    expect(canManageWorkspace(enterpriseContext)).toBe(true);
    expect(canInviteDoctor(enterpriseContext)).toBe(true);
    expect(canJoinDoctorWorkspace(enterpriseContext)).toBe(true);
    expect(canCreateLocation(enterpriseContext)).toBe(true);
  });

  it("keeps Pro limited to one doctor and one location", () => {
    const proContext: WorkspacePolicyContext = {
      ...enterpriseContext,
      membershipRole: "OWNER",
      subscriptionStatus: "ACTIVE",
      plan: SUBSCRIPTION_PLANS.PRO,
      currentDoctorCount: 1,
      currentLocationCount: 1,
    };

    expect(canInviteDoctor(proContext)).toBe(false);
    expect(canCreateLocation(proContext)).toBe(false);
    expect(canBillMessagingOverage(proContext)).toBe(true);
  });

  it("reserves Custom capabilities for active Custom workspaces", () => {
    const customContext: WorkspacePolicyContext = {
      ...enterpriseContext,
      plan: SUBSCRIPTION_PLANS.CUSTOM,
    };

    expect(canUseExtendedMessaging(customContext)).toBe(true);
    expect(canRequestCustomDevelopment(customContext)).toBe(true);
    expect(
      canManageWorkspace({ ...customContext, subscriptionStatus: "PAUSED" }),
    ).toBe(false);
    expect(
      canUseExtendedMessaging({
        ...customContext,
        subscriptionStatus: "PAST_DUE",
      }),
    ).toBe(false);
  });
});
