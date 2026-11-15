import { describe, it, expect } from "vitest";
import { notificationTarget } from "./notification-target";
describe("notification destinations", () => {
  it("opens the exact doctor's appointment", () => {
    expect(
      notificationTarget("DOCTOR", {
        appointmentId: "appointment-id",
        patientId: "patient",
      }),
    ).toBe("/dashboard/appointments?appointmentId=appointment-id");
  });
  it("opens the exact assigned follow-up", () => {
    expect(
      notificationTarget("DOCTOR", {
        followUpTaskId: "task",
        patientId: "patient",
      }),
    ).toBe("/dashboard/follow-ups?taskId=task");
  });
  it("never sends a patient into the doctor's workspace", () => {
    expect(
      notificationTarget("PATIENT", {
        followUpTaskId: "task",
        appointmentId: "appointment",
        patientId: "patient",
      }),
    ).toBe("/patient/appointments/appointment");
    expect(
      notificationTarget("PATIENT", {
        followUpTaskId: "task",
        patientId: "patient",
      }),
    ).toBe("/patient/medical-history");
  });
  it("opens the referenced patient file for other doctor notices", () => {
    expect(notificationTarget("DOCTOR", { patientId: "patient" })).toBe(
      "/dashboard/patients/patient",
    );
  });
});
