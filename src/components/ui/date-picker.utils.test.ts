import { describe, expect, it } from "vitest";
import {
  calendarDateValue,
  isCalendarDateInRange,
  parseCalendarDate,
  typedCalendarDate,
} from "./date-picker.utils";

describe("calendar dates", () => {
  it("round trips a local calendar day without changing its timezone", () => {
    const date = parseCalendarDate("2026-10-29");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9);
    expect(date?.getDate()).toBe(29);
    expect(date && calendarDateValue(date)).toBe("2026-10-29");
  });
  it("rejects overflow dates and accepts leap days only in leap years", () => {
    expect(typedCalendarDate("29/02/2024")).toBe("2024-02-29");
    expect(typedCalendarDate("29/02/2026")).toBeUndefined();
    expect(typedCalendarDate("31/04/2026")).toBeUndefined();
    expect(parseCalendarDate("2026-13-01")).toBeUndefined();
    expect(typedCalendarDate("2026-10-29")).toBeUndefined();
  });
  it("checks inclusive bounds without interpreting day strings as UTC", () => {
    expect(
      isCalendarDateInRange("2026-10-29", "2026-10-29", "2026-10-30"),
    ).toBe(true);
    expect(isCalendarDateInRange("2026-10-28", "2026-10-29")).toBe(false);
    expect(isCalendarDateInRange("2026-10-31", undefined, "2026-10-30")).toBe(
      false,
    );
  });
});
