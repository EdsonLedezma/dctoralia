import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { resolveWorkspaceContext } from "~/server/domain/workspaces/workspace-context";
export default async function PatientRecordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user.role === "DOCTOR") {
    const workspace = await resolveWorkspaceContext(
      db,
      session.user.id,
      (await cookies()).get("dopilot-workspace")?.value,
    );
    if (workspace?.membershipRole === "RECEPTIONIST")
      redirect("/dashboard/appointments");
  }
  return children;
}
