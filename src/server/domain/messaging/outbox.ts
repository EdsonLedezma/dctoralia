import type {
  MessageDeliveryStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { randomUUID } from "node:crypto";

import {
  MessagingProviderError,
  type MessagingProvider,
} from "./messaging-provider";

type MessageOutboxWriter = Pick<PrismaClient, "messageOutbox">;

export type EnqueueMessageInput = {
  clinicId?: string;
  channel: "SMS" | "WHATSAPP" | "RCS";
  recipient: string;
  template: string;
  payload: Prisma.InputJsonValue;
  idempotencyKey: string;
  correlationId?: string;
  sandbox?: boolean;
};

export function buildMessageIdempotencyKey(
  eventType: string,
  aggregateId: string,
): string {
  return `${eventType}:${aggregateId}`;
}

export async function enqueueMessage(
  db: MessageOutboxWriter,
  input: EnqueueMessageInput,
) {
  return db.messageOutbox.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {},
    create: {
      clinicId: input.clinicId,
      channel: input.channel,
      recipient: input.recipient,
      template: input.template,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
      sandbox: input.sandbox ?? true,
    },
  });
}

export function getRetryDelayMs(attempt: number): number {
  const safeAttempt = Math.max(1, Math.min(attempt, 11));
  return Math.min(15 * 60_000, 1_000 * 2 ** (safeAttempt - 1));
}

type DispatcherDb = Pick<PrismaClient, "messageOutbox">;

export async function dispatchMessageOutbox(
  db: DispatcherDb,
  provider: MessagingProvider,
  options: { limit?: number; maxAttempts?: number; now?: Date } = {},
) {
  const limit = options.limit ?? 25;
  const maxAttempts = options.maxAttempts ?? 5;
  const now = options.now ?? new Date();
  await db.messageOutbox.updateMany({
    where: {
      provider: provider.name,
      status: "PROCESSING",
      OR: [{ leaseUntil: { lte: now } }, { leaseUntil: null }],
    },
    data: { status: "FAILED", leaseToken: null, leaseUntil: null },
  });
  await db.messageOutbox.updateMany({
    where: {
      provider: provider.name,
      status: { in: ["PENDING", "FAILED"] },
      OR: [
        { attempts: { gte: maxAttempts } },
        {
          attempts: { gt: 0 },
          createdAt: { lt: new Date(now.getTime() - 23 * 60 * 60_000) },
        },
      ],
    },
    data: {
      status: "DEAD_LETTER",
      failedAt: now,
      lastErrorCode: "RETRY_WINDOW_EXHAUSTED",
    },
  });
  const candidates = await db.messageOutbox.findMany({
    where: {
      provider: provider.name,
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  let deadLettered = 0;

  for (const candidate of candidates) {
    const leaseToken = randomUUID();
    const claim = await db.messageOutbox.updateMany({
      where: {
        id: candidate.id,
        attempts: candidate.attempts,
        nextAttemptAt: { lte: now },
        status: { in: ["PENDING", "FAILED"] },
      },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
        lastAttemptAt: now,
        leaseToken,
        leaseUntil: new Date(Date.now() + 120_000),
      },
    });
    if (claim.count !== 1) continue;

    const attempt = candidate.attempts + 1;
    try {
      const delivery = await provider.send({
        channel: candidate.channel,
        recipient: candidate.recipient,
        template: candidate.template,
        payload: candidate.payload,
        idempotencyKey: candidate.idempotencyKey,
        sandbox: candidate.sandbox,
      });
      await db.messageOutbox.update({
        where: { id: candidate.id, leaseToken, status: "PROCESSING" },
        data: {
          provider: provider.name,
          status: "SENT",
          providerMessageId: delivery.providerMessageId,
          leaseToken: null,
          leaseUntil: null,
          sentAt: now,
          lastErrorCode: null,
        },
      });
      sent += 1;
    } catch (error) {
      const providerError =
        error instanceof MessagingProviderError
          ? error
          : new MessagingProviderError("PROVIDER_ERROR", "Error del proveedor");
      const terminal = !providerError.retryable || attempt >= maxAttempts;
      const status: MessageDeliveryStatus = terminal ? "DEAD_LETTER" : "FAILED";
      await db.messageOutbox.update({
        where: { id: candidate.id, leaseToken, status: "PROCESSING" },
        data: {
          provider: provider.name,
          status,
          failedAt: terminal ? now : null,
          nextAttemptAt: new Date(now.getTime() + getRetryDelayMs(attempt)),
          lastErrorCode: providerError.code,
          leaseToken: null,
          leaseUntil: null,
        },
      });
      if (terminal) deadLettered += 1;
      else failed += 1;
    }
  }

  return { sent, failed, deadLettered };
}
