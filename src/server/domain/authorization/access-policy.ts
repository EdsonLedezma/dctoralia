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

/**
 * Scope used when a clinician needs to read a patient's record. Doctors can
 * only see patients with an appointment in their agenda; patients can only
 * see themselves and admins retain the global scope.
 */
export function patientScopeForActor(
  actor: AuthenticatedActor,
): Prisma.PatientWhereInput {
  switch (actor.role) {
    case "PATIENT":
      return { userId: actor.id };
    case "DOCTOR":
      return { appointments: { some: { doctor: { userId: actor.id } } } };
    case "ADMIN":
      return {};
  }
}

/** Fields that may be mutated by the patient profile owner or an admin. */
export function patientSelfScopeForActor(
  actor: AuthenticatedActor,
): Prisma.PatientWhereInput | null {
  if (actor.role === "PATIENT") return { userId: actor.id };
  if (actor.role === "ADMIN") return {};
  return null;
}
