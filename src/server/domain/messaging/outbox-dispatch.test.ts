import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MessageOutbox } from "@prisma/client";
import { db } from "~/server/db";
import { dispatchMessageOutbox } from "./outbox";
import { MessagingProviderError } from "./messaging-provider";

vi.mock("~/server/db", () => ({
  db: {
    messageOutbox: { updateMany: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  },
}));
const now = new Date("2026-09-22T12:00:00Z");
const row: MessageOutbox = {
  id: "msg-1",
  clinicId: "clinic-1",
  provider: "sent",
  channel: "WHATSAPP",
  recipient: "+525555555555",
  template: "test",
  payload: { name: "Test" },
  idempotencyKey: "appointment:1",
  correlationId: null,
  providerMessageId: null,
  leaseToken: null,
  leaseUntil: null,
  sandbox: true,
  status: "PENDING",
  attempts: 0,
  nextAttemptAt: now,
  lastAttemptAt: null,
  sentAt: null,
  deliveredAt: null,
  failedAt: null,
  lastErrorCode: null,
  createdAt: now,
  updatedAt: now,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(db.messageOutbox.findMany).mockResolvedValue([row]);
  vi.mocked(db.messageOutbox.updateMany).mockResolvedValue({ count: 1 });
  vi.mocked(db.messageOutbox.update).mockResolvedValue(row);
});
describe("dispatcher durable", () => {
  it("persiste el ID del proveedor y transmite clave estable + sandbox", async () => {
    const send = vi.fn().mockResolvedValue({ providerMessageId: "provider-1" });
    expect(
      await dispatchMessageOutbox(db, { name: "sent", send }, { now }),
    ).toEqual({ sent: 1, failed: 0, deadLettered: 0 });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: row.idempotencyKey,
        sandbox: true,
      }),
    );
    expect(db.messageOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerMessageId: "provider-1",
          status: "SENT",
          leaseToken: null,
        }),
      }),
    );
  });
  it("un worker que pierde el claim no envía", async () => {
    vi.mocked(db.messageOutbox.updateMany).mockResolvedValue({ count: 0 });
    const send = vi.fn();
    await dispatchMessageOutbox(db, { name: "sent", send }, { now });
    expect(send).not.toHaveBeenCalled();
  });
  it("recupera leases vencidos y limita la ventana de idempotencia", async () => {
    vi.mocked(db.messageOutbox.findMany).mockResolvedValue([]);
    await dispatchMessageOutbox(db, { name: "sent", send: vi.fn() }, { now });
    expect(db.messageOutbox.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ status: "PROCESSING" }),
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
    expect(db.messageOutbox.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ status: "DEAD_LETTER" }),
      }),
    );
  });
  it("reintenta fallos transitorios pero no rechazos definitivos", async () => {
    for (const retryable of [true, false]) {
      const send = vi
        .fn()
        .mockRejectedValue(
          new MessagingProviderError("TEST", "safe", retryable),
        );
      const result = await dispatchMessageOutbox(
        db,
        { name: "sent", send },
        { now },
      );
      expect(result).toEqual({
        sent: 0,
        failed: retryable ? 1 : 0,
        deadLettered: retryable ? 0 : 1,
      });
    }
  });
});
