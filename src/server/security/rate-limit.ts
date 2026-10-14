import "server-only";

import { createHmac } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "~/env";

const policies = {
  credentials: { requests: 20, window: "15 m" },
  registration: { requests: 8, window: "1 h" },
  publicDoctorDirectory: { requests: 60, window: "1 m" },
  uploads: { requests: 60, window: "1 h" },
  uploadsPerUser: { requests: 20, window: "1 h" },
  clinicalExport: { requests: 5, window: "1 h" },
} as const;

export type RateLimitPolicy = keyof typeof policies;

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
        signal: () => AbortSignal.timeout(3_000),
      })
    : null;

const limiters = new Map<RateLimitPolicy, Ratelimit>();

function getLimiter(policy: RateLimitPolicy) {
  const existing = limiters.get(policy);
  if (existing) return existing;

  if (!redis) return null;
  const config = policies[policy];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: `dctoralia:security:${policy}`,
    ephemeralCache: false,
    // Never allow the SDK's timeout fallback to turn a failed security check
    // into an allowed request. Redis calls are aborted after three seconds.
    timeout: 0,
  });
  limiters.set(policy, limiter);
  return limiter;
}

function getClientIp(request: Request) {
  const value =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for");
  return value?.split(",").at(-1)?.trim().slice(0, 64) || null;
}

function hashIdentifier(value: string) {
  const secret = env.AUTH_SECRET ?? "development-only-rate-limit-key";
  return createHmac("sha256", secret).update(value).digest("hex");
}

function failureResponse(status: 429 | 503, retryAfter?: number) {
  return new Response(
    JSON.stringify({
      error:
        status === 429
          ? "Demasiadas solicitudes. Inténtalo de nuevo más tarde."
          : "La protección temporal no está disponible. Inténtalo más tarde.",
    }),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, no-store, max-age=0",
        ...(retryAfter ? { "retry-after": String(retryAfter) } : {}),
      },
    },
  );
}

/**
 * Distributed sliding-window rate limit for serverless routes.
 * In production, missing or unreachable Upstash is fail-closed; local
 * development remains usable without a Redis instance.
 */
export async function enforceRateLimit(
  request: Request,
  policy: RateLimitPolicy,
  additionalIdentifiers: string[] = [],
  includeIp = true,
): Promise<Response | null> {
  const limiter = getLimiter(policy);
  if (!limiter) {
    return env.NODE_ENV === "production" ? failureResponse(503) : null;
  }

  const ip = getClientIp(request);
  if (includeIp && !ip) {
    return env.NODE_ENV === "production" ? failureResponse(503) : null;
  }

  try {
    const identifiers = [
      ...(includeIp && ip ? [`ip:${ip}`] : []),
      ...additionalIdentifiers.map((identifier) => `subject:${identifier}`),
    ];

    if (identifiers.length === 0) return null;

    for (const identifier of identifiers) {
      const result = await limiter.limit(hashIdentifier(identifier));
      if (result.reason === "timeout") return failureResponse(503);
      if (!result.success) {
        return failureResponse(
          429,
          Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
        );
      }
    }

    return null;
  } catch {
    return env.NODE_ENV === "production" ? failureResponse(503) : null;
  }
}
