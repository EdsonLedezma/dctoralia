import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  const session = await auth();
  const user = session?.user;

  if (!user || user.role !== "PATIENT") {
    return new NextResponse(null, { status: 401 });
  }
  const canUseOidc = Boolean(env.VERCEL_OIDC_TOKEN && env.BLOB_STORE_ID);
  const localToken =
    env.NODE_ENV === "production"
      ? undefined
      : env.PROFILE_BLOB_READ_WRITE_TOKEN;
  if (!canUseOidc && !localToken) {
    return NextResponse.json(
      { error: "El almacenamiento de imágenes no está configurado." },
      { status: 503 },
    );
  }

  const account = await db.user.findUnique({
    where: { id: user.id },
    select: { image: true },
  });
  const expectedPrefix = `avatars/patients/${user.id}/profile`;
  const pathname = account?.image;

  if (
    !pathname ||
    (pathname !== expectedPrefix && !pathname.startsWith(`${expectedPrefix}-`))
  ) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const blob = await get(pathname, {
      access: "private",
      token: localToken,
      oidcToken: env.VERCEL_OIDC_TOKEN,
      storeId: env.BLOB_STORE_ID,
    });

    if (!blob || blob.statusCode !== 200) {
      return new NextResponse(null, { status: 404 });
    }

    return new Response(blob.stream, {
      headers: {
        "Content-Type": blob.blob.contentType,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Length": String(blob.blob.size),
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
