import type { SubscriptionStatus } from "@prisma/client";

export function subscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "PAUSED";
  }
}

export function canManageBilling(role: string | undefined): boolean {
  return role === "OWNER";
}
