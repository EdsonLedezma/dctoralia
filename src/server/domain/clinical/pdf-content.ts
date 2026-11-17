import { z } from "zod";

export type PdfValue =
  | string
  | number
  | boolean
  | null
  | PdfValue[]
  | { [key: string]: PdfValue };
const valueSchema: z.ZodType<PdfValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(valueSchema),
    z.record(valueSchema),
  ]),
);
const rowSchema = z.record(valueSchema);
const schema = z.object({
  generatedAt: z.string(),
  scope: z.object({ clinicId: z.string(), doctorId: z.string() }),
  patient: z.object({
    id: z.string(),
    birthDate: z.string().nullable(),
    gender: z.string().nullable(),
    user: z.object({ name: z.string() }),
  }),
  patientReportedHistory: rowSchema.nullable(),
  episodes: z.array(rowSchema),
  encounters: z.array(rowSchema),
  prescriptions: z.array(rowSchema).default([]),
  followUps: z.array(rowSchema),
  outcomes: z.array(rowSchema),
  observations: z.array(rowSchema),
  appointments: z.array(rowSchema),
  files: z.array(rowSchema),
});
export type ClinicalPdfSnapshot = z.infer<typeof schema>;
export function parseClinicalPdfSnapshot(value: unknown): ClinicalPdfSnapshot {
  // Prisma dates and decimals have intentional JSON representations.
  const serialized = JSON.stringify(value);
  return schema.parse(JSON.parse(serialized) as unknown);
}
const labels: { [key: string]: string } = {
  id: "Referencia",
  episodeId: "Episodio",
  appointmentId: "Cita",
  encounterId: "Consulta",
  title: "Título",
  status: "Estado",
  openedAt: "Apertura",
  closedAt: "Cierre",
  createdAt: "Registro",
  updatedAt: "Actualización",
  encounterAt: "Fecha de consulta",
  chiefComplaint: "Motivo de consulta",
  subjective: "Subjetivo / evolución",
  objective: "Objetivo / exploración",
  assessment: "Valoración clínica",
  plan: "Plan e indicaciones",
  signedAt: "Firma de la nota",
  authoredBy: "Profesional",
  amendments: "Enmiendas",
  reason: "Motivo",
  changes: "Cambios",
  details: "Detalle",
  type: "Tipo",
  priority: "Prioridad",
  dueAt: "Fecha límite",
  completedAt: "Resolución",
  instrumentCode: "Instrumento",
  instrumentVersion: "Versión",
  score: "Puntuación",
  scoreMin: "Mínimo",
  scoreMax: "Máximo",
  responses: "Respuestas",
  completedItemCount: "Ítems contestados",
  totalItemCount: "Total de ítems",
  measuredAt: "Fecha de medición",
  recordedBy: "Registrado por",
  code: "Medición",
  value: "Valor",
  unit: "Unidad",
  context: "Contexto",
  voidedAt: "Anulado el",
  voidReason: "Motivo de anulación",
  date: "Fecha",
  time: "Hora",
  duration: "Duración (minutos)",
  notes: "Notas",
  severity: "Prioridad indicada",
  service: "Servicio",
  name: "Nombre",
  originalFilename: "Archivo",
  mediaType: "Tipo de archivo",
  sizeBytes: "Tamaño (bytes)",
  category: "Categoría",
  uploadedBy: "Adjuntado por",
  bloodType: "Grupo sanguíneo",
  allergies: "Alergias",
  medications: "Medicamentos",
  chronicDiseases: "Antecedentes",
  lastUpdated: "Actualizado el",
  instructions: "Indicaciones",
  issuedAt: "Fecha de emisión",
  issuedBy: "Prescrito por",
  dose: "Dosis",
  route: "Vía",
  frequency: "Frecuencia",
  medicationDuration: "Duración",
  prescriptionId: "Receta",
};
const states: { [key: string]: string } = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
  DRAFT: "Borrador",
  SIGNED: "Firmada",
  VOIDED: "Anulada",
  OPEN: "Abierto",
  CLOSED: "Cerrado",
  IN_PROGRESS: "En curso",
  ACTIVE: "Activo",
};
export function clinicalFieldLabel(key: string) {
  return (
    labels[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ")
  );
}
export function printableClinicalValue(
  value: PdfValue,
  field?: string,
): string {
  if (value === null) return "No registrado";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (field === "date" && /^\d{4}-\d{2}-\d{2}T/.test(value))
      return value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:/.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.valueOf()))
        return new Intl.DateTimeFormat("es-MX", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "America/Mexico_City",
        }).format(date);
    }
    return states[value] ?? value;
  }
  if (Array.isArray(value))
    return value.length
      ? value
          .map((item, index) => `${index + 1}. ${printableClinicalValue(item)}`)
          .join("\n")
      : "Sin registros";
  return Object.entries(value)
    .map(
      ([key, item]) =>
        `${clinicalFieldLabel(key)}: ${printableClinicalValue(item, key)}`,
    )
    .join("\n");
}
export function clinicalPdfSections(snapshot: ClinicalPdfSnapshot) {
  return [
    {
      title: "Antecedentes informados por el paciente",
      rows: snapshot.patientReportedHistory
        ? [snapshot.patientReportedHistory]
        : [],
      empty: "Sin antecedentes compartidos o sin autorización para incluirlos.",
    },
    { title: "Episodios de atención", rows: snapshot.episodes },
    { title: "Consultas y notas clínicas", rows: snapshot.encounters },
    { title: "Recetas e indicaciones", rows: snapshot.prescriptions },
    { title: "Seguimientos", rows: snapshot.followUps },
    { title: "Resultados e instrumentos", rows: snapshot.outcomes },
    { title: "Mediciones clínicas", rows: snapshot.observations },
    { title: "Historial de citas", rows: snapshot.appointments },
    {
      title: "Documentos adjuntos",
      rows: snapshot.files,
      empty: "Sin documentos disponibles dentro de este alcance.",
    },
  ];
}
