import { vapiFunctionDefinitions } from "../../src/server/integrations/vapi/tool-definitions";
import { z } from "zod";
import nextEnv from "@next/env";
import { fileURLToPath } from "node:url";

nextEnv.loadEnvConfig(fileURLToPath(new URL("../../", import.meta.url)));

const apiKey = process.env.VAPI_API_KEY;
const credentialId = process.env.VAPI_WEBHOOK_CREDENTIAL_ID;
const appUrl = process.env.APP_URL;
const apply = process.argv.includes("--apply");
if ((apply && !apiKey) || !credentialId || !appUrl)
  throw new Error(
    "Configura VAPI_API_KEY, VAPI_WEBHOOK_CREDENTIAL_ID y APP_URL.",
  );
if (!appUrl.startsWith("https://"))
  throw new Error("APP_URL debe ser HTTPS y accesible desde Vapi.");

const server = {
  url: new URL("/api/integrations/vapi/webhook", appUrl).toString(),
  credentialId,
};
const tools = vapiFunctionDefinitions.map((definition) => ({
  type: "function",
  function: definition,
  server,
  async: false,
}));

if (!apply) {
  console.log(JSON.stringify({ mode: "preview", tools }, null, 2));
} else {
  const response = await fetch("https://api.vapi.ai/tool", {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(`No se pudo listar tools: ${response.status}`);
  const existing = z
    .array(
      z.object({
        id: z.string().uuid(),
        function: z.object({ name: z.string().optional() }).optional(),
        server: z.object({ url: z.string().optional() }).optional(),
      }),
    )
    .parse(await response.json());
  for (const tool of tools) {
    const found = existing.find(
      (item) =>
        item.function?.name === tool.function.name &&
        item.server?.url === server.url,
    );
    if (found) {
      const updated = await fetch(
        "https://api.vapi.ai/tool/" + encodeURIComponent(found.id),
        {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(tool),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!updated.ok)
        throw new Error("No se pudo actualizar " + tool.function.name);
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
      throw new Error(
        `No se pudo crear ${tool.function.name}: ${created.status}`,
      );
    const data = z
      .object({ id: z.string().uuid() })
      .parse(await created.json());
    console.log(`${tool.function.name}: ${data.id} (creada)`);
  }
}
