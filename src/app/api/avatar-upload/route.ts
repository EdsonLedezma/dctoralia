import { issueSignedToken } from "@vercel/blob";
import {
  handleUploadPresigned,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { env } from "~/env";

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
  try {
    const body = (await request.json()) as HandleUploadPresignedBody;
    const canUseOidc = Boolean(env.VERCEL_OIDC_TOKEN && env.BLOB_STORE_ID);
    const localToken =
      env.NODE_ENV === "production"
        ? undefined
        : env.PROFILE_BLOB_READ_WRITE_TOKEN;
    if (
      !env.BLOB_WEBHOOK_PUBLIC_KEY ||
      (!canUseOidc && !localToken)
    ) {
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
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo procesar la carga.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
