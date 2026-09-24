import { createHash } from "node:crypto";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { deliveryTransition } from "~/server/domain/messaging/delivery-policy";

const eventSchema = z.object({
  event: z.string(),
  payload: z.object({
    message_id: z.string().min(1),
    message_status: z.string().optional(),
  }),
});

export async function processSentWebhook(db: PrismaClient, body: unknown) {
  const event = eventSchema.safeParse(body);
  if (!event.success || !event.data.payload.message_status) return;
  const { message_id: messageId, message_status: status } = event.data.payload;
  // Business identity comes from signed content, not an unsigned event-id header.
  const externalEventId = createHash("sha256")
    .update(`${messageId}:${status}`)
    .digest("hex");
  await db.$transaction(
    async (tx) => {
      const existing = await tx.messageInbox.findUnique({
        where: {
          provider_externalEventId: { provider: "sent", externalEventId },
        },
        select: { id: true },
      });
      if (existing) return;
      const message = await tx.messageOutbox.findUnique({
        where: { providerMessageId: messageId },
        select: { id: true, clinicId: true, status: true },
      });
      // A callback can beat persistence of the send response. Ask the provider to retry.
      if (!message) throw new Error("MESSAGE_NOT_YET_TRACKED");
      const next = deliveryTransition(message.status, status);
      if (next)
        await tx.messageOutbox.update({
          where: { id: message.id },
          data: {
            status: next,
            ...(["DELIVERED", "READ"].includes(next)
              ? { deliveredAt: new Date() }
              : {}),
            ...(next === "DEAD_LETTER"
              ? { failedAt: new Date(), lastErrorCode: status }
              : {}),
          },
        });
      await tx.messageInbox.create({
        data: {
          provider: "sent",
          externalEventId,
          clinicId: message.clinicId,
          eventType: event.data.event,
          signatureVerified: true,
          processedAt: new Date(),
          // No message text, phone, medical information or raw provider payload.
          payload: { messageId, status },
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}
