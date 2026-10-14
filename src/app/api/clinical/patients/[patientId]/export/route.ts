import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { resolveClinicalActor } from "~/server/domain/clinical/access";
import {
  ClinicalExportError,
  generateClinicalExport,
} from "~/server/domain/clinical/export";
import { resolveWorkspaceContext } from "~/server/domain/workspaces/workspace-context";
import { enforceRateLimit } from "~/server/security/rate-limit";

export const runtime = "nodejs";

function selectedClinicId(request: Request) {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("dopilot-workspace="))
    ?.slice("dopilot-workspace=".length);
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return new NextResponse(null, { status: 403 });
  }

  const session = await auth();
  const user = session?.user;
  if (!user?.id || user.role !== "DOCTOR") {
    return new NextResponse(null, { status: 401 });
  }

  const rateLimitResponse = await enforceRateLimit(
    request,
    "clinicalExport",
    [user.id],
    false,
  );
  if (rateLimitResponse) return rateLimitResponse;

  const { patientId: rawPatientId } = await params;
  const patientId = z.string().cuid().safeParse(rawPatientId);
  if (!patientId.success) return new NextResponse(null, { status: 404 });

  const workspace = await resolveWorkspaceContext(
    db,
    user.id,
    selectedClinicId(request),
  );
  const actor = await resolveClinicalActor({
    db,
    userId: user.id,
    role: user.role,
    workspace,
  });
  if (!actor) return new NextResponse(null, { status: 403 });

  try {
    const exported = await generateClinicalExport(db, actor, patientId.data);
    return new Response(exported.body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="expediente-clinico-${patientId.data}.json"`,
        "Content-Length": String(exported.bytes),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "X-Frame-Options": "DENY",
      },
    });
  } catch (error) {
    if (error instanceof ClinicalExportError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "No se pudo preparar el expediente. Inténtalo de nuevo." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
