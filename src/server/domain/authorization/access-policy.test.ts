import { describe, expect, it } from "vitest";

import {
  appointmentScopeForActor,
  canManageAllAppointments,
  doctorOwnedScheduleScope,
  doctorOwnedServiceScope,
} from "./access-policy";

describe("access-policy", () => {
  it("acota las citas de un doctor por su userId", () => {
    expect(
      appointmentScopeForActor({ id: "doctor-user", role: "DOCTOR" }),
    ).toEqual({ doctor: { userId: "doctor-user" } });
  });

  it("acota las citas de un paciente por su userId", () => {
    expect(
      appointmentScopeForActor({ id: "patient-user", role: "PATIENT" }),
    ).toEqual({ patient: { userId: "patient-user" } });
  });

  it("permite al administrador consultar el conjunto completo", () => {
    expect(
      appointmentScopeForActor({ id: "admin-user", role: "ADMIN" }),
    ).toEqual({});
  });

  it("sólo genera scopes de recursos médicos para doctores", () => {
    const doctor = { id: "doctor-user", role: "DOCTOR" } as const;
    const patient = { id: "patient-user", role: "PATIENT" } as const;

    expect(doctorOwnedServiceScope(doctor)).toEqual({
      doctor: { userId: "doctor-user" },
    });
    expect(doctorOwnedScheduleScope(doctor)).toEqual({
      doctor: { userId: "doctor-user" },
    });
    expect(doctorOwnedServiceScope(patient)).toBeNull();
    expect(doctorOwnedScheduleScope(patient)).toBeNull();
  });

  it("reserva las operaciones clínicas globales para doctor y admin", () => {
    expect(
      canManageAllAppointments({ id: "doctor-user", role: "DOCTOR" }),
    ).toBe(true);
    expect(canManageAllAppointments({ id: "admin-user", role: "ADMIN" })).toBe(
      true,
    );
    expect(
      canManageAllAppointments({ id: "patient-user", role: "PATIENT" }),
    ).toBe(false);
  });
});
