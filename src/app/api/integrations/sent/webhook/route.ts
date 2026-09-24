import { env } from "~/env";
import { db } from "~/server/db";
import { verifySentSignature } from "~/server/integrations/sent/verify-signature";
import { processSentWebhook } from "~/server/integrations/sent/sent-webhook";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!env.SENT_WEBHOOK_SECRET) return new Response(null, { status: 503 });
  const rawBody = await request.text();
  if (rawBody.length > 256_000) return new Response(null, { status: 413 });
  if (!verifySentSignature(rawBody, request.headers, env.SENT_WEBHOOK_SECRET))
    return new Response(null, { status: 401 });
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(null, { status: 400 });
  }
  try {
    await processSentWebhook(db, body);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
