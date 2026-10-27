import { describe, expect, it } from "vitest";

import {
  getUtcDayBounds,
  getNextAvailableAppointmentSlot,
  hasTimeConflict,
  isSlotInsideSchedule,
  isTodayOrFuture,
  timeToMinutes,
} from "./appointment-time";

describe("appointment-time", () => {
  it("acepta únicamente horas normalizadas", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("9:30")).toBeNull();
    expect(timeToMinutes("24:00")).toBeNull();
  });

  it("incluye la duración completa dentro del horario", () => {
    expect(isSlotInsideSchedule("09:30", 30, "09:00", "10:00")).toBe(true);
    expect(isSlotInsideSchedule("09:45", 30, "09:00", "10:00")).toBe(false);
  });

  it("detecta solapamientos aunque las citas no inicien a la misma hora", () => {
    const existing = [{ time: "10:00", duration: 60 }];

    expect(hasTimeConflict("09:30", 60, existing)).toBe(true);
    expect(hasTimeConflict("10:30", 30, existing)).toBe(true);
    expect(hasTimeConflict("11:00", 30, existing)).toBe(false);
  });

  it("calcula un rango UTC de día completo", () => {
    const bounds = getUtcDayBounds(new Date("2026-09-16T18:30:00.000Z"));

    expect(bounds.start.toISOString()).toBe("2026-09-16T00:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-09-17T00:00:00.000Z");
  });

  it("rechaza días pasados", () => {
    const now = new Date("2026-09-16T18:30:00.000Z");

    expect(isTodayOrFuture(new Date("2026-09-15T12:00:00.000Z"), now)).toBe(
      false,
    );
    expect(isTodayOrFuture(new Date("2026-09-16T01:00:00.000Z"), now)).toBe(
      false,
    );
    expect(isTodayOrFuture(new Date("2026-09-16T12:00:00.000Z"), now)).toBe(
      true,
    );
  });

  it("encuentra el primer espacio libre sin ofrecer citas pasadas ni solapadas", () => {
    const now = new Date("2026-10-16T15:30:00.000Z"); // 09:30 en CDMX
    expect(
      getNextAvailableAppointmentSlot({
        now,
        schedules: [{ dayOfWeek: 5, startTime: "09:00", endTime: "11:00" }],
        appointments: [
          {
            date: new Date("2026-10-16T00:00:00.000Z"),
            time: "09:45",
            duration: 30,
          },
        ],
        duration: 30,
      }),
    ).toEqual({ date: "2026-10-16", time: "10:15" });
  });

  it("continúa al siguiente día cuando la jornada actual está ocupada", () => {
    expect(
      getNextAvailableAppointmentSlot({
        now: new Date("2026-10-16T15:30:00.000Z"),
        schedules: [
          { dayOfWeek: 5, startTime: "09:00", endTime: "10:00" },
          { dayOfWeek: 6, startTime: "09:00", endTime: "10:00" },
        ],
        appointments: [
          {
            date: new Date("2026-10-16T00:00:00.000Z"),
            time: "09:00",
            duration: 60,
          },
        ],
        duration: 30,
      }),
    ).toEqual({ date: "2026-10-17", time: "09:00" });
  });
});
