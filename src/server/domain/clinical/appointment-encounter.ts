import { Prisma, type PrismaClient } from "@prisma/client";
import type { ClinicalActor } from "./access";
import { ClinicalWorkflowError } from "./workflows";

/** One draft per booked consultation. Opening twice never creates another record. */
export async function ensureAppointmentEncounter(
  db: PrismaClient,
  actor: ClinicalActor,
  input: { appointmentId: string; patientId: string },
) {
  const where = {
    appointmentId: input.appointmentId,
    patientId: input.patientId,
    doctorId: actor.doctorId,
    clinicId: actor.clinicId,
  };
  const appointment = await db.appointment.findFirst({
    where: {
      id: input.appointmentId,
      patientId: input.patientId,
      doctorId: actor.doctorId,
      clinicId: actor.clinicId,
    },
    select: {
      id: true,
      status: true,
      reason: true,
      intakeSymptoms: true,
      intakeAllergies: true,
      intakeMedications: true,
      intakeContext: true,
      lifecycleEvents: {
        where: { eventType: "CONSULTATION_STARTED" },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!appointment)
    throw new ClinicalWorkflowError(
      "NOT_FOUND",
      "La cita no corresponde a este paciente y consultorio.",
    );
  const existing = await db.clinicalEncounter.findFirst({ where });
  if (existing) {
    if (existing.authoredByUserId !== actor.userId)
      throw new ClinicalWorkflowError(
        "FORBIDDEN",
        "Esta consulta pertenece a otro profesional.",
      );
    return existing;
  }
  if (
    !["PENDING", "CONFIRMED"].includes(appointment.status) ||
    !appointment.lifecycleEvents.length
  )
    throw new ClinicalWorkflowError(
      "INVALID_STATE",
      "Registra el inicio de la consulta desde la agenda antes de abrir su formulario.",
    );
  const reported = [
    appointment.intakeSymptoms &&
      `Síntomas referidos: ${appointment.intakeSymptoms}`,
    appointment.intakeAllergies &&
      `Alergias referidas: ${appointment.intakeAllergies}`,
    appointment.intakeMedications &&
      `Medicamentos referidos: ${appointment.intakeMedications}`,
    appointment.intakeContext &&
      `Contexto referido: ${appointment.intakeContext}`,
  ]
    .filter(Boolean)
    .join("\n");
  try {
    return await db.$transaction(async (tx) => {
      const draft = await tx.clinicalEncounter.create({
        data: {
          ...where,
          authoredByUserId: actor.userId,
          chiefComplaint: appointment.reason,
          subjective: reported || null,
        },
      });
      await tx.clinicalAuditEvent.create({
        data: {
          clinicId: actor.clinicId,
          patientId: input.patientId,
          actorUserId: actor.userId,
          resourceType: "CLINICAL_ENCOUNTER",
          resourceId: draft.id,
          action: "CLINICAL_ENCOUNTER_DRAFT_CREATED",
        },
      });
      return draft;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrent = await db.clinicalEncounter.findFirst({
        where: { ...where, authoredByUserId: actor.userId },
      });
      if (concurrent) return concurrent;
    }
    throw error;
  }
}
