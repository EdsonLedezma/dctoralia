import type { Prisma, Role } from "@prisma/client";

export type AuthenticatedActor = {
  id: string;
  role: Role;
};

export function appointmentScopeForActor(
  actor: AuthenticatedActor,
): Prisma.AppointmentWhereInput {
  switch (actor.role) {
    case "DOCTOR":
      return { doctor: { userId: actor.id } };
    case "PATIENT":
      return { patient: { userId: actor.id } };
    case "ADMIN":
      return {};
  }
}

export function doctorOwnedServiceScope(
  actor: AuthenticatedActor,
): Prisma.ServiceWhereInput | null {
  if (actor.role !== "DOCTOR") {
    return null;
  }

  return { doctor: { userId: actor.id } };
}

export function doctorOwnedScheduleScope(
  actor: AuthenticatedActor,
): Prisma.ScheduleWhereInput | null {
  if (actor.role !== "DOCTOR") {
    return null;
  }

  return { doctor: { userId: actor.id } };
}

export function canManageAllAppointments(actor: AuthenticatedActor): boolean {
  return actor.role === "DOCTOR" || actor.role === "ADMIN";
}
