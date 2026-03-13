import { describe, expect, it } from "vitest";

import {
  combineDateAndTime,
  formatDateForResponse,
  isValidFutureDate,
  parseDate,
  parseDateAndTime,
  parseTime,
} from "./date-parser";

describe("date-parser", () => {
  it("parsea fecha ISO", () => {
    const result = parseDate("2026-03-20");

    expect(result).not.toBeNull();
    expect(formatDateForResponse(result!)).toBe("2026-03-20");
  });

  it("parsea fecha en formato latino DD/MM/YYYY", () => {
    const result = parseDate("20/03/2026");

    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(2);
    expect(result!.getDate()).toBe(20);
  });

  it("normaliza hora sin cero inicial", () => {
    expect(parseTime("9:05")).toBe("09:05");
  });

  it("normaliza hora numerica sin dos puntos", () => {
    expect(parseTime(930)).toBe("09:30");
    expect(parseTime("1430")).toBe("14:30");
  });

  it("rechaza hora invalida", () => {
    expect(parseTime("25:01")).toBeNull();
    expect(parseTime("10:70")).toBeNull();
  });

  it("combina fecha y hora correctamente", () => {
    const date = new Date("2026-03-20T00:00:00.000Z");
    const combined = combineDateAndTime(date, "14:45");

    expect(combined).not.toBeNull();
    expect(combined!.getHours()).toBe(14);
    expect(combined!.getMinutes()).toBe(45);
  });

  it("parsea fecha y hora como objeto conjunto", () => {
    const result = parseDateAndTime("2026-03-20", "1030");

    expect(result).not.toBeNull();
    expect(formatDateForResponse(result!.date)).toBe("2026-03-20");
    expect(result!.time).toBe("10:30");
  });

  it("valida fecha futura", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    expect(isValidFutureDate(yesterday)).toBe(false);
    expect(isValidFutureDate(tomorrow)).toBe(true);
  });
});
