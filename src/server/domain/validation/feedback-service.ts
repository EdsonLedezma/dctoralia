import { Prisma, type PrismaClient } from "@prisma/client";

const feedbackSelect = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, name: true, role: true } },
} satisfies Prisma.ValidationFeedbackSelect;

export class FeedbackLimitError extends Error {}

export async function listValidationFeedback(
  db: PrismaClient,
  cursor?: string,
) {
  const notes = await db.validationFeedback.findMany({
    select: feedbackSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: 51,
  });
  const hasMore = notes.length > 50;
  const items = notes.slice(0, 50);
  return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
}

export async function createValidationFeedback(
  db: PrismaClient,
  authorUserId: string,
  body: string,
  now = new Date(),
) {
  return db.$transaction(
    async (tx) => {
      const repeated = await tx.validationFeedback.findFirst({
        where: {
          authorUserId,
          body,
          createdAt: { gte: new Date(now.getTime() - 5 * 60_000) },
        },
        select: feedbackSelect,
      });
      if (repeated) return repeated;
      const recent = await tx.validationFeedback.count({
        where: {
          authorUserId,
          createdAt: { gte: new Date(now.getTime() - 60_000) },
        },
      });
      const daily = await tx.validationFeedback.count({
        where: {
          authorUserId,
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60_000) },
        },
      });
      if (recent >= 2 || daily >= 20)
        throw new FeedbackLimitError(
          "Espera un momento antes de publicar otra nota.",
        );
      return tx.validationFeedback.create({
        data: { authorUserId, body },
        select: feedbackSelect,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
