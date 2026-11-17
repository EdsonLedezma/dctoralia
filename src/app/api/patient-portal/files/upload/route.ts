import { put, head, BlobNotFoundError } from "@vercel/blob";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { isSameOriginMutation } from "~/server/security/same-origin";
import { enforceRateLimit } from "~/server/security/rate-limit";
import { hasAllowedFileSignature } from "~/server/security/file-signatures";
import {
  MAX_PATIENT_FILE_BYTES,
  PATIENT_FILE_TYPES,
  PatientUploadError,
  reservePatientUpload,
  patientUploadOwner,
} from "~/server/domain/patient-portal/uploads";
export const runtime = "nodejs";
export const maxDuration = 60;

async function boundedBytes(request: Request) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_PATIENT_FILE_BYTES)
    throw new PatientUploadError(413, "El archivo supera los 4 MB.");
  if (!request.body)
    throw new PatientUploadError(400, "Selecciona un archivo.");
  const reader = request.body.getReader();
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PATIENT_FILE_BYTES) {
        await reader.cancel();
        throw new PatientUploadError(413, "El archivo supera los 4 MB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!total) throw new PatientUploadError(400, "El archivo está vacío.");
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function POST(request: Request) {
  if (!isSameOriginMutation(request))
    return NextResponse.json(
      { error: "Solicitud no permitida." },
      { status: 403 },
    );
  const session = await auth();
  if (!session?.user.id || session.user.role !== "PATIENT")
    return NextResponse.json(
      { error: "Inicia sesión como paciente." },
      { status: 401 },
    );
  const rate = await enforceRateLimit(request, "uploads", [session.user.id]);
  if (rate) return rate;
  const localToken =
    env.NODE_ENV === "production" ? undefined : env.CLINICAL_READ_WRITE_TOKEN;
  if (!localToken && !(env.VERCEL_OIDC_TOKEN && env.CLINICAL_STORE_ID))
    return NextResponse.json(
      { error: "El almacenamiento privado no está configurado." },
      { status: 503 },
    );
  let reservationId: string | null = null;
  try {
    const grantId = z
      .string()
      .cuid()
      .parse(request.headers.get("x-upload-grant"));
    const requestId = z
      .string()
      .uuid()
      .parse(request.headers.get("x-upload-request"));
    const filename = z
      .string()
      .trim()
      .min(1)
      .max(180)
      .parse(decodeURIComponent(request.headers.get("x-file-name") ?? ""));
    const mediaType =
      request.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!PATIENT_FILE_TYPES.includes(mediaType))
      throw new PatientUploadError(400, "Usa un archivo PDF, JPG, PNG o WebP.");
    const bytes = await boundedBytes(request);
    if (
      !(await hasAllowedFileSignature(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
        mediaType,
      ))
    )
      throw new PatientUploadError(
        400,
        "El contenido no coincide con el tipo del archivo.",
      );
    const reserved = await reservePatientUpload(
      db,
      session.user.id,
      grantId,
      filename,
      requestId,
      createHash("sha256").update(bytes).digest("hex"),
    );
    reservationId = reserved.reservationId;
    const storage = {
      token: localToken,
      oidcToken: env.VERCEL_OIDC_TOKEN,
      storeId: env.CLINICAL_STORE_ID,
    };
    const alreadySaved = await db.clinicalFile.findUnique({
      where: { uploadReservationId: reserved.reservationId },
      select: { id: true },
    });
    if (alreadySaved)
      return NextResponse.json(
        { id: alreadySaved.id },
        { status: 200, headers: { "Cache-Control": "private, no-store" } },
      );
    let stored = false;
    if (reserved.reused) {
      try {
        const existingBlob = await head(reserved.pathname, storage);
        if (
          existingBlob.size !== bytes.length ||
          existingBlob.contentType !== mediaType
        )
          throw new PatientUploadError(
            409,
            "El archivo reservado tiene datos diferentes.",
          );
        // The pathname can only be written by this server for this hash; no browser tokens are issued.
        stored = true;
      } catch (error) {
        if (!(error instanceof BlobNotFoundError)) throw error;
      }
    }
    if (!stored)
      await put(reserved.pathname, Buffer.from(bytes), {
        access: "private",
        contentType: mediaType,
        addRandomSuffix: false,
        allowOverwrite: false,
        ...storage,
      });
    const file = await db.$transaction(async (tx) => {
      const access = await tx.patientPortalAccess.findFirst({
        where: {
          patientId: reserved.patientId,
          doctorId: reserved.doctorId,
          clinicId: reserved.clinicId,
          active: true,
          patient: patientUploadOwner(session.user.id),
        },
        select: { id: true },
      });
      if (!access)
        throw new PatientUploadError(
          403,
          "El acceso al consultorio cambió. Contacta a tu médico.",
        );
      const previous = await tx.clinicalFile.findUnique({
        where: { uploadReservationId: reserved.reservationId },
        select: { id: true },
      });
      if (previous) return previous;
      const created = await tx.clinicalFile.create({
        data: {
          clinicId: reserved.clinicId,
          patientId: reserved.patientId,
          encounterId: reserved.encounterId,
          uploadedByUserId: session.user.id,
          uploadReservationId: reserved.reservationId,
          blobPathname: reserved.pathname,
          originalFilename: filename,
          mediaType,
          sizeBytes: bytes.length,
          category: "OTHER",
        },
        select: { id: true },
      });
      await tx.patientUploadReservation.update({
        where: { id: reserved.reservationId },
        data: { status: "COMPLETED" },
      });
      await tx.clinicalAuditEvent.create({
        data: {
          clinicId: reserved.clinicId,
          patientId: reserved.patientId,
          actorUserId: session.user.id,
          resourceType: "CLINICAL_FILE",
          resourceId: created.id,
          action: "CLINICAL_FILE_UPLOADED",
          metadata: {
            source: "PATIENT_PORTAL",
            grantId,
            sizeBytes: bytes.length,
          },
        },
      });
      return created;
    });
    return NextResponse.json(
      { id: file.id },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (reservationId)
      await db.patientUploadReservation
        .updateMany({
          where: { id: reservationId, status: "RESERVED" },
          data: { status: "FAILED" },
        })
        .catch(() => undefined);
    return NextResponse.json(
      {
        error:
          error instanceof PatientUploadError
            ? error.message
            : "No se pudo guardar el archivo. Si el envío había comenzado, el espacio permanece reservado; consulta a tu médico.",
      },
      {
        status:
          error instanceof PatientUploadError
            ? error.status
            : error instanceof z.ZodError
              ? 400
              : 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
