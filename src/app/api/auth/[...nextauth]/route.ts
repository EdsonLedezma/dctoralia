import { handlers } from "~/server/auth";
import { enforceRateLimit } from "~/server/security/rate-limit";
import { type NextRequest } from "next/server";

export const GET = handlers.GET;

async function getCredentialEmail(request: Request) {
  const declaredLength = request.headers.get("content-length");
  const contentLength = Number(declaredLength);
  if (
    !declaredLength ||
    !Number.isFinite(contentLength) ||
    contentLength > 8 * 1024
  ) {
    return null;
  }

  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = new URLSearchParams(await request.clone().text());
      return form.get("email")?.trim().toLowerCase() ?? null;
    }
    if (contentType.includes("application/json")) {
      const body = (await request.clone().json()) as { email?: unknown };
      return typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : null;
    }
  } catch {
    return null;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const path = new URL(request.url).pathname;
  if (path.endsWith("/callback/credentials")) {
    const email = await getCredentialEmail(request);
    const limited = await enforceRateLimit(
      request,
      "credentials",
      email ? [`email:${email}`] : [],
    );
    if (limited) return limited;
  }

  return handlers.POST(request);
}
