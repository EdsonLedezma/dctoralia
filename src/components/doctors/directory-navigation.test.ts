import { describe, expect, it } from "vitest";
import { directoryReturnHref } from "./directory-navigation";
describe("public directory return path", () => {
  it("preserves public and patient directory filters", () => {
    expect(directoryReturnHref("/doctores?city=Chihuahua")).toBe(
      "/doctores?city=Chihuahua",
    );
    expect(directoryReturnHref("/patient/doctors?sort=rating")).toBe(
      "/patient/doctors?sort=rating",
    );
  });
  it("rejects external destinations, path extensions and backslashes", () => {
    expect(directoryReturnHref("https://attacker.example/doctores")).toBe(
      "/patient/doctors",
    );
    expect(directoryReturnHref("/doctores/fake")).toBe("/patient/doctors");
    expect(directoryReturnHref("/doctores?return=\\attacker")).toBe(
      "/patient/doctors",
    );
  });
});
