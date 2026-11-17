import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { patientUploadOwner } from "~/server/domain/patient-portal/uploads";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const session = await auth();
  if (!session?.user.id || session.user.role !== "PATIENT")
    return new NextResponse(null, { status: 401 });
  const parsed = z
    .string()
    .cuid()
    .safeParse((await params).fileId);
  if (!parsed.success) return new NextResponse(null, { status: 404 });
  const localToken =
    env.NODE_ENV === "production" ? undefined : env.CLINICAL_READ_WRITE_TOKEN;
  if (!localToken && !(env.VERCEL_OIDC_TOKEN && env.CLINICAL_STORE_ID))
    return NextResponse.json(
      { error: "El almacenamiento privado no está disponible." },
      { status: 503 },
    );
  try {
    const file = await db.clinicalFile.findFirst({
      where: {
        id: parsed.data,
        uploadedByUserId: session.user.id,
        patient: patientUploadOwner(session.user.id),
        uploadReservationId: { not: null },
      },
      select: {
        id: true,
        patientId: true,
        clinicId: true,
        originalFilename: true,
        mediaType: true,
        sizeBytes: true,
        blobPathname: true,
        uploadReservation: {
          select: { grant: { select: { doctorId: true } } },
        },
      },
    });
    if (!file?.uploadReservation)
      return new NextResponse(null, { status: 404 });
    const access = await db.patientPortalAccess.findFirst({
      where: {
        patientId: file.patientId,
        doctorId: file.uploadReservation.grant.doctorId,
        clinicId: file.clinicId,
        active: true,
      },
      select: { id: true },
    });
    if (!access) return new NextResponse(null, { status: 404 });
    const blob = await get(file.blobPathname, {
      access: "private",
      token: localToken,
      oidcToken: env.VERCEL_OIDC_TOKEN,
      storeId: env.CLINICAL_STORE_ID,
    });
    if (!blob || blob.statusCode !== 200)
      return new NextResponse(null, { status: 404 });
    const filename = file.originalFilename.replace(/[^\x20-\x7e]|["\\;]/g, "_");
    await db.clinicalAuditEvent.create({
      data: {
        clinicId: file.clinicId,
        patientId: file.patientId,
        actorUserId: session.user.id,
        resourceType: "CLINICAL_FILE",
        resourceId: file.id,
        action: "CLINICAL_FILE_DOWNLOADED",
        metadata: { source: "PATIENT_PORTAL" },
      },
    });
    return new Response(blob.stream, {
      headers: {
        "Content-Type": file.mediaType,
        "Content-Length": String(file.sizeBytes),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo recuperar el documento." },
      { status: 503 },
    );
  }
}
