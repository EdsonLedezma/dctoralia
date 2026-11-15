import { describe, expect, it } from "vitest";
import type { AppointmentStatus } from "@prisma/client";
import { getDoctorWorkday } from "./doctor-workday";
function appointment(
  date: string,
  time: string,
  status: AppointmentStatus = "CONFIRMED",
  patientId = "patient",
) {
  return { date: new Date(date + "T00:00:00Z"), time, status, patientId };
}
describe("doctor workday", () => {
  it("uses the clinic day around midnight rather than the device or UTC day", () => {
    const now = new Date("2026-12-01T02:00:00Z");
    const appointments = [
      appointment("2026-11-30", "21:00"),
      appointment("2026-12-01", "09:00"),
    ];
    const day = getDoctorWorkday(appointments, now, "America/Mexico_City");
    expect(day.todayAppointments).toEqual([appointments[0]]);
    expect(day.upcomingAppointments).toEqual([appointments[1]]);
    expect(day.nextToday).toEqual(appointments[0]);
  });
  it("retains every active appointment today, with past hours available for review", () => {
    const appointments = Array.from({ length: 9 }, (_, index) =>
      appointment("2026-11-14", `${String(8 + index).padStart(2, "0")}:00`),
    );
    const day = getDoctorWorkday(
      appointments,
      new Date("2026-11-14T16:30:00Z"),
      "America/Mexico_City",
    );
    expect(day.todayAppointments).toHaveLength(9);
    expect(day.todayAppointments[0]?.time).toBe("08:00");
    expect(day.nextToday?.time).toBe("11:00");
    expect(day.upcomingAppointments).toEqual([]);
  });
  it("excludes closed appointments from the agenda and never repeats today in upcoming days", () => {
    const rows = [
      appointment("2026-11-14", "08:00", "COMPLETED"),
      appointment("2026-11-14", "10:00", "CANCELLED"),
      appointment("2026-11-15", "09:00", "PENDING"),
      appointment("2026-11-15", "08:00"),
      appointment("2026-11-15", "11:00", "NO_SHOW"),
    ];
    const day = getDoctorWorkday(
      rows,
      new Date("2026-11-14T15:00:00Z"),
      "America/Mexico_City",
    );
    expect(day.todayAppointments).toEqual([]);
    expect(day.upcomingAppointments.map((row) => row.time)).toEqual([
      "08:00",
      "09:00",
    ]);
    expect(day.pendingCount).toBe(1);
  });
  it("counts completions in the clinic's current month and patients uniquely", () => {
    const day = getDoctorWorkday(
      [
        appointment("2026-11-30", "09:00", "COMPLETED"),
        appointment("2026-12-01", "09:00", "COMPLETED"),
        appointment("2026-11-29", "09:00", "CANCELLED", "cancelled-only"),
      ],
      new Date("2026-12-01T02:00:00Z"),
      "America/Mexico_City",
    );
    expect(day.completedThisMonth).toBe(1);
    expect(day.activePatients).toBe(1);
  });
});
