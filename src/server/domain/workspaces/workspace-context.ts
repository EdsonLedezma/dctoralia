import type { Prisma, PrismaClient } from "@prisma/client";

export type WorkspaceSubscriptionSnapshot = {
  plan: "PRO" | "ENTERPRISE" | "CUSTOM";
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "PAUSED" | "CANCELED";
  monthlyPriceMxn: number | null;
  includedMessagingMxn: number | null;
  messagingOverageAllowed: boolean;
  customDevelopmentEnabled: boolean;
  extendedMessagingEnabled: boolean;
};

export type WorkspaceContext = {
  clinicId: string;
  membershipRole: "OWNER" | "ADMIN" | "DOCTOR" | "RECEPTIONIST";
  clinic: {
    name: string;
    slug: string;
    timezone: string;
  };
  subscription: WorkspaceSubscriptionSnapshot | null;
};

const workspaceMemberSelect = {
  clinicId: true,
  role: true,
  clinic: {
    select: {
      name: true,
      slug: true,
      timezone: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          monthlyPriceMxn: true,
          includedMessagingMxn: true,
          messagingOverageAllowed: true,
          customDevelopmentEnabled: true,
          extendedMessagingEnabled: true,
        },
      },
    },
  },
} satisfies Prisma.ClinicMemberSelect;

type WorkspaceMembership = Prisma.ClinicMemberGetPayload<{
  select: typeof workspaceMemberSelect;
}>;

function toWorkspaceContext(membership: WorkspaceMembership): WorkspaceContext {
  return {
    clinicId: membership.clinicId,
    membershipRole: membership.role,
    clinic: membership.clinic,
    subscription: membership.clinic.subscription,
  };
}

/**
 * Resolves the actor's first workspace membership on the server. A future
 * workspace switcher can make the selected membership explicit, but it must
 * still be checked against this same query and never trusted from the client.
 */
export async function resolveWorkspaceContext(
  db: PrismaClient,
  userId: string,
  clinicId?: string,
): Promise<WorkspaceContext | null> {
  const membership = await db.clinicMember.findFirst({
    where: { userId, ...(clinicId ? { clinicId } : {}) },
    orderBy: { createdAt: "asc" },
    select: workspaceMemberSelect,
  });

  // A revoked/obsolete selection must not hide the actor's other memberships.
  if (!membership && clinicId) return resolveWorkspaceContext(db, userId);
  if (!membership) return null;

  return toWorkspaceContext(membership);
}

export async function resolveWorkspaceContexts(
  db: PrismaClient,
  userId: string,
): Promise<WorkspaceContext[]> {
  const memberships = await db.clinicMember.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: workspaceMemberSelect,
  });

  return memberships.map(toWorkspaceContext);
}
