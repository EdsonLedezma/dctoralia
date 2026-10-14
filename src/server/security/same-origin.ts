/**
 * Defense in depth for cookie-authenticated state-changing requests.
 * Non-browser clients may omit Origin; an explicit cross-site fetch metadata
 * signal is still rejected in that case.
 */
export function isSameOriginMutation(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
