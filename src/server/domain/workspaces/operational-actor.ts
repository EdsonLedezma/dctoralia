import type { PrismaClient } from "@prisma/client";
import type { AuthenticatedActor } from "~/server/domain/authorization/access-policy";
import type { WorkspaceContext } from "./workspace-context";

export function selectedDoctorCookie(headers: Headers): string | undefined {
  const raw = headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("dopilot-doctor="))
    ?.slice("dopilot-doctor=".length);
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return undefined;
  }
}

export async function resolveOperationalActor(
  db: PrismaClient,
  user: AuthenticatedActor,
  workspace: WorkspaceContext | null,
  doctorId?: string,
): Promise<AuthenticatedActor> {
  if (user.role !== "DOCTOR" || workspace?.membershipRole !== "RECEPTIONIST")
    return user;
  const base = {
    ...user,
    receptionist: true,
    clinicId: workspace.clinicId,
    operationalDoctorId: null,
  };
  const memberships = await db.agendaAdministrator.findMany({
    where: {
      userId: user.id,
      clinicId: workspace.clinicId,
      active: true,
      doctor: {
        clinicId: workspace.clinicId,
        bookingSettings: { agendaAdminEnabled: true },
      },
    },
    select: { doctorId: true },
  });
  const selected =
    memberships.find((item) => item.doctorId === doctorId) ??
    (memberships.length === 1 ? memberships[0] : undefined);
  return selected ? { ...base, operationalDoctorId: selected.doctorId } : base;
}
