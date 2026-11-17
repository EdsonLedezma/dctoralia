import type { AppointmentSeverity } from "@prisma/client";

type AppointmentClinicalFields = {
  reason: string | null;
  notes: string | null;
  severity: AppointmentSeverity | null;
  intakeSymptoms: string | null;
  intakeAllergies: string | null;
  intakeMedications: string | null;
  intakeContext: string | null;
  patient: {
    birthDate: Date | null;
    gender: string | null;
    address: string | null;
  };
};

function contactOnly<P extends AppointmentClinicalFields["patient"]>(
  patient: P,
) {
  const {
    birthDate: _birthDate,
    gender: _gender,
    address: _address,
    ...contact
  } = patient;
  return { ...contact, birthDate: null, gender: null, address: null };
}

/** Never return the brief or clinical/demographic profile to reception. */
export function redactAppointmentForReception<
  T extends AppointmentClinicalFields,
>(appointment: T) {
  const {
    reason: _reason,
    notes: _notes,
    severity: _severity,
    intakeSymptoms: _symptoms,
    intakeAllergies: _allergies,
    intakeMedications: _medications,
    intakeContext: _context,
    patient: _patient,
    ...administrative
  } = appointment;
  return {
    ...administrative,
    reason: null,
    notes: null,
    severity: null,
    intakeSymptoms: null,
    intakeAllergies: null,
    intakeMedications: null,
    intakeContext: null,
    patient: contactOnly<T["patient"]>(appointment.patient),
  };
}
