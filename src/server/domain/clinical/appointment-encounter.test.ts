import { afterEach, describe, expect, it, vi } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ensureAppointmentEncounter } from "./appointment-encounter";
vi.mock("./workflows", () => ({
  ClinicalWorkflowError: class extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));
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
const input = { appointmentId: "appointment", patientId: "patient" };
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
  reason: "Motivo referido ficticio",
  intakeSymptoms: "Síntoma referido ficticio",
  intakeAllergies: null,
  intakeMedications: null,
  intakeContext: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lifecycleEvents: [{ id: "start" }],
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
  chiefComplaint: "Motivo referido ficticio",
  subjective: null,
  objective: null,
  assessment: null,
  plan: null,
  patientSummary: null,
  signedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
afterEach(() => vi.restoreAllMocks());
describe("opening a booked clinical encounter", () => {
  it("rejects an appointment outside the clinician and patient scope before creating records", async () => {
    const query = vi.spyOn(db.appointment, "findFirst").mockResolvedValue(null);
    const create = vi.spyOn(db.clinicalEncounter, "create");
    await expect(
      ensureAppointmentEncounter(db, actor, input),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: input.appointmentId,
          patientId: input.patientId,
          clinicId: actor.clinicId,
          doctorId: actor.doctorId,
        },
      }),
    );
    expect(create).not.toHaveBeenCalled();
  });
  it("reopens the existing draft instead of creating another consultation", async () => {
    vi.spyOn(db.appointment, "findFirst").mockResolvedValue(appointment);
    vi.spyOn(db.clinicalEncounter, "findFirst").mockResolvedValue(draft);
    const create = vi.spyOn(db.clinicalEncounter, "create");
    expect(await ensureAppointmentEncounter(db, actor, input)).toEqual(draft);
    expect(create).not.toHaveBeenCalled();
  });
  it("does not allow taking over a draft authored by another professional", async () => {
    vi.spyOn(db.appointment, "findFirst").mockResolvedValue(appointment);
    vi.spyOn(db.clinicalEncounter, "findFirst").mockResolvedValue({
      ...draft,
      authoredByUserId: "someone-else",
    });
    await expect(
      ensureAppointmentEncounter(db, actor, input),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("requires the consultation-start event before making a draft", async () => {
    const notStarted = { ...appointment, lifecycleEvents: [] };
    vi.spyOn(db.appointment, "findFirst").mockResolvedValue(notStarted);
    vi.spyOn(db.clinicalEncounter, "findFirst").mockResolvedValue(null);
    const create = vi.spyOn(db.clinicalEncounter, "create");
    await expect(
      ensureAppointmentEncounter(db, actor, input),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(create).not.toHaveBeenCalled();
  });
  it("creates an attributed draft from patient-reported brief and audits it atomically", async () => {
    vi.spyOn(db.appointment, "findFirst").mockResolvedValue(appointment);
    vi.spyOn(db.clinicalEncounter, "findFirst").mockResolvedValue(null);
    const create = vi
      .spyOn(db.clinicalEncounter, "create")
      .mockResolvedValue(draft);
    const audit = vi.spyOn(db.clinicalAuditEvent, "create").mockResolvedValue({
      id: "audit",
      clinicId: "clinic",
      patientId: "patient",
      actorUserId: "doctor-user",
      resourceType: "CLINICAL_ENCOUNTER",
      resourceId: "encounter",
      action: "CLINICAL_ENCOUNTER_DRAFT_CREATED",
      metadata: null,
      createdAt: new Date(),
    });
    vi.spyOn(db, "$transaction").mockImplementation(async (callback) =>
      callback(db),
    );
    await ensureAppointmentEncounter(db, actor, input);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        appointmentId: "appointment",
        authoredByUserId: "doctor-user",
        chiefComplaint: "Motivo referido ficticio",
        subjective: "Síntomas referidos: Síntoma referido ficticio",
      }),
    });
    expect(audit).toHaveBeenCalledTimes(1);
  });
  it("recovers the one draft created by a simultaneous opening request", async () => {
    vi.spyOn(db.appointment, "findFirst").mockResolvedValue(appointment);
    const find = vi
      .spyOn(db.clinicalEncounter, "findFirst")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(draft);
    vi.spyOn(db, "$transaction").mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique appointment", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    expect(await ensureAppointmentEncounter(db, actor, input)).toEqual(draft);
    expect(find).toHaveBeenLastCalledWith({
      where: expect.objectContaining({
        appointmentId: input.appointmentId,
        clinicId: actor.clinicId,
        doctorId: actor.doctorId,
        authoredByUserId: actor.userId,
      }),
    });
  });
});
