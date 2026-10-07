import { issueSignedToken } from "@vercel/blob";
import {
  handleUploadPresigned,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { ClinicalFileCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "~/env";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import {
  patientClinicalScope,
  resolveClinicalActor,
} from "~/server/domain/clinical/access";
import { resolveWorkspaceContext } from "~/server/domain/workspaces/workspace-context";

const maxFileSize = 15 * 1024 * 1024;
const allowedContentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const uploadMetadataSchema = z.object({
  patientId: z.string().cuid(),
  episodeId: z.string().cuid().optional(),
  category: z.nativeEnum(ClinicalFileCategory),
  originalFilename: z.string().trim().min(1).max(180),
});
const tokenPayloadSchema = uploadMetadataSchema.extend({
  clinicId: z.string().cuid(),
  userId: z.string().cuid(),
  doctorId: z.string().cuid(),
});

function isClinicalPath(pathname: string, clinicId: string, patientId: string) {
  const segments = pathname.split("/");
  return (
    segments.length === 4 &&
    segments[0] === "clinical-files" &&
    segments[1] === clinicId &&
    segments[2] === patientId &&
    /^[0-9a-f-]{36}$/i.test(segments[3] ?? "")
  );
}

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

async function resolveUploadActor(userId: string, clinicId?: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return null;
  const workspace = await resolveWorkspaceContext(db, userId, clinicId);
  return resolveClinicalActor({
    db,
    userId,
    role: user.role,
    workspace,
  });
}

export async function POST(request: Request) {
  const canUseOidc = Boolean(env.VERCEL_OIDC_TOKEN && env.CLINICAL_STORE_ID);
  const localToken =
    env.NODE_ENV === "production"
      ? undefined
      : env.CLINICAL_READ_WRITE_TOKEN;
  if (
    !env.CLINICAL_WEBHOOK_PUBLIC_KEY ||
    (!canUseOidc && !localToken)
  ) {
    return NextResponse.json(
      {
        error:
          "El almacenamiento clínico privado no está conectado con Vercel.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as HandleUploadPresignedBody;
    const response = await handleUploadPresigned({
      body,
      request,
      webhookPublicKey: env.CLINICAL_WEBHOOK_PUBLIC_KEY,
      getSignedToken: async (pathname, clientPayload) => {
        const session = await auth();
        const user = session?.user;
        if (!user?.id || user.role !== "DOCTOR") {
          throw new Error("Sólo un doctor puede adjuntar archivos clínicos.");
        }

        const metadata = uploadMetadataSchema.parse(
          JSON.parse(clientPayload ?? "{}"),
        );
        const actor = await resolveUploadActor(
          user.id,
          selectedClinicId(request),
        );
        if (
          !actor ||
          !isClinicalPath(pathname, actor.clinicId, metadata.patientId)
        ) {
          throw new Error("La ruta de carga no está permitida.");
        }

        const patient = await db.patient.findFirst({
          where: {
            id: metadata.patientId,
            ...patientClinicalScope(actor),
          },
          select: { id: true },
        });
        if (!patient) throw new Error("No tienes acceso a este paciente.");

        if (metadata.episodeId) {
          const episode = await db.careEpisode.findFirst({
            where: {
              id: metadata.episodeId,
              patientId: metadata.patientId,
              clinicId: actor.clinicId,
              primaryDoctorId: actor.doctorId,
            },
            select: { id: true },
          });
          if (!episode) throw new Error("El episodio no está disponible.");
        }

        const signedToken = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes,
          maximumSizeInBytes: maxFileSize,
          token: localToken,
          oidcToken: env.VERCEL_OIDC_TOKEN,
          storeId: env.CLINICAL_STORE_ID,
        });

        return {
          token: signedToken,
          urlOptions: {
            allowedContentTypes,
            maximumSizeInBytes: maxFileSize,
            addRandomSuffix: false,
            tokenPayload: JSON.stringify({ ...metadata, ...actor }),
          },
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const metadata = tokenPayloadSchema.parse(
          JSON.parse(tokenPayload ?? "{}"),
        );
        const actor = await resolveUploadActor(
          metadata.userId,
          metadata.clinicId,
        );
        if (
          !actor ||
          actor.doctorId !== metadata.doctorId ||
          actor.clinicId !== metadata.clinicId ||
          !isClinicalPath(blob.pathname, metadata.clinicId, metadata.patientId)
        ) {
          throw new Error("No se pudo validar el acceso al archivo clínico.");
        }

        if (
          !allowedContentTypes.includes(blob.contentType) ||
          blob.size > maxFileSize
        ) {
          throw new Error("El tipo o tamaño del archivo no está permitido.");
        }

        const patient = await db.patient.findFirst({
          where: {
            id: metadata.patientId,
            ...patientClinicalScope(actor),
          },
          select: { id: true },
        });
        if (!patient) throw new Error("El paciente ya no está disponible.");

        if (metadata.episodeId) {
          const episode = await db.careEpisode.findFirst({
            where: {
              id: metadata.episodeId,
              patientId: metadata.patientId,
              clinicId: metadata.clinicId,
              primaryDoctorId: metadata.doctorId,
            },
            select: { id: true },
          });
          if (!episode) throw new Error("El episodio ya no está disponible.");
        }

        await db.$transaction(async (tx) => {
          const existing = await tx.clinicalFile.findUnique({
            where: { blobPathname: blob.pathname },
            select: { id: true },
          });
          if (existing) return;

          const file = await tx.clinicalFile.create({
            data: {
              clinicId: metadata.clinicId,
              patientId: metadata.patientId,
              episodeId: metadata.episodeId,
              uploadedByUserId: metadata.userId,
              blobPathname: blob.pathname,
              originalFilename: metadata.originalFilename,
              mediaType: blob.contentType,
              sizeBytes: blob.size,
              category: metadata.category,
            },
          });
          await tx.clinicalAuditEvent.create({
            data: {
              clinicId: metadata.clinicId,
              patientId: metadata.patientId,
              actorUserId: metadata.userId,
              resourceType: "CLINICAL_FILE",
              resourceId: file.id,
              action: "CLINICAL_FILE_UPLOADED",
              metadata: { category: metadata.category, sizeBytes: blob.size },
            },
          });
        });
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo procesar la carga.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
