import { describe, expect, it } from "vitest";

import { buildMessageIdempotencyKey, getRetryDelayMs } from "./outbox";

describe("message outbox", () => {
  it("builds a stable idempotency key from the domain event", () => {
    expect(buildMessageIdempotencyKey("APPOINTMENT_BOOKED", "apt_123")).toBe(
      "APPOINTMENT_BOOKED:apt_123",
    );
  });

  it("uses bounded exponential retry delays", () => {
    expect(getRetryDelayMs(1)).toBe(1_000);
    expect(getRetryDelayMs(3)).toBe(4_000);
    expect(getRetryDelayMs(8)).toBe(128_000);
    expect(getRetryDelayMs(99)).toBe(900_000);
  });
});
