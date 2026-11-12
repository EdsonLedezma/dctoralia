import { redirect } from "next/navigation";
import { TermsAcceptanceDialog } from "~/components/legal/terms-acceptance-dialog";
import { LEGAL_VERSION } from "~/lib/legal/company";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "DOCTOR")
    redirect(session.user.role === "PATIENT" ? "/patient/dashboard" : "/");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { termsVersion: true },
  });
  return (
    <>
      {children}
      {user?.termsVersion !== LEGAL_VERSION && <TermsAcceptanceDialog />}
    </>
  );
}
