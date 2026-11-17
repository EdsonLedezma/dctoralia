import { createHash, randomBytes } from "node:crypto";
export const portalTokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newPortalToken = () => randomBytes(32).toString("base64url");
export const portalTokenValid = (
  expiresAt: Date,
  consumedAt: Date | null,
  now = new Date(),
) => !consumedAt && expiresAt > now;
