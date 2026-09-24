import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "DOCTOR")
    redirect(session.user.role === "PATIENT" ? "/patient/dashboard" : "/");
  return children;
}
