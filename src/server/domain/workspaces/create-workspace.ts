import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { BillingError } from "~/server/domain/subscriptions/billing-error";

export async function createDoctorWorkspace(
  db: PrismaClient,
  userId: string,
  name: string,
) {
  return db.$transaction(
    async (tx) => {
      const doctor = await tx.doctor.findUnique({
        where: { userId },
        select: { id: true, clinicId: true },
      });
      if (!doctor)
        throw new BillingError(
          "DOCTOR_REQUIRED",
          "Esta operación requiere un perfil de doctor.",
          403,
        );
      if (
        doctor.clinicId ||
        (await tx.clinicMember.count({ where: { userId } }))
      )
        throw new BillingError(
          "WORKSPACE_EXISTS",
          "Ya perteneces a un workspace. Selecciónalo desde la barra lateral.",
        );
      const clinic = await tx.clinic.create({
        data: {
          name,
          slug: `consultorio-${randomUUID()}`,
          members: { create: { userId, role: "OWNER" } },
          subscription: {
            create: {
              plan: "PRO",
              status: "PAUSED",
              monthlyPriceMxn: 800,
              includedMessagingMxn: 150,
            },
          },
        },
        select: { id: true },
      });
      await tx.doctor.update({
        where: { id: doctor.id },
        data: { clinicId: clinic.id },
      });
      // Preserve historical ownership and data; only attach currently unassigned records.
      await tx.service.updateMany({
        where: { doctorId: doctor.id, clinicId: null },
        data: { clinicId: clinic.id },
      });
      await tx.schedule.updateMany({
        where: { doctorId: doctor.id, clinicId: null },
        data: { clinicId: clinic.id },
      });
      await tx.appointment.updateMany({
        where: { doctorId: doctor.id, clinicId: null },
        data: { clinicId: clinic.id },
      });
      return { clinicId: clinic.id };
    },
    { isolationLevel: "Serializable" },
  );
}
