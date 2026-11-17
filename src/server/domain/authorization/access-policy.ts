import type { Prisma, Role } from "@prisma/client";

export type AuthenticatedActor = {
  id: string;
  role: Role;
  receptionist?: boolean;
  clinicId?: string;
  operationalDoctorId?: string | null;
};

export function appointmentScopeForActor(
  actor: AuthenticatedActor,
): Prisma.AppointmentWhereInput {
  switch (actor.role) {
    case "DOCTOR":
      return actor.receptionist
        ? actor.clinicId && actor.operationalDoctorId
          ? { clinicId: actor.clinicId, doctorId: actor.operationalDoctorId }
          : { id: { in: [] } }
        : { doctor: { userId: actor.id } };
    case "PATIENT":
      return {
        patient: {
          OR: [
            { userId: actor.id },
            { accountLink: { userId: actor.id, active: true } },
          ],
        },
      };
    case "ADMIN":
      return {};
  }
}

export function doctorOwnedServiceScope(
  actor: AuthenticatedActor,
): Prisma.ServiceWhereInput | null {
  if (actor.role !== "DOCTOR" || actor.receptionist) {
    return null;
  }

  return { doctor: { userId: actor.id } };
}

export function doctorOwnedScheduleScope(
  actor: AuthenticatedActor,
): Prisma.ScheduleWhereInput | null {
  if (actor.role !== "DOCTOR" || actor.receptionist) {
    return null;
  }

  return { doctor: { userId: actor.id } };
}

export function canManageAllAppointments(actor: AuthenticatedActor): boolean {
  return (
    actor.role === "ADMIN" ||
    (actor.role === "DOCTOR" &&
      (!actor.receptionist ||
        Boolean(actor.clinicId && actor.operationalDoctorId)))
  );
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
      return {
        OR: [
          { userId: actor.id },
          { accountLink: { userId: actor.id, active: true } },
        ],
      };
    case "DOCTOR":
      return actor.receptionist
        ? { id: { in: [] } }
        : { appointments: { some: { doctor: { userId: actor.id } } } };
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
