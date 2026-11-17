import { describe, expect, it } from "vitest";
import {
  clinicalPdfSections,
  parseClinicalPdfSnapshot,
  printableClinicalValue,
} from "./pdf-content";
const snapshot = {
  generatedAt: "2026-11-15T00:00:00Z",
  scope: { clinicId: "clinic", doctorId: "doctor" },
  patient: {
    id: "patient",
    birthDate: null,
    gender: null,
    user: { name: "Paciente de ejemplo" },
  },
  patientReportedHistory: null,
  episodes: [],
  encounters: [],
  prescriptions: [],
  followUps: [],
  outcomes: [],
  observations: [],
  appointments: [],
  files: [],
};
describe("clinical PDF content", () => {
  it("keeps long clinical notes and amendments without truncating", () => {
    const note = "Evolución clínica de ejemplo. ".repeat(1000);
    const parsed = parseClinicalPdfSnapshot({
      ...snapshot,
      encounters: [
        {
          subjective: note,
          amendments: [
            { changes: { plan: "Nueva indicación" }, reason: "Corrección" },
          ],
        },
      ],
    });
    const text = printableClinicalValue(parsed.encounters[0] ?? null);
    expect(text).toContain(note);
    expect(text).toContain("Nueva indicación");
    expect(text).toContain("Corrección");
  });
  it("does not shift appointment calendar dates to the previous day", () => {
    expect(printableClinicalValue("2026-11-15T00:00:00.000Z", "date")).toBe(
      "2026-11-15",
    );
  });
  it("normalizes Prisma-like dates and numeric JSON representations", () => {
    const parsed = parseClinicalPdfSnapshot({
      ...snapshot,
      observations: [
        {
          measuredAt: new Date("2026-11-15T14:00:00Z"),
          value: { toJSON: () => "120.000" },
          unit: "mmHg",
        },
      ],
    });
    expect(parsed.observations[0]?.value).toBe("120.000");
    expect(printableClinicalValue(parsed.observations[0] ?? null)).toContain(
      "mmHg",
    );
  });
  it("preserves prescriptions, medication instructions and file metadata", () => {
    const parsed = parseClinicalPdfSnapshot({
      ...snapshot,
      prescriptions: [
        {
          medications: [
            {
              name: "Medicamento de prueba",
              frequency: "Según receta",
              notes: "Indicación de ejemplo",
            },
          ],
        },
      ],
      files: [
        {
          originalFilename: "estudio.pdf",
          mediaType: "application/pdf",
          sizeBytes: 1234,
        },
      ],
    });
    const sections = clinicalPdfSections(parsed);
    expect(
      sections.find((section) => section.title === "Recetas e indicaciones")
        ?.rows,
    ).toHaveLength(1);
    expect(printableClinicalValue(parsed.prescriptions[0] ?? null)).toContain(
      "Indicación de ejemplo",
    );
    expect(printableClinicalValue(parsed.files[0] ?? null)).toContain(
      "estudio.pdf",
    );
  });
  it("makes missing consent for shared history explicit", () => {
    const section = clinicalPdfSections(parseClinicalPdfSnapshot(snapshot))[0];
    expect(section?.rows).toEqual([]);
    expect(section?.empty).toContain("sin autorización");
  });
  it("rejects malformed snapshots rather than producing an incomplete record", () => {
    expect(() =>
      parseClinicalPdfSnapshot({ ...snapshot, patient: null }),
    ).toThrow();
  });
});
