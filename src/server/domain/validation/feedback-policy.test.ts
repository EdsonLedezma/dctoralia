import { describe, expect, it } from "vitest";
import { validationFeedbackInput, validationWindow } from "./feedback-policy";

describe("validation feedback policy", () => {
  it("closes the temporary window at the configured instant", () => {
    expect(
      validationWindow(
        "true",
        "2026-11-22T05:59:59Z",
        new Date("2026-11-22T05:59:58Z"),
      ).enabled,
    ).toBe(true);
    expect(
      validationWindow(
        "true",
        "2026-11-22T05:59:59Z",
        new Date("2026-11-22T05:59:59Z"),
      ).enabled,
    ).toBe(false);
    expect(
      validationWindow(
        "false",
        "2026-11-22T05:59:59Z",
        new Date("2026-11-14T00:00:00Z"),
      ).enabled,
    ).toBe(false);
  });
  it("fails closed on invalid expiry and rejects empty or excessive text", () => {
    expect(validationWindow("true", "invalid").enabled).toBe(false);
    expect(validationFeedbackInput.safeParse({ body: "  " }).success).toBe(
      false,
    );
    expect(
      validationFeedbackInput.safeParse({ body: "a".repeat(2001) }).success,
    ).toBe(false);
    expect(
      validationFeedbackInput.parse({ body: "  Falta una acción  " }).body,
    ).toBe("Falta una acción");
  });
});
