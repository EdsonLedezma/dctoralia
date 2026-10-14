import { get, head, issueSignedToken } from "@vercel/blob";
import {
  handleUploadPresigned,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { env } from "~/env";
import { isSameOriginMutation } from "~/server/security/same-origin";
import {
  readJsonBody,
  RequestBodyTooLargeError,
} from "~/server/security/request-body";
import { hasAllowedFileSignature } from "~/server/security/file-signatures";
import { enforceRateLimit } from "~/server/security/rate-limit";

const avatarPath = (role: "DOCTOR" | "PATIENT", userId: string) =>
  `avatars/${role === "PATIENT" ? "patients" : "doctors"}/${userId}/profile`;
const hasAvatarSuffix = (pathname: string, basePath: string) =>
  pathname === basePath || pathname.startsWith(`${basePath}-`);
const avatarContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
const maxAvatarSize = 5 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "Solicitud no permitida." },
      { status: 403 },
    );
  }

  const rateLimitResponse = await enforceRateLimit(request, "uploads");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = (await readJsonBody(
      request,
      16 * 1024,
    )) as HandleUploadPresignedBody;
    const canUseOidc = Boolean(env.VERCEL_OIDC_TOKEN && env.BLOB_STORE_ID);
    const localToken =
      env.NODE_ENV === "production"
        ? undefined
        : env.PROFILE_BLOB_READ_WRITE_TOKEN;
    if (!env.BLOB_WEBHOOK_PUBLIC_KEY || (!canUseOidc && !localToken)) {
      throw new Error(
        "Falta conectar el Blob de imágenes de perfil y su clave de webhook.",
      );
    }

    const pathname =
      body.type === "blob.generate-presigned-url"
        ? body.payload.pathname
        : body.payload.blob.pathname;
    const isPatientAvatar = pathname.startsWith("avatars/patients/");
    const response = await handleUploadPresigned({
      body,
      request,
      webhookPublicKey: env.BLOB_WEBHOOK_PUBLIC_KEY,
      getSignedToken: async (pathname, clientPayload) => {
        const session = await auth();
        const user = session?.user;

        if (!user || (user.role !== "DOCTOR" && user.role !== "PATIENT")) {
          throw new Error("Debes iniciar sesión para subir una foto.");
        }
        if (!hasAvatarSuffix(pathname, avatarPath(user.role, user.id))) {
          throw new Error("La ruta de carga no está permitida.");
        }
        if (isPatientAvatar !== (user.role === "PATIENT")) {
          throw new Error(
            "El tipo de almacenamiento no corresponde al perfil.",
          );
        }

        const signedToken = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: avatarContentTypes,
          maximumSizeInBytes: maxAvatarSize,
          token: localToken,
          oidcToken: env.VERCEL_OIDC_TOKEN,
          storeId: env.BLOB_STORE_ID,
        });

        return {
          token: signedToken,
          urlOptions: {
            allowedContentTypes: avatarContentTypes,
            maximumSizeInBytes: maxAvatarSize,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ userId: user.id, role: user.role }),
          },
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload ?? "{}") as {
          userId?: string;
          role?: "DOCTOR" | "PATIENT";
        };
        if (
          !payload.userId ||
          !payload.role ||
          isPatientAvatar !== (payload.role === "PATIENT") ||
          !hasAvatarSuffix(
            blob.pathname,
            avatarPath(payload.role, payload.userId),
          )
        ) {
          throw new Error("No se pudo validar el propietario de la foto.");
        }

        const storageOptions = {
          token: localToken,
          oidcToken: env.VERCEL_OIDC_TOKEN,
          storeId: env.BLOB_STORE_ID,
        };
        const storedBlob = await head(blob.pathname, storageOptions);
        if (
          !avatarContentTypes.includes(storedBlob.contentType) ||
          storedBlob.size > maxAvatarSize
        ) {
          throw new Error("El tipo o tamaño de la foto no está permitido.");
        }

        const storedContent = await get(blob.pathname, {
          access: "private",
          ...storageOptions,
        });
        if (
          !storedContent ||
          storedContent.statusCode !== 200 ||
          !(await hasAllowedFileSignature(
            storedContent.stream,
            storedBlob.contentType,
          ))
        ) {
          throw new Error("El contenido de la foto no coincide con su tipo.");
        }
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { error: "La solicitud supera el tamaño permitido." },
        { status: 413 },
      );
    }
    console.error("Avatar upload request rejected");
    return NextResponse.json(
      { error: "No se pudo procesar la foto." },
      { status: 400 },
    );
  }
}
