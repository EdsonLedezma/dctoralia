import type { Prisma } from "@prisma/client";
import {
  canAddDoctor,
  canAddLocation,
  hasWorkspaceAccess,
  resolveSubscriptionEntitlements,
} from "~/server/domain/subscriptions/subscription-plan";

export class WorkspaceCapacityError extends Error {}

export async function assertWorkspaceCapacity(
  tx: Prisma.TransactionClient,
  clinicId: string,
  kind: "doctor" | "location",
  managerId?: string,
) {
  const subscription = await tx.clinicSubscription.findUnique({
    where: { clinicId },
  });
  if (!subscription || !hasWorkspaceAccess(subscription.status))
    throw new WorkspaceCapacityError(
      "El workspace no tiene una suscripción activa.",
    );
  if (managerId) {
    const member = await tx.clinicMember.findUnique({
      where: { clinicId_userId: { clinicId, userId: managerId } },
      select: { role: true },
    });
    if (!member || !["OWNER", "ADMIN"].includes(member.role))
      throw new WorkspaceCapacityError(
        "Tu acceso al workspace cambió. Actualiza la página.",
      );
  }
  const plan = resolveSubscriptionEntitlements(subscription);
  const allowed =
    kind === "doctor"
      ? canAddDoctor(plan, await tx.doctor.count({ where: { clinicId } }))
      : canAddLocation(
          plan,
          await tx.clinicLocation.count({
            where: { clinicId, isActive: true },
          }),
        );
  if (!allowed)
    throw new WorkspaceCapacityError(
      "El plan actual no tiene capacidad disponible.",
    );
}
