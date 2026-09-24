import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PATIENT")
    redirect(session.user.role === "DOCTOR" ? "/dashboard" : "/");
  return children;
}
