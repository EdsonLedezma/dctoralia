import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySentSignature } from "./verify-signature";

const now = 1_800_000_000_000;
const key = Buffer.from("test-only-signature-secret");
const secret = `whsec_${key.toString("base64")}`;
function fixture(timestamp = String(now / 1000)) {
  const body = '{"event":"message.delivered"}';
  const digest = createHmac("sha256", key)
    .update(`endpoint-1.${timestamp}.${body}`)
    .digest("base64");
  return {
    body,
    headers: new Headers({
      "x-webhook-id": "endpoint-1",
      "x-webhook-timestamp": timestamp,
      "x-webhook-signature": `v1,${digest}`,
    }),
  };
}
describe("Sent HMAC", () => {
  it("acepta firma válida sobre bytes originales", () => {
    const f = fixture();
    expect(verifySentSignature(f.body, f.headers, secret, now)).toBe(true);
  });
  it("rechaza body alterado", () => {
    const f = fixture();
    expect(verifySentSignature(`${f.body} `, f.headers, secret, now)).toBe(
      false,
    );
  });
  it("rechaza replay vencido y fechas futuras", () => {
    for (const offset of [-301, 301]) {
      const f = fixture(String(now / 1000 + offset));
      expect(verifySentSignature(f.body, f.headers, secret, now)).toBe(false);
    }
  });
  it("rechaza headers ausentes y firmas malformadas", () => {
    expect(verifySentSignature("{}", new Headers(), secret, now)).toBe(false);
    const f = fixture();
    f.headers.set("x-webhook-signature", "v1,?");
    expect(verifySentSignature(f.body, f.headers, secret, now)).toBe(false);
  });
  it("admite rotación de firmas", () => {
    const f = fixture();
    f.headers.set(
      "x-webhook-signature",
      `v1,invalid ${f.headers.get("x-webhook-signature")}`,
    );
    expect(verifySentSignature(f.body, f.headers, secret, now)).toBe(true);
  });
});
