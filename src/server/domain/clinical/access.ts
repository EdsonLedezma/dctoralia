import type { Prisma, PrismaClient, Role } from "@prisma/client";

import type { WorkspaceContext } from "~/server/domain/workspaces/workspace-context";

export type ClinicalActor = {
  userId: string;
  doctorId: string;
  clinicId: string;
  workspaceRole: WorkspaceContext["membershipRole"];
};

export async function resolveClinicalActor(input: {
  db: PrismaClient;
  userId: string;
  role: Role;
  workspace: WorkspaceContext | null;
}): Promise<ClinicalActor | null> {
  if (
    input.role !== "DOCTOR" ||
    !input.workspace ||
    input.workspace.membershipRole === "RECEPTIONIST"
  ) {
    return null;
  }

  const doctor = await input.db.doctor.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });
  if (!doctor) return null;

  return {
    userId: input.userId,
    doctorId: doctor.id,
    clinicId: input.workspace.clinicId,
    workspaceRole: input.workspace.membershipRole,
  };
}

/** Access to an episode is assigned to its primary clinician in v1. */
export function careEpisodeScope(
  actor: ClinicalActor,
): Prisma.CareEpisodeWhereInput {
  return {
    clinicId: actor.clinicId,
    primaryDoctorId: actor.doctorId,
  };
}

/** A doctor sees records they authored or encounters scheduled in their own agenda. */
export function patientClinicalScope(
  actor: ClinicalActor,
): Prisma.PatientWhereInput {
  return {
    OR: [
      {
        careEpisodes: {
          some: {
            clinicId: actor.clinicId,
            primaryDoctorId: actor.doctorId,
          },
        },
      },
      {
        appointments: {
          some: { clinicId: actor.clinicId, doctorId: actor.doctorId },
        },
      },
      {
        encounters: {
          some: { clinicId: actor.clinicId, doctorId: actor.doctorId },
        },
      },
    ],
  };
}

/** A new episode may be opened for a clinic patient or an existing patient in the doctor's agenda. */
export function patientEpisodeCreationScope(
  actor: ClinicalActor,
): Prisma.PatientWhereInput {
  return {
    OR: [
      {
        clinicMemberships: {
          some: { clinicId: actor.clinicId, status: "ACTIVE" },
        },
      },
      { clinicId: actor.clinicId },
      {
        appointments: {
          some: { clinicId: actor.clinicId, doctorId: actor.doctorId },
        },
      },
    ],
  };
}
