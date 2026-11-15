import type { AppointmentStatus } from "@prisma/client";

type WorkdayAppointment = {
  date: Date;
  time: string;
  status: AppointmentStatus;
  patientId: string;
};

/** Appointment.date stores a calendar day in UTC; time is local to the clinic. */
export function getDoctorWorkday<T extends WorkdayAppointment>(
  appointments: readonly T[],
  now: Date,
  timezone: string,
) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("es-MX", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const calendarDay = (appointment: T) =>
    appointment.date.toISOString().slice(0, 10);
  const active = (appointment: T) =>
    appointment.status === "PENDING" || appointment.status === "CONFIRMED";
  const todayAppointments = appointments
    .filter(
      (appointment) =>
        active(appointment) && calendarDay(appointment) === today,
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  const upcomingAppointments = appointments
    .filter(
      (appointment) => active(appointment) && calendarDay(appointment) > today,
    )
    .sort(
      (a, b) =>
        calendarDay(a).localeCompare(calendarDay(b)) ||
        a.time.localeCompare(b.time),
    )
    .slice(0, 4);
  return {
    todayAppointments,
    upcomingAppointments,
    nextToday: todayAppointments.find(
      (appointment) => appointment.time >= time,
    ),
    pendingCount: appointments.filter(
      (appointment) => appointment.status === "PENDING",
    ).length,
    completedThisMonth: appointments.filter(
      (appointment) =>
        appointment.status === "COMPLETED" &&
        calendarDay(appointment).slice(0, 7) === today.slice(0, 7),
    ).length,
    activePatients: new Set(
      appointments
        .filter((appointment) => appointment.status !== "CANCELLED")
        .map((appointment) => appointment.patientId),
    ).size,
  };
}
