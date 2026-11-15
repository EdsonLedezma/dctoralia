import { describe, it, expect } from "vitest";
import { sortAppointmentHistory } from "./appointment-history";
describe("appointment history ordering", () => {
  it("places nearest future appointments first, then past appointments most recent first", () => {
    const rows = [
      { date: "2026-11-13", time: "12:00" },
      { date: "2026-11-16", time: "09:00" },
      { date: "2026-11-14", time: "08:00" },
      { date: "2026-11-15", time: "10:00" },
      { date: "2026-11-14", time: "11:00" },
    ];
    const original = [...rows];
    expect(
      sortAppointmentHistory(rows, new Date("2026-11-14T16:00:00Z")),
    ).toEqual([rows[4], rows[3], rows[1], rows[2], rows[0]]);
    expect(rows).toEqual(original);
  });
  it("uses clinic local time across a UTC date boundary", () => {
    const rows = [
      { date: "2026-12-01", time: "08:00" },
      { date: "2026-11-30", time: "21:00" },
      { date: "2026-11-30", time: "19:00" },
    ];
    expect(
      sortAppointmentHistory(rows, new Date("2026-12-01T02:00:00Z")),
    ).toEqual([rows[1], rows[0], rows[2]]);
  });
});
