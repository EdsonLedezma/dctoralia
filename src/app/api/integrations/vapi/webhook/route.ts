import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { env } from "~/env";
import { db } from "~/server/db";
import {
  handleVapiToolCalls,
  parseVapiToolCalls,
  vapiPhoneNumberId,
} from "~/server/integrations/vapi/vapi-tools";

export const runtime = "nodejs";
export const maxDuration = 15;

function authorized(header: string | null, secret: string): boolean {
  const supplied = Buffer.from(header ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

export async function POST(request: Request) {
  if (!env.VAPI_WEBHOOK_TOKEN) return new Response(null, { status: 503 });
  if (!authorized(request.headers.get("authorization"), env.VAPI_WEBHOOK_TOKEN))
    return new Response(null, { status: 401 });

  const raw = await request.text();
  if (raw.length > 128_000) return new Response(null, { status: 413 });
  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = z
    .object({ message: z.object({ type: z.string().min(1) }).passthrough() })
    .safeParse(payload);
  if (!parsed.success) return new Response(null, { status: 400 });

  const message = parsed.data.message;
  if (message.type !== "assistant-request" && message.type !== "tool-calls")
    return new Response(null, { status: 204 });

  const phoneNumberId = vapiPhoneNumberId(message);
  if (!phoneNumberId) return new Response(null, { status: 400 });
  try {
    const line = await db.voiceAgentLine.findUnique({
      where: { vapiPhoneNumberId: phoneNumberId },
      select: {
        doctorId: true,
        clinicId: true,
        vapiAssistantId: true,
        status: true,
      },
    });
    if (line?.status !== "ACTIVE" || !line.vapiAssistantId)
      return new Response(null, { status: 404 });
    if (message.type === "assistant-request")
      return Response.json({ assistantId: line.vapiAssistantId });

    const calls = parseVapiToolCalls(message);
    if (!calls) return new Response(null, { status: 400 });
    return Response.json(
      await handleVapiToolCalls(db, line, calls, env.APP_URL),
    );
  } catch {
    return new Response(null, { status: 503 });
  }
}
