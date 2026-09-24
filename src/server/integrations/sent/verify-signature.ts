import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySentSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
  now = Date.now(),
): boolean {
  const id = headers.get("x-webhook-id");
  const timestamp = headers.get("x-webhook-timestamp");
  const signature = headers.get("x-webhook-signature");
  if (
    !id ||
    !timestamp ||
    !signature ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  if (!key.length) return false;
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest();
  return signature.split(" ").some((part) => {
    if (!part.startsWith("v1,")) return false;
    const received = Buffer.from(part.slice(3), "base64");
    return (
      received.length === expected.length && timingSafeEqual(received, expected)
    );
  });
}
