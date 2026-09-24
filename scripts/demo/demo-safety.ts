import { DemoSeedError } from "./demo-errors";

export function validateDemoTarget(input: { url?: string; nodeEnv?: string }) {
  if (input.nodeEnv === "production") throw new DemoSeedError("PRODUCTION");
  if (!input.url?.trim()) throw new DemoSeedError("MISSING_URL");
  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    throw new DemoSeedError("INVALID_URL");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.pathname.length <= 1
  ) {
    throw new DemoSeedError("INVALID_URL");
  }
  return { url: input.url };
}
