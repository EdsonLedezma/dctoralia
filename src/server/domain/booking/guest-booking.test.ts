import { describe, it, expect, vi } from "vitest";
import {
  bookingInput,
  bookingPhone,
  calendarDate,
} from "./guest-booking.schema";
import { bookingInstant } from "./guest-booking";
vi.mock("~/env", () => ({ env: {} }));
const id = "cl123456789012345678901234";
describe("guest booking boundary", () => {
  it("normalizes a Mexican phone without creating an identity claim", () => {
    expect(bookingPhone.parse("55 1234 5678")).toBe("+525512345678");
    expect(bookingPhone.safeParse("sin teléfono").success).toBe(false);
  });
  it("rejects fabricated calendar dates and invalid hours", () => {
    expect(calendarDate.safeParse("2026-02-30").success).toBe(false);
    expect(
      bookingInput.safeParse({
        name: "Paciente",
        phone: "5512345678",
        doctorId: id,
        serviceId: id,
        date: "2026-12-01",
        time: "25:00",
      }).success,
    ).toBe(false);
  });
  it("never accepts patient or clinic identity from public arguments", () => {
    const input = {
      name: "Paciente",
      phone: "5512345678",
      doctorId: id,
      serviceId: id,
      date: "2026-12-01",
      time: "10:00",
    };
    expect(bookingInput.parse(input).contactConsent).toBe(false);
    expect(bookingInput.safeParse({ ...input, patientId: id }).success).toBe(
      false,
    );
    expect(bookingInput.safeParse({ ...input, clinicId: id }).success).toBe(
      false,
    );
  });
  it("uses the clinic's local clock rather than UTC midnight", () => {
    expect(
      bookingInstant(
        "2026-12-01",
        "09:00",
        "America/Mexico_City",
      ).toISOString(),
    ).toBe("2026-12-01T15:00:00.000Z");
  });
  it("rejects a local hour that does not exist during a daylight-saving change", () => {
    expect(() =>
      bookingInstant("2026-03-08", "02:30", "America/New_York"),
    ).toThrow("Horario no válido");
  });
});
