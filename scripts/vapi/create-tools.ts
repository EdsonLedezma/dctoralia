import nextEnv from "@next/env";
import { fileURLToPath } from "node:url";

nextEnv.loadEnvConfig(fileURLToPath(new URL("../../", import.meta.url)));

const apiKey = process.env.VAPI_API_KEY;
const credentialId = process.env.VAPI_WEBHOOK_CREDENTIAL_ID;
const appUrl = process.env.APP_URL;
const apply = process.argv.includes("--apply");
if (!apiKey || !credentialId || !appUrl)
  throw new Error("Configura VAPI_API_KEY, VAPI_WEBHOOK_CREDENTIAL_ID y APP_URL.");
if (!appUrl.startsWith("https://"))
  throw new Error("APP_URL debe ser HTTPS y accesible desde Vapi.");

const server = {
  url: new URL("/api/integrations/vapi/webhook", appUrl).toString(),
  credentialId,
};
const tools = [
  {
    type: "function",
    function: {
      name: "list_services",
      description: "Consulta los servicios públicos, precio y duración del médico de esta llamada.",
      parameters: { type: "object", properties: {} },
    },
    server,
  },
  {
    type: "function",
    function: {
      name: "get_available_slots",
      description: "Consulta horarios libres para un servicio y fecha. Nunca inventes disponibilidad.",
      parameters: {
        type: "object",
        properties: {
          serviceId: { type: "string", description: "ID obtenido de list_services" },
          date: { type: "string", description: "Fecha AAAA-MM-DD en México" },
        },
        required: ["serviceId", "date"],
      },
    },
    server,
  },
  {
    type: "function",
    function: {
      name: "get_booking_link",
      description:
        "Prepara un enlace para que el paciente confirme una cita disponible y complete su brief médico de forma privada.",
      parameters: {
        type: "object",
        properties: {
          serviceId: { type: "string", description: "ID obtenido de list_services" },
          date: { type: "string", description: "Fecha AAAA-MM-DD en México" },
          time: { type: "string", description: "Hora HH:mm obtenida de get_available_slots" },
        },
        required: ["serviceId", "date", "time"],
      },
    },
    server,
  },
] as const;

if (!apply) {
  console.log(JSON.stringify({ mode: "preview", tools }, null, 2));
} else {
  const response = await fetch("https://api.vapi.ai/tool", {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`No se pudo listar tools: ${response.status}`);
  const existing = (await response.json()) as Array<{
    id: string;
    function?: { name?: string };
    server?: { url?: string };
  }>;
  for (const tool of tools) {
    const found = existing.find(
      (item) =>
        item.function?.name === tool.function.name &&
        item.server?.url === server.url,
    );
    if (found) {
      console.log(`${tool.function.name}: ${found.id} (existente)`);
      continue;
    }
    const created = await fetch("https://api.vapi.ai/tool", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tool),
      signal: AbortSignal.timeout(10_000),
    });
    if (!created.ok)
      throw new Error(`No se pudo crear ${tool.function.name}: ${created.status}`);
    const data = (await created.json()) as { id: string };
    console.log(`${tool.function.name}: ${data.id} (creada)`);
  }
}
