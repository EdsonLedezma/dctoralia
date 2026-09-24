import { env } from "~/env";
import { db } from "~/server/db";
import { stripeClient } from "~/server/integrations/stripe/stripe-client";
import { processStripeWebhook } from "~/server/integrations/stripe/stripe-webhook";

export const runtime = "nodejs";

// External provider boundary. All user-initiated billing operations use tRPC.
export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY)
    return new Response(null, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response(null, { status: 400 });
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return new Response(null, { status: 413 });
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return new Response(null, { status: 400 });
  }
  try {
    await processStripeWebhook(db, event);
    return new Response(null, { status: 204 });
  } catch {
    // Non-2xx asks Stripe to retry. Never log financial/customer payloads.
    return new Response(null, { status: 503 });
  }
}
