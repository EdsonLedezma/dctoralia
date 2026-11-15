import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "~/env";
import { db } from "~/server/db";
import {
  parseVoiceEnvelope,
  resolveVoiceLine,
} from "~/server/domain/voice/voice-context";
import {
  handleVapiToolCalls,
  parseVapiToolCalls,
} from "~/server/integrations/vapi/vapi-tools";
export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(header: string | null, secret: string): boolean {
  const supplied = Buffer.from(header ?? ""),
    expected = Buffer.from("Bearer " + secret);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
export async function POST(request: Request) {
  if (env.DEMO_MODE === "true" || !env.VAPI_WEBHOOK_TOKEN)
    return new Response(null, { status: 503 });
  if (!authorized(request.headers.get("authorization"), env.VAPI_WEBHOOK_TOKEN))
    return new Response(null, { status: 401 });
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > 128000)
    return new Response(null, { status: 413 });
  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = z
    .object({ message: z.object({ type: z.string() }).passthrough() })
    .safeParse(payload);
  if (!parsed.success) return new Response(null, { status: 400 });
  const message = parsed.data.message;
  if (!["assistant-request", "tool-calls"].includes(message.type))
    return new Response(null, { status: 204 });
  const tools =
    message.type === "tool-calls" ? parseVapiToolCalls(message) : null;
  if (message.type === "tool-calls" && !tools)
    return new Response(null, { status: 400 });
  const failure = () =>
    Response.json(
      tools
        ? {
            results: tools.map((t) => ({
              toolCallId: t.id,
              error:
                "Línea no habilitada o llamada inválida. Contacta recepción.",
            })),
          }
        : { error: "El asistente de este consultorio no está disponible." },
      { headers: { "Cache-Control": "no-store" } },
    );
  const context = parseVoiceEnvelope(message);
  if (!context) return failure();
  try {
    const line = await resolveVoiceLine(db, context.phoneNumberId);
    if (
      !line ||
      (context.assistantId && context.assistantId !== line.vapiAssistantId)
    )
      return failure();
    // The doctor's identity comes ONLY from the provisioned Vapi phone-number ID.
    if (!tools)
      return Response.json(
        { assistantId: line.vapiAssistantId },
        { headers: { "Cache-Control": "no-store" } },
      );
    return Response.json(
      await handleVapiToolCalls(
        db,
        line,
        tools,
        env.APP_URL,
        context.callId,
        env.VAPI_WEBHOOK_TOKEN,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return failure();
  }
}
