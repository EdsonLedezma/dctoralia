import { describe, expect, it } from "vitest";
import { canManageBilling, subscriptionStatus } from "./billing-policy";

describe("facturación", () => {
  it("reserva el acceso financiero al propietario, incluso para renovar", () => {
    expect(canManageBilling("OWNER")).toBe(true);
    for (const role of ["ADMIN", "DOCTOR", "RECEPTIONIST", undefined])
      expect(canManageBilling(role)).toBe(false);
  });
  it("no activa estados incompletos, impagados o desconocidos", () => {
    for (const status of ["incomplete", "unpaid", "paused", "future_status"])
      expect(subscriptionStatus(status)).toBe("PAUSED");
    expect(subscriptionStatus("active")).toBe("ACTIVE");
    expect(subscriptionStatus("past_due")).toBe("PAST_DUE");
    expect(subscriptionStatus("canceled")).toBe("CANCELED");
  });
});
