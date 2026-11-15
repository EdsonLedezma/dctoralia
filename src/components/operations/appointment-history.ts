import type { DailyAppointment } from "~/components/operations/appointments.types";

/** Upcoming appointments first, then history from most recent to oldest. */
export function sortAppointmentHistory<
  T extends Pick<DailyAppointment, "date" | "time">,
>(rows: readonly T[], now: Date, timezone = "America/Mexico_City") {
  const day = new Intl.DateTimeFormat("en-CA", {
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
  const key = (row: T) => row.date + "T" + row.time;
  const current = day + "T" + time;
  return [...rows].sort((a, b) => {
    const first = key(a),
      second = key(b);
    const futureA = first >= current,
      futureB = second >= current;
    if (futureA !== futureB) return futureA ? -1 : 1;
    return futureA ? first.localeCompare(second) : second.localeCompare(first);
  });
}
