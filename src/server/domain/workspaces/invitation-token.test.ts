import { describe, expect, it } from "vitest";

import {
  createInvitationToken,
  hashInvitationToken,
  normalizeInvitationEmail,
} from "./invitation-token";

describe("workspace invitation tokens", () => {
  it("normalizes emails before persistence", () => {
    expect(normalizeInvitationEmail("  DOCTOR@Example.COM ")).toBe(
      "doctor@example.com",
    );
  });

  it("hashes tokens deterministically without storing the raw token", () => {
    const token = createInvitationToken();
    expect(token.length).toBeGreaterThan(40);
    expect(hashInvitationToken(token)).toBe(hashInvitationToken(token));
    expect(hashInvitationToken(token)).not.toBe(token);
  });
});
