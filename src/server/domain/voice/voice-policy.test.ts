import { describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  parseVoiceEnvelope,
  resolveVoiceLine,
  vapiPhoneNumberId,
} from "./voice-context";
import {
  hashVoiceCode,
  voiceAppointmentScope,
  voiceDate,
  voiceSchemas,
} from "./voice-policy";
import {
  executeVoiceAppointment,
  listVoiceAppointments,
  voiceSlots,
} from "./voice-appointments";
vi.mock("~/env", () => ({ env: {} }));

const phoneId = "550e8400-e29b-41d4-a716-446655440000";
const otherId = "550e8400-e29b-41d4-a716-446655440001";
// No connections: every database method exercised below is mocked.
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: "postgresql://unused:unused@localhost:1/unused",
  }),
});
const line = {
  id: "line",
  clinicId: "clinic",
  doctorId: "doctor",
  phoneNumber: "+525512345678",
  vapiPhoneNumberId: phoneId,
  vapiDialInNumber: null,
  vapiAssistantId: otherId,
  status: "ACTIVE" as const,
  enabled: true,
  mutationsEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  doctor: { clinicId: "clinic", userId: "doctor-user" },
  clinic: {
    timezone: "America/Mexico_City",
    subscription: { status: "ACTIVE" as const, voiceAgentEnabled: true },
  },
};

describe("voice identity and opt-in", () => {
  it("rejects conflicting called-number metadata and web calls", () => {
    expect(
      vapiPhoneNumberId({
        phoneNumber: { id: phoneId },
        call: { phoneNumberId: otherId },
      }),
    ).toBeNull();
    expect(
      parseVoiceEnvelope({
        call: { id: otherId, phoneNumberId: phoneId, type: "webCall" },
      }),
    ).toBeNull();
    expect(
      parseVoiceEnvelope({
        call: { id: otherId, phoneNumberId: phoneId, type: "inboundPhoneCall" },
      })?.phoneNumberId,
    ).toBe(phoneId);
  });
  it("requires both the purchased entitlement and the doctor's consent", async () => {
    const query = vi.spyOn(db.voiceAgentLine, "findUnique");
    query.mockResolvedValueOnce({ ...line, enabled: false });
    expect(await resolveVoiceLine(db, phoneId)).toBeNull();
    const unlicensed = {
      ...line,
      clinic: {
        ...line.clinic,
        subscription: { status: "ACTIVE" as const, voiceAgentEnabled: false },
      },
    };
    query.mockResolvedValueOnce(unlicensed);
    expect(await resolveVoiceLine(db, phoneId)).toBeNull();
    query.mockResolvedValueOnce(line);
    expect((await resolveVoiceLine(db, phoneId))?.doctorId).toBe("doctor");
    query.mockRestore();
  });
  it("rejects injected doctor identities and requires explicit confirmation", () => {
    const input = {
      serviceId: "service",
      date: "2026-12-01",
      time: "10:00",
      confirmed: true,
    };
    expect(voiceSchemas.create_appointment.safeParse(input).success).toBe(true);
    expect(
      voiceSchemas.create_appointment.safeParse({
        ...input,
        doctorId: "someone-else",
      }).success,
    ).toBe(false);
    expect(
      voiceSchemas.create_appointment.safeParse({ ...input, confirmed: false })
        .success,
    ).toBe(false);
    expect(voiceDate.safeParse("2026-02-30").success).toBe(false);
  });
  it("binds codes and appointment queries to the actual doctor and patient", () => {
    expect(hashVoiceCode("12345678", "line-one", "secret")).not.toBe(
      hashVoiceCode("12345678", "line-two", "secret"),
    );
    expect(voiceAppointmentScope(line, "patient")).toEqual({
      clinicId: "clinic",
      doctorId: "doctor",
      patientId: "patient",
    });
  });
  it("blocks writes before opening a transaction when the doctor permits queries only", async () => {
    const tx = vi.spyOn(db, "$transaction");
    await expect(
      executeVoiceAppointment(
        db,
        { ...line, mutationsEnabled: false },
        otherId,
        { name: "cancel_appointment", appointmentId: "appointment" },
      ),
    ).rejects.toThrow("solo habilitó consultas");
    expect(tx).not.toHaveBeenCalled();
    tx.mockRestore();
  });
  it("does not query appointments before patient verification", async () => {
    const session = vi
      .spyOn(db.voiceCallSession, "findUnique")
      .mockResolvedValue(null);
    const appointments = vi.spyOn(db.appointment, "findMany");
    await expect(listVoiceAppointments(db, line, otherId)).rejects.toThrow(
      "Verifica primero",
    );
    expect(appointments).not.toHaveBeenCalled();
    session.mockRestore();
    appointments.mockRestore();
  });
  it("respects split office hours, busy appointments and the office timezone", () => {
    const slots = voiceSlots(
      "2026-12-01",
      30,
      [
        { startTime: "09:00", endTime: "10:00" },
        { startTime: "11:00", endTime: "12:00" },
      ],
      [{ time: "09:15", duration: 30 }],
      "America/Mexico_City",
      new Date("2026-12-01T15:30:00Z"),
    );
    expect(slots).toEqual(["11:00", "11:15", "11:30"]);
  });
});
