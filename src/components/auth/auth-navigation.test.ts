import { describe, expect, it } from "vitest";
import { authPageHref, safeAuthReturnPath } from "./auth-navigation";

describe("authentication return paths", () => {
  it("preserves a booking destination including its service and date", () => {
    const path = "/book-appointment/demo?service=follow-up&date=2026-11-02";
    expect(safeAuthReturnPath(path, "PATIENT")).toBe(path);
    expect(
      new URL(
        authPageHref("/register", path),
        "https://test.local",
      ).searchParams.get("callbackUrl"),
    ).toBe(path);
  });
  it("rejects external destinations and authentication loops", () => {
    for (const path of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/login",
      "/api/auth/signout",
      "/dashboard/../login",
      "/patient\n/dashboard",
    ])
      expect(safeAuthReturnPath(path)).toBeNull();
  });
  it("retains role boundaries and falls back for unsupported account roles", () => {
    expect(safeAuthReturnPath("/dashboard/appointments", "PATIENT")).toBeNull();
    expect(safeAuthReturnPath("/patient/appointments", "DOCTOR")).toBeNull();
    expect(safeAuthReturnPath("/dashboard", "DOCTOR")).toBe("/dashboard");
    expect(safeAuthReturnPath("/patient/dashboard", "PATIENT")).toBe(
      "/patient/dashboard",
    );
    expect(safeAuthReturnPath("/dashboard", "ADMIN")).toBeNull();
  });
});
