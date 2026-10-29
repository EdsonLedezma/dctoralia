import { describe, expect, it } from "vitest";

import { rankOptions } from "./searchable-select.utils";

const options = [
  {
    value: "1",
    label: "Pediatría",
    description: "Consulta infantil",
    keywords: ["niños", "menores"],
  },
  {
    value: "2",
    label: "Medicina General",
    description: "Valoración inicial",
    keywords: ["chequeo", "revisión"],
  },
];

describe("búsqueda de opciones", () => {
  it("ignora acentos y mayúsculas", () => {
    expect(
      rankOptions(options, "PEDIATRIA").map((option) => option.value),
    ).toEqual(["1"]);
  });

  it("encuentra conceptos relacionados y varias palabras", () => {
    expect(rankOptions(options, "ninos").map((option) => option.value)).toEqual(
      ["1"],
    );
    expect(
      rankOptions(options, "medicina chequeo").map((option) => option.value),
    ).toEqual(["2"]);
  });

  it("prioriza coincidencias del nombre", () => {
    expect(
      rankOptions(options, "revision").map((option) => option.value),
    ).toEqual(["2"]);
    expect(rankOptions(options, "no existe")).toEqual([]);
  });
});
