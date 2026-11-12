import { describe, expect, it } from "vitest";
import {
  directoryDoctor,
  service,
  availableDay,
  calendarDay,
} from "../../../tests/fixtures/discovery";
import {
  defaultDirectoryFilters,
  directoryFilterQuery,
  filterDirectory,
  readDirectoryFilters,
} from "./directory-model";
import { directoryReturnHref } from "./directory-navigation";

describe("doctor discovery", () => {
  it("matches accents and specialty codes while keeping city filters", () => {
    const doctors = [
      directoryDoctor({ specialty: "medicina-general" }),
      directoryDoctor({
        id: "second",
        specialty: "cardiologia",
        city: "Guadalajara",
        state: "Jalisco",
      }),
    ];
    expect(
      filterDirectory(doctors, {
        ...defaultDirectoryFilters,
        search: "medicina general",
      }).map((item) => item.id),
    ).toEqual([doctors[0]!.id]);
    expect(
      filterDirectory(doctors, {
        ...defaultDirectoryFilters,
        specialty: "Cardiología",
        city: "Guadalajara",
      }).map((item) => item.id),
    ).toEqual(["second"]);
    expect(
      filterDirectory(doctors, { ...defaultDirectoryFilters, search: "mexico" })
        .length,
    ).toBe(1);
  });
  it("sorts by earliest date before time and puts unavailable profiles last", () => {
    const doctors = [
      directoryDoctor({
        id: "later",
        nextAvailable: { date: calendarDay(2), time: "08:00" },
      }),
      directoryDoctor({ id: "none", nextAvailable: null }),
      directoryDoctor({
        id: "earlier",
        nextAvailable: { date: availableDay, time: "18:00" },
      }),
    ];
    expect(
      filterDirectory(doctors, {
        ...defaultDirectoryFilters,
        sort: "availability",
      }).map((item) => item.id),
    ).toEqual(["earlier", "later", "none"]);
    expect(doctors[0]!.id).toBe("later");
  });
  it("uses active services for prices and retains filters in links", () => {
    const doctors = [
      directoryDoctor({
        id: "none",
        services: [{ ...service, isActive: false }],
      }),
      directoryDoctor({
        id: "costly",
        services: [{ ...service, price: 1200 }],
      }),
      directoryDoctor({ id: "lower", services: [{ ...service, price: 700 }] }),
    ];
    expect(
      filterDirectory(doctors, {
        ...defaultDirectoryFilters,
        sort: "price",
      }).map((item) => item.id),
    ).toEqual(["lower", "costly", "none"]);
    const filters = {
      ...defaultDirectoryFilters,
      search: "Alicia",
      city: "Ciudad de México",
      sort: "price" as const,
    };
    expect(
      readDirectoryFilters(new URLSearchParams(directoryFilterQuery(filters))),
    ).toEqual(filters);
  });
  it("keeps directory return destinations internal and ignores unsupported sort", () => {
    expect(directoryReturnHref("/patient/doctors?q=Alicia&sort=price")).toBe(
      "/patient/doctors?q=Alicia&sort=price",
    );
    for (const href of [
      "https://outside.test",
      "/patient/profile",
      "/patient/doctors/../profile",
      "//outside.test",
    ])
      expect(directoryReturnHref(href)).toBe("/patient/doctors");
    expect(readDirectoryFilters(new URLSearchParams("sort=invalid")).sort).toBe(
      "rating",
    );
  });
});
