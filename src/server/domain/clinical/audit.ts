import type { PrismaClient } from "@prisma/client";

import type { ClinicalActor } from "~/server/domain/clinical/access";

/** Store access metadata without copying clinical content into the audit log. */
export async function recordClinicalRead(
  db: PrismaClient,
  actor: ClinicalActor,
  input: {
    resourceType: string;
    resourceId: string;
    patientId?: string;
    action?: string;
  },
) {
  return db.clinicalAuditEvent.create({
    data: {
      clinicId: actor.clinicId,
      patientId: input.patientId,
      actorUserId: actor.userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      action: input.action ?? "CLINICAL_RECORD_READ",
    },
  });
}
