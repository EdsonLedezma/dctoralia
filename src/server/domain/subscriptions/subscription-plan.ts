import type {
  ClinicSubscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";

export type WorkspaceMode = "SOLO_PRACTICE" | "WORKSPACE";
export type CustomerProfile = "INDEPENDENT_DOCTOR" | "CLINIC_OR_HOSPITAL";
export type MessagingBilling = "BILLABLE_OVERAGE" | "CONTRACTED";

export type SubscriptionPlanDefinition = {
  code: SubscriptionPlan;
  label: string;
  customerProfile: CustomerProfile;
  workspaceMode: WorkspaceMode;
  monthlyPriceMxn: number | null;
  maxDoctors: number | null;
  maxLocations: number | null;
  includedMessagingMxn: number | null;
  messagingBilling: MessagingBilling;
  customDevelopmentEnabled: boolean;
  extendedMessagingEnabled: boolean;
};

/**
 * Commercial rules live in the domain layer so billing providers and UI
 * surfaces consume the same contract. Prices are expressed in whole MXN;
 * provider adapters can convert them to the smallest currency unit later.
 */
export const SUBSCRIPTION_PLANS = {
  PRO: {
    code: "PRO",
    label: "Pro",
    customerProfile: "INDEPENDENT_DOCTOR",
    workspaceMode: "SOLO_PRACTICE",
    monthlyPriceMxn: 800,
    maxDoctors: 1,
    maxLocations: 1,
    includedMessagingMxn: 150,
    messagingBilling: "BILLABLE_OVERAGE",
    customDevelopmentEnabled: false,
    extendedMessagingEnabled: false,
  },
  ENTERPRISE: {
    code: "ENTERPRISE",
    label: "Enterprise",
    customerProfile: "CLINIC_OR_HOSPITAL",
    workspaceMode: "WORKSPACE",
    monthlyPriceMxn: null,
    maxDoctors: null,
    maxLocations: null,
    includedMessagingMxn: null,
    messagingBilling: "CONTRACTED",
    customDevelopmentEnabled: false,
    extendedMessagingEnabled: false,
  },
  CUSTOM: {
    code: "CUSTOM",
    label: "Custom",
    customerProfile: "CLINIC_OR_HOSPITAL",
    workspaceMode: "WORKSPACE",
    monthlyPriceMxn: null,
    maxDoctors: null,
    maxLocations: null,
    includedMessagingMxn: null,
    messagingBilling: "CONTRACTED",
    customDevelopmentEnabled: true,
    extendedMessagingEnabled: true,
  },
} satisfies Record<SubscriptionPlan, SubscriptionPlanDefinition>;

export function getSubscriptionPlan(
  plan: SubscriptionPlan,
): SubscriptionPlanDefinition {
  return SUBSCRIPTION_PLANS[plan];
}

type SubscriptionSnapshot = Pick<
  ClinicSubscription,
  | "plan"
  | "status"
  | "monthlyPriceMxn"
  | "includedMessagingMxn"
  | "messagingOverageAllowed"
  | "customDevelopmentEnabled"
  | "extendedMessagingEnabled"
>;

export function resolveSubscriptionEntitlements(
  subscription: SubscriptionSnapshot,
): SubscriptionPlanDefinition {
  const base = getSubscriptionPlan(subscription.plan);

  return {
    ...base,
    monthlyPriceMxn: subscription.monthlyPriceMxn ?? base.monthlyPriceMxn,
    includedMessagingMxn:
      subscription.includedMessagingMxn ?? base.includedMessagingMxn,
    messagingBilling: subscription.messagingOverageAllowed
      ? "BILLABLE_OVERAGE"
      : base.messagingBilling,
    customDevelopmentEnabled:
      subscription.customDevelopmentEnabled || base.customDevelopmentEnabled,
    extendedMessagingEnabled:
      subscription.extendedMessagingEnabled || base.extendedMessagingEnabled,
  };
}

export function hasWorkspaceAccess(status: SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "TRIALING";
}

export function canAddDoctor(
  plan: SubscriptionPlanDefinition,
  currentDoctorCount: number,
): boolean {
  if (currentDoctorCount < 0) return false;
  return plan.maxDoctors === null || currentDoctorCount < plan.maxDoctors;
}

export function canAddLocation(
  plan: SubscriptionPlanDefinition,
  currentLocationCount: number,
): boolean {
  if (currentLocationCount < 0) return false;
  return plan.maxLocations === null || currentLocationCount < plan.maxLocations;
}

export function calculateMessagingOverageMxn(
  plan: SubscriptionPlanDefinition,
  usedMxn: number,
  nextChargeMxn: number,
): number | null {
  if (usedMxn < 0 || nextChargeMxn < 0) return null;
  if (plan.messagingBilling === "CONTRACTED") return null;

  const included = plan.includedMessagingMxn ?? 0;
  return Math.max(0, usedMxn + nextChargeMxn - included);
}
