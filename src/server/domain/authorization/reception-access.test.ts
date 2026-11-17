import { describe, expect, it } from "vitest";
import {
  appointmentScopeForActor,
  patientScopeForActor,
  doctorOwnedScheduleScope,
  doctorOwnedServiceScope,
  canManageAllAppointments,
} from "./access-policy";
import { redactAppointmentForReception } from "~/server/domain/appointments/reception-appointment";
import { selectedDoctorCookie } from "~/server/domain/workspaces/operational-actor";

describe("reception access boundaries", () => {
  const reception = {
    id: "staff-user",
    role: "DOCTOR" as const,
    receptionist: true,
    clinicId: "clinic-a",
    operationalDoctorId: "doctor-a",
  };
  it("scopes every reservation to the authorized doctor and clinic", () => {
    expect(appointmentScopeForActor(reception)).toEqual({
      clinicId: "clinic-a",
      doctorId: "doctor-a",
    });
    expect(
      appointmentScopeForActor({ ...reception, operationalDoctorId: null }),
    ).toEqual({ id: { in: [] } });
    expect(
      canManageAllAppointments({ ...reception, operationalDoctorId: null }),
    ).toBe(false);
  });
  it("does not grant clinical records or doctor-owned configuration to reception", () => {
    expect(patientScopeForActor(reception)).toEqual({ id: { in: [] } });
    expect(doctorOwnedScheduleScope(reception)).toBeNull();
    expect(doctorOwnedServiceScope(reception)).toBeNull();
  });
  it("redacts the entire intake and patient demographics while preserving contact and scheduling data", () => {
    const original = {
      id: "appointment",
      date: "2026-11-15",
      time: "10:00",
      reason: "private symptom",
      notes: "clinical note",
      severity: "HIGH" as const,
      intakeSymptoms: "private",
      intakeAllergies: "private",
      intakeMedications: "private",
      intakeContext: "private",
      patient: {
        id: "patient",
        phone: "+525512345678",
        birthDate: new Date("1980-01-01"),
        gender: "private",
        address: "private",
        user: { name: "Patient" },
      },
    };
    const result = redactAppointmentForReception(original);
    expect(result.reason).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.severity).toBeNull();
    expect(result.intakeSymptoms).toBeNull();
    expect(result.intakeAllergies).toBeNull();
    expect(result.intakeMedications).toBeNull();
    expect(result.intakeContext).toBeNull();
    expect(result.patient.birthDate).toBeNull();
    expect(result.patient.gender).toBeNull();
    expect(result.patient.address).toBeNull();
    expect(result.patient.phone).toBe(original.patient.phone);
    expect(result.time).toBe("10:00");
    expect(original.notes).toBe("clinical note");
  });
  it("reads the chosen doctor's cookie safely without granting a clinic itself", () => {
    expect(
      selectedDoctorCookie(
        new Headers({ cookie: "other=1; dopilot-doctor=doctor-a" }),
      ),
    ).toBe("doctor-a");
    expect(
      selectedDoctorCookie(new Headers({ cookie: "dopilot-doctor=%" })),
    ).toBeUndefined();
  });
});
