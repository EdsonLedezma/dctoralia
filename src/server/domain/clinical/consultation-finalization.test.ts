import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const effects = vi.hoisted(() => ({
  completed: vi.fn(),
  lifecycle: vi.fn(),
  cancelReminders: vi.fn(),
}));
vi.mock("~/server/domain/patient-portal/consultation-completed", () => ({
  afterConsultationCompleted: effects.completed,
}));
vi.mock("~/server/domain/appointments/lifecycle", () => ({
  recordAppointmentLifecycleEvent: effects.lifecycle,
}));
vi.mock("~/server/domain/messaging/appointment-reminders", () => ({
  cancelPendingAppointmentReminders: effects.cancelReminders,
}));
vi.mock("~/server/domain/messaging/follow-up-reminders", () => ({
  scheduleFollowUpReminder: vi.fn(),
}));
import { signClinicalEncounter } from "./workflows";
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: "postgresql://unused:unused@localhost:1/unused",
  }),
});
const actor = {
  userId: "doctor-user",
  doctorId: "doctor",
  clinicId: "clinic",
  workspaceRole: "DOCTOR" as const,
};
const draft = {
  id: "encounter",
  clinicId: "clinic",
  doctorId: "doctor",
  patientId: "patient",
  authoredByUserId: "doctor-user",
  appointmentId: "appointment",
  episodeId: null,
  status: "DRAFT" as const,
  encounterAt: new Date(),
  chiefComplaint: "Motivo ficticio de prueba",
  subjective: null,
  objective: null,
  assessment: null,
  plan: null,
  patientSummary: null,
  signedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const appointment = {
  id: "appointment",
  patientId: "patient",
  doctorId: "doctor",
  clinicId: "clinic",
  serviceId: "service",
  locationId: null,
  locationName: null,
  locationAddress: null,
  locationDirections: null,
  locationLatitude: null,
  locationLongitude: null,
  date: new Date(),
  time: "09:00",
  duration: 30,
  status: "CONFIRMED" as const,
  severity: null,
  notes: null,
  reason: null,
  intakeSymptoms: null,
  intakeAllergies: null,
  intakeMedications: null,
  intakeContext: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.spyOn(db, "$transaction").mockImplementation(async (callback) =>
    callback(db),
  );
});
describe("finalizing a consultation", () => {
  it("signs the doctor's draft, completes its appointment and grants portal benefits in one transaction", async () => {
    const signed = {
      ...draft,
      status: "SIGNED" as const,
      signedAt: new Date(),
    };
    vi.spyOn(db.clinicalEncounter, "findFirst").mockResolvedValue(draft);
    const sign = vi
      .spyOn(db.clinicalEncounter, "updateMany")
      .mockResolvedValue({ count: 1 });
    vi.spyOn(db.clinicalEncounter, "findUniqueOrThrow").mockResolvedValue(
      signed,
    );
    vi.spyOn(db.appointment, "findFirst").mockResolvedValue(appointment);
    const complete = vi
      .spyOn(db.appointment, "updateMany")
      .mockResolvedValue({ count: 1 });
    vi.spyOn(db.clinicalAuditEvent, "create").mockResolvedValue({
      id: "audit",
      clinicId: "clinic",
      patientId: "patient",
      actorUserId: "doctor-user",
      resourceType: "CLINICAL_ENCOUNTER",
      resourceId: "encounter",
      action: "CLINICAL_ENCOUNTER_SIGNED",
      metadata: null,
      createdAt: new Date(),
    });
    expect(await signClinicalEncounter(db, actor, draft.id)).toEqual(signed);
    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          authoredByUserId: actor.userId,
          status: "DRAFT",
        }),
        data: { status: "SIGNED", signedAt: expect.any(Date) },
      }),
    );
    expect(complete).toHaveBeenCalledWith({
      where: { id: appointment.id, status: "CONFIRMED" },
      data: { status: "COMPLETED" },
    });
    expect(effects.lifecycle.mock.calls[0]?.[0]).toBe(db);
    expect(effects.lifecycle.mock.calls[0]?.[1]).toMatchObject({
      appointmentId: appointment.id,
      toStatus: "COMPLETED",
      idempotencyKey: "encounter-completed:encounter",
    });
    expect(effects.completed.mock.calls[0]?.[0]).toBe(db);
    expect(effects.completed.mock.calls[0]?.slice(1)).toEqual([actor, draft]);
    expect(complete.mock.invocationCallOrder[0]).toBeLessThan(
      effects.completed.mock.invocationCallOrder[0] ?? Infinity,
    );
  });
  it("replays a signed/completed consultation without signing or auditing it twice", async () => {
    const signed = {
      ...draft,
      status: "SIGNED" as const,
      signedAt: new Date(),
    };
    vi.spyOn(db.clinicalEncounter, "findFirst").mockResolvedValue(signed);
    vi.spyOn(db.clinicalEncounter, "findUniqueOrThrow").mockResolvedValue(
      signed,
    );
    vi.spyOn(db.appointment, "findFirst").mockResolvedValue({
      ...appointment,
      status: "COMPLETED",
    });
    const update = vi.spyOn(db.clinicalEncounter, "updateMany");
    const complete = vi.spyOn(db.appointment, "updateMany");
    const audit = vi.spyOn(db.clinicalAuditEvent, "create");
    await signClinicalEncounter(db, actor, signed.id);
    expect(update).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
    expect(effects.lifecycle).not.toHaveBeenCalled();
    expect(effects.completed.mock.calls[0]?.[0]).toBe(db);
    expect(effects.completed.mock.calls[0]?.slice(1)).toEqual([actor, signed]);
  });
  it("does not finalize a consultation outside the doctor's authored scope", async () => {
    const find = vi
      .spyOn(db.clinicalEncounter, "findFirst")
      .mockResolvedValue(null);
    await expect(
      signClinicalEncounter(db, actor, "not-owned"),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(find).toHaveBeenCalledWith({
      where: {
        id: "not-owned",
        clinicId: actor.clinicId,
        doctorId: actor.doctorId,
        authoredByUserId: actor.userId,
      },
    });
    expect(effects.completed).not.toHaveBeenCalled();
  });
  it("rejects signing a completely empty clinical draft", async () => {
    vi.spyOn(db.clinicalEncounter, "findFirst").mockResolvedValue({
      ...draft,
      chiefComplaint: null,
    });
    const update = vi.spyOn(db.clinicalEncounter, "updateMany");
    await expect(
      signClinicalEncounter(db, actor, draft.id),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(update).not.toHaveBeenCalled();
    expect(effects.completed).not.toHaveBeenCalled();
  });
});
