import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { ClinicalActor } from "./access";
import type { ClinicalWorkflowError } from "./workflows";
import { issuePrescriptionInput } from "./schemas";
import {
  issueClinicalPrescription,
  voidClinicalPrescription,
} from "./workflows";

vi.mock("~/server/domain/messaging/follow-up-reminders", () => ({
  scheduleFollowUpReminder: vi.fn(),
}));

const actor: ClinicalActor = {
  userId: "doctor-user",
  doctorId: "doctor-id",
  clinicId: "clinic-id",
  workspaceRole: "DOCTOR",
};

const input = {
  encounterId: "encounter-id",
  medications: [
    {
      name: "Medicamento ficticio",
      dose: "Dosis de prueba",
      frequency: "Frecuencia de prueba",
    },
  ],
};

describe("recetas clínicas", () => {
  it("requiere un medicamento con dosis y frecuencia", () => {
    expect(
      issuePrescriptionInput.safeParse({
        encounterId: "clx1234567890123456789012",
        medications: input.medications,
      }).success,
    ).toBe(true);
    expect(
      issuePrescriptionInput.safeParse({
        encounterId: "clx1234567890123456789012",
        medications: [],
      }).success,
    ).toBe(false);
    expect(
      issuePrescriptionInput.safeParse({
        encounterId: "clx1234567890123456789012",
        medications: [{ name: "X", dose: "", frequency: "" }],
      }).success,
    ).toBe(false);
  });

  it("rechaza una receta si la consulta no está firmada por ese doctor", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const db = { clinicalEncounter: { findFirst } } as unknown as PrismaClient;
    await expect(
      issueClinicalPrescription(db, actor, input),
    ).rejects.toMatchObject({
      code: "INVALID_STATE",
    } satisfies Partial<ClinicalWorkflowError>);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clinicId: actor.clinicId,
          doctorId: actor.doctorId,
          authoredByUserId: actor.userId,
          status: "SIGNED",
        }),
      }),
    );
  });

  it("emite la receta y registra auditoría en la misma transacción", async () => {
    const create = vi.fn().mockResolvedValue({ id: "prescription-id" });
    const audit = vi.fn().mockResolvedValue({ id: "audit-id" });
    const tx = {
      clinicalPrescription: { create },
      clinicalAuditEvent: { create: audit },
    };
    const db = {
      clinicalEncounter: {
        findFirst: vi
          .fn()
          .mockResolvedValue({
            id: input.encounterId,
            patientId: "patient-id",
          }),
      },
      $transaction: vi.fn((callback: (value: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    } as unknown as PrismaClient;
    await issueClinicalPrescription(db, actor, input);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clinicId: actor.clinicId,
          patientId: "patient-id",
          medications: { create: input.medications },
        }),
      }),
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CLINICAL_PRESCRIPTION_ISSUED",
          resourceId: "prescription-id",
        }),
      }),
    );
  });

  it("no vuelve a anular una receta anulada", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const db = {
      clinicalPrescription: { findFirst },
    } as unknown as PrismaClient;
    await expect(
      voidClinicalPrescription(
        db,
        actor,
        "prescription-id",
        "Corrección ficticia",
      ),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          voidedAt: null,
          issuedByUserId: actor.userId,
        }),
      }),
    );
  });
});
