import { describe, expect, it } from "vitest";
import { assignedConsultorio } from "./assigned-consultorio";
const first = {
  id: "one",
  clinicId: "clinic",
  isActive: true,
  address: "Av. Universidad 123",
};
const second = { ...first, id: "two" };
describe("doctor assigned consultorio", () => {
  it("uses the doctor's assignment among several sites", () =>
    expect(assignedConsultorio([first, second], "clinic", "two")).toBe(second));
  it("does not guess between multiple sites without an assignment", () =>
    expect(assignedConsultorio([first, second], "clinic")).toBeNull());
  it("allows an existing schedule to use its clinic's only site", () =>
    expect(assignedConsultorio([first], "clinic")).toBe(first));
  it("rejects archived, cross-clinic and addressless destinations", () => {
    expect(
      assignedConsultorio([{ ...first, isActive: false }], "clinic", "one"),
    ).toBeNull();
    expect(assignedConsultorio([first], "other", "one")).toBeNull();
    expect(
      assignedConsultorio([{ ...first, address: "  " }], "clinic", "one"),
    ).toBeNull();
  });
  it("does not silently move an assigned appointment to another site", () =>
    expect(assignedConsultorio([second], "clinic", "one")).toBeNull());
});
