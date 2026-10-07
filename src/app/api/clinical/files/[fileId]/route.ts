import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { env } from "~/env";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import {
  patientClinicalScope,
  resolveClinicalActor,
} from "~/server/domain/clinical/access";
import { resolveWorkspaceContext } from "~/server/domain/workspaces/workspace-context";

function selectedClinicId(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("dopilot-workspace="))
    ?.slice("dopilot-workspace=".length);
  if (!cookie) return undefined;
  try {
    return decodeURIComponent(cookie);
  } catch {
    return undefined;
  }
}

function encodeFilename(filename: string) {
  const fallback = filename.replace(/[^\x20-\x7E]|["\\;]/g, "_");
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || user.role !== "DOCTOR") {
    return new NextResponse(null, { status: 401 });
  }
  const canUseOidc = Boolean(env.VERCEL_OIDC_TOKEN && env.CLINICAL_STORE_ID);
  const localToken =
    env.NODE_ENV === "production"
      ? undefined
      : env.CLINICAL_READ_WRITE_TOKEN;
  if (!canUseOidc && !localToken) {
    return NextResponse.json(
      {
        error: "El almacenamiento privado del expediente no está configurado.",
      },
      { status: 503 },
    );
  }

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

  const { fileId } = await params;
  const file = await db.clinicalFile.findFirst({
    where: {
      id: fileId,
      clinicId: actor.clinicId,
      patient: patientClinicalScope(actor),
    },
    select: {
      id: true,
      patientId: true,
      blobPathname: true,
      originalFilename: true,
      mediaType: true,
      sizeBytes: true,
    },
  });
  if (!file) return new NextResponse(null, { status: 404 });

  try {
    const blob = await get(file.blobPathname, {
      access: "private",
      token: localToken,
      oidcToken: env.VERCEL_OIDC_TOKEN,
      storeId: env.CLINICAL_STORE_ID,
    });
    if (!blob || blob.statusCode !== 200) {
      return new NextResponse(null, { status: 404 });
    }

    await db.clinicalAuditEvent.create({
      data: {
        clinicId: actor.clinicId,
        patientId: file.patientId,
        actorUserId: actor.userId,
        resourceType: "CLINICAL_FILE",
        resourceId: file.id,
        action: "CLINICAL_FILE_DOWNLOADED",
      },
    });

    return new Response(blob.stream, {
      headers: {
        "Content-Type": file.mediaType,
        "Content-Disposition": encodeFilename(file.originalFilename),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Length": String(file.sizeBytes),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo recuperar el documento." },
      { status: 502 },
    );
  }
}
