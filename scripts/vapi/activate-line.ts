import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fileURLToPath } from "node:url";

nextEnv.loadEnvConfig(fileURLToPath(new URL("../../", import.meta.url)));

const args = process.argv.slice(2);
const argument = (name: string) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const lineId = argument("--line-id");
const phoneId = argument("--vapi-phone-number-id");
const assistantId = argument("--assistant-id");
const apply = args.includes("--apply");
const forwardingVerified = args.includes("--forwarding-verified");

if (!lineId || !phoneId || !assistantId) {
  throw new Error(
    "Uso: pnpm vapi:activate --line-id <id> --vapi-phone-number-id <uuid> --assistant-id <uuid> [--forwarding-verified] [--apply]",
  );
}

const apiKey = process.env.VAPI_API_KEY;
const credentialId = process.env.VAPI_WEBHOOK_CREDENTIAL_ID;
const webhookToken = process.env.VAPI_WEBHOOK_TOKEN;
const appUrl = process.env.APP_URL;
const databaseUrl = process.env.DATABASE_URL;
if (!apiKey || !credentialId || !webhookToken || !appUrl || !databaseUrl)
  throw new Error(
    "Configura VAPI_API_KEY, VAPI_WEBHOOK_CREDENTIAL_ID, VAPI_WEBHOOK_TOKEN, APP_URL y DATABASE_URL.",
  );
if (webhookToken.length < 32)
  throw new Error("VAPI_WEBHOOK_TOKEN debe tener al menos 32 caracteres.");
if (!appUrl.startsWith("https://"))
  throw new Error("APP_URL debe ser HTTPS y accesible desde Vapi.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const endpoint = "https://api.vapi.ai";

async function vapi(path: string, init?: RequestInit) {
  const response = await fetch(`${endpoint}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Vapi respondió ${response.status} en ${path}.`);
  return (await response.json()) as Record<string, unknown>;
}

try {
  const line = await db.voiceAgentLine.findUnique({ where: { id: lineId } });
  if (!line || line.status !== "PENDING")
    throw new Error("La solicitud debe existir y estar pendiente.");
  const [phone, assistant] = await Promise.all([
    vapi(`/phone-number/${encodeURIComponent(phoneId)}`),
    vapi(`/assistant/${encodeURIComponent(assistantId)}`),
  ]);
  if (phone.id !== phoneId || assistant.id !== assistantId)
    throw new Error("Vapi devolvió un recurso diferente al solicitado.");
  if (phone.orgId !== assistant.orgId)
    throw new Error("El número y el asistente deben pertenecer a la misma organización Vapi.");
  if (typeof phone.number !== "string")
    throw new Error("Vapi no devolvió el número telefónico de la línea.");
  if (phone.number !== line.phoneNumber && !forwardingVerified)
    throw new Error(
      "El número público difiere del DID Vapi. Comprueba el desvío con una llamada real y añade --forwarding-verified.",
    );
  if (phone.status !== "active")
    throw new Error("El número aún no está activo en Vapi.");
  const assistantServer = assistant.server as { url?: string } | undefined;
  const webhookUrl = new URL("/api/integrations/vapi/webhook", appUrl).toString();
  if (assistantServer?.url && assistantServer.url !== webhookUrl)
    throw new Error("El asistente tiene otro Server URL; revísalo antes de activar.");

  console.log({
    lineId: line.id,
    phoneNumber: line.phoneNumber,
    vapiDialInNumber: phone.number,
    forwardingVerified: phone.number !== line.phoneNumber && forwardingVerified,
    vapiPhoneNumberId: phoneId,
    assistantId,
    webhookUrl,
    mode: apply ? "apply" : "preview",
  });
  if (apply) {
    await vapi(`/phone-number/${encodeURIComponent(phoneId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        assistantId: null,
        server: { url: webhookUrl, credentialId },
      }),
    });
    await db.voiceAgentLine.update({
      where: { id: line.id },
      data: {
        vapiPhoneNumberId: phoneId,
        vapiDialInNumber: phone.number,
        vapiAssistantId: assistantId,
        status: "ACTIVE",
      },
    });
    console.log("Línea activa. Verifica una llamada de prueba y las tools del asistente.");
  }
} finally {
  await db.$disconnect();
}
