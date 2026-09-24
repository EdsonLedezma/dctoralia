import { randomUUID } from "node:crypto";
import type { PrismaClient, ClinicSubscription } from "@prisma/client";
import { BillingError } from "./billing-error";

export async function withBillingLock<T>(
  db: PrismaClient,
  clinicId: string,
  action: (subscription: ClinicSubscription, token: string) => Promise<T>,
): Promise<T> {
  const token = randomUUID();
  const now = new Date();
  const claimed = await db.clinicSubscription.updateMany({
    where: {
      clinicId,
      OR: [{ billingLockUntil: null }, { billingLockUntil: { lt: now } }],
    },
    data: {
      billingLockToken: token,
      billingLockUntil: new Date(now.getTime() + 120_000),
    },
  });
  if (claimed.count !== 1)
    throw new BillingError(
      "BILLING_BUSY",
      "La facturación está procesando un cambio. Intenta de nuevo en un momento.",
    );
  try {
    const subscription = await db.clinicSubscription.findUniqueOrThrow({
      where: { clinicId },
    });
    return await action(subscription, token);
  } finally {
    await db.clinicSubscription.updateMany({
      where: { clinicId, billingLockToken: token },
      data: { billingLockToken: null, billingLockUntil: null },
    });
  }
}
