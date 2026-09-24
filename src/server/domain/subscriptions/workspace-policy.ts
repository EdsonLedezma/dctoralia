import type {
  ClinicMemberRole,
  Role,
  SubscriptionStatus,
} from "@prisma/client";

import {
  canAddDoctor,
  canAddLocation,
  hasWorkspaceAccess,
  type SubscriptionPlanDefinition,
} from "./subscription-plan";

export type WorkspacePolicyContext = {
  platformRole: Role;
  membershipRole: ClinicMemberRole | null;
  subscriptionStatus: SubscriptionStatus;
  plan: SubscriptionPlanDefinition;
  currentDoctorCount: number;
  currentLocationCount: number;
};

function isWorkspaceManager(context: WorkspacePolicyContext): boolean {
  return (
    context.platformRole === "ADMIN" ||
    context.membershipRole === "OWNER" ||
    context.membershipRole === "ADMIN"
  );
}

function hasActiveWorkspace(context: WorkspacePolicyContext): boolean {
  return hasWorkspaceAccess(context.subscriptionStatus);
}

export function canManageWorkspace(context: WorkspacePolicyContext): boolean {
  return hasActiveWorkspace(context) && isWorkspaceManager(context);
}

export function canInviteDoctor(context: WorkspacePolicyContext): boolean {
  return (
    canManageWorkspace(context) &&
    canAddDoctor(context.plan, context.currentDoctorCount)
  );
}

export function canJoinDoctorWorkspace(
  context: WorkspacePolicyContext,
): boolean {
  return (
    hasActiveWorkspace(context) &&
    canAddDoctor(context.plan, context.currentDoctorCount)
  );
}

export function canCreateLocation(context: WorkspacePolicyContext): boolean {
  return (
    canManageWorkspace(context) &&
    canAddLocation(context.plan, context.currentLocationCount)
  );
}

export function canUseExtendedMessaging(
  context: WorkspacePolicyContext,
): boolean {
  return hasActiveWorkspace(context) && context.plan.extendedMessagingEnabled;
}

export function canRequestCustomDevelopment(
  context: WorkspacePolicyContext,
): boolean {
  return hasActiveWorkspace(context) && context.plan.customDevelopmentEnabled;
}

export function canBillMessagingOverage(
  context: WorkspacePolicyContext,
): boolean {
  return (
    hasActiveWorkspace(context) &&
    context.plan.messagingBilling === "BILLABLE_OVERAGE"
  );
}
