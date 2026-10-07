import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { env } from "~/env";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const session = await auth();
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });

  const account = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, image: true },
  });
  if (!account?.image) return new NextResponse(null, { status: 404 });

  const expectedPrefix =
    account.role === "DOCTOR"
      ? `avatars/doctors/${account.id}/profile`
      : account.role === "PATIENT"
        ? `avatars/patients/${account.id}/profile`
        : null;
  const pathname = account.image;
  if (
    !expectedPrefix ||
    (pathname !== expectedPrefix && !pathname.startsWith(`${expectedPrefix}-`))
  ) {
    return new NextResponse(null, { status: 404 });
  }

  // Patient photos are visible only to their owner. Doctor photos can appear in
  // authenticated patient directories, but never through anonymous requests.
  if (account.role === "PATIENT" && session.user.id !== account.id) {
    return new NextResponse(null, { status: 404 });
  }

  const canUseOidc = Boolean(env.VERCEL_OIDC_TOKEN && env.BLOB_STORE_ID);
  const localToken =
    env.NODE_ENV === "production"
      ? undefined
      : env.PROFILE_BLOB_READ_WRITE_TOKEN;
  if (!canUseOidc && !localToken) {
    return NextResponse.json(
      { error: "El almacenamiento privado de imágenes no está configurado." },
      { status: 503 },
    );
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
