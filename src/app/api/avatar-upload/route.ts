import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
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
    const body = (await request.json()) as HandleUploadBody;
    const pathname =
      body.type === "blob.generate-client-token"
        ? body.payload.pathname
        : body.payload.blob.pathname;
    const isPatientAvatar = pathname.startsWith("avatars/patients/");
    const token = isPatientAvatar
      ? env.PATIENT_BLOB_READ_WRITE_TOKEN
      : env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      throw new Error(
        isPatientAvatar
          ? "Falta conectar el Blob privado de pacientes."
          : "Falta configurar el Blob público de médicos.",
      );
    }

    const response = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname) => {
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

        return {
          allowedContentTypes: avatarContentTypes,
          maximumSizeInBytes: maxAvatarSize,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id, role: user.role }),
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
