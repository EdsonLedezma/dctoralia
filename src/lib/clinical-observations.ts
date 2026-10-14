/** Units are server-owned so a series never mixes kg with lb or mmHg with kPa. */
export const clinicalObservationCatalog = {
  WEIGHT: { label: "Peso", unit: "kg" },
  HEIGHT: { label: "Estatura", unit: "cm" },
  SYSTOLIC_BP: { label: "Presión sistólica", unit: "mmHg" },
  DIASTOLIC_BP: { label: "Presión diastólica", unit: "mmHg" },
  HEART_RATE: { label: "Frecuencia cardiaca", unit: "lpm" },
  TEMPERATURE: { label: "Temperatura", unit: "°C" },
  OXYGEN_SATURATION: { label: "Saturación de oxígeno", unit: "%" },
} as const;

export type ClinicalObservationCode = keyof typeof clinicalObservationCatalog;
