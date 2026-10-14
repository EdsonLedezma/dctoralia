import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { enforceRateLimit } from "~/server/security/rate-limit";
import { isSameOriginMutation } from "~/server/security/same-origin";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest, responseHeaders: Headers) => {
  return createTRPCContext({
    headers: req.headers,
    responseHeaders,
  });
};

const handler = async (req: NextRequest) => {
  if (req.method === "POST" && !isSameOriginMutation(req)) {
    return new Response(JSON.stringify({ error: "Solicitud no permitida." }), {
      status: 403,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, no-store, max-age=0",
      },
    });
  }

  const procedures =
    new URL(req.url).pathname.split("/api/trpc/")[1]?.split(",") ?? [];
  let rateLimitResponse: Response | null = null;

  if (req.method === "POST" && procedures.includes("auth.register")) {
    rateLimitResponse = await enforceRateLimit(req, "registration");
  } else if (
    procedures.some((procedure) =>
      ["doctor.search", "doctor.getAll", "doctor.getById"].includes(procedure),
    )
  ) {
    rateLimitResponse = await enforceRateLimit(req, "publicDoctorDirectory");
  }

  if (rateLimitResponse) return rateLimitResponse;

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: ({ resHeaders }) => createContext(req, resHeaders),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `tRPC failed on ${path ?? "<no-path>"} (${error.code})`,
            );
          }
        : undefined,
  });
};

export { handler as GET, handler as POST };
