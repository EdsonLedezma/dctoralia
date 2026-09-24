import { timingSafeEqual } from "node:crypto";
import SentDm from "@sentdm/sentdm";
import { env } from "~/env";
import { db } from "~/server/db";
import { dispatchMessageOutbox } from "~/server/domain/messaging/outbox";
import { SentMessagingProvider } from "~/server/integrations/sent/sent-messaging-provider";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET ?? ""}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  if (
    !env.CRON_SECRET ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return new Response(null, { status: 401 });
  if (env.SENT_ENABLED !== "true") return Response.json({ status: "disabled" });
  if (!env.SENT_API_KEY) return new Response(null, { status: 503 });
  const provider = new SentMessagingProvider(
    new SentDm({ apiKey: env.SENT_API_KEY, timeout: 10_000, maxRetries: 0 }),
    {
      profileId: env.SENT_PROFILE_ID,
      sandbox: env.SENT_SANDBOX !== "false",
    },
  );
  try {
    return Response.json(
      await dispatchMessageOutbox(db, provider, { limit: 4 }),
    );
  } catch {
    return new Response(null, { status: 503 });
  }
}
