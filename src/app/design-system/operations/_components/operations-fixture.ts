import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

// Entirely fictitious, held only by the local laboratory client. This module
// performs no network requests and never persists clinical or account data.
export function createOperationsFixture(
  scenario: string,
  patientPreview = false,
) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const day = new Date(`${today}T12:00:00Z`);
  if (patientPreview) day.setUTCDate(day.getUTCDate() + 1);
  const people = ["María López", "Andrés García", "Sofía Hernández"];
  const patients = people.map((name, index) => ({
    id: `demo-patient-${index}`,
    userId: `demo-user-${index}`,
    phone: `555000000${index}`,
    birthDate: new Date("1990-05-12T12:00:00Z"),
    address: "Ciudad de México",
    gender: "",
    user: {
      id: `demo-user-${index}`,
      name,
      email: `paciente${index}@example.com`,
      image: null,
    },
    appointments: [],
  }));
  const service = {
    id: "demo-service",
    name: "Consulta general",
    description: "Valoración y seguimiento",
    duration: 45,
    price: 800,
    isActive: true,
  };
  let appointments = patients.map((patient, index) => ({
    id: `demo-appointment-${index}`,
    doctorId: "demo-doctor",
    doctor: {
      specialty: "Medicina general",
      user: { id: "demo-doctor-user", name: "Dra. Elena Rivera", image: null },
    },
    patientId: patient.id,
    patient,
    service,
    date: day,
    time: ["09:00", "10:30", "12:00"][index]!,
    duration: 45,
    reason: "Control",
    status: index === 1 ? "PENDING" : "CONFIRMED",
    lifecycleEvents: [],
    location: null,
  }));
  const counts = new Map<string, number>();
  return (path: string, input: unknown) => {
    const call = (counts.get(path) ?? 0) + 1;
    counts.set(path, call);
    if (typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent("operations-preview-request", {
          detail: { path },
        }),
      );
    if (
      scenario === "error" &&
      call === 1 &&
      ["appointments.listMine", "doctor.getMyPatients"].includes(path)
    )
      return trpcFailure(
        "DEMO_ERROR",
        "No pudimos cargar los datos de muestra.",
        500,
      );
    if (path === "appointments.listMine")
      return trpcSuccess(
        scenario === "empty" ? [] : appointments,
        "Agenda de muestra",
      );
    if (path === "auth.getProfile")
      return trpcSuccess(
        { patient: { id: "demo-patient-0" } },
        "Perfil de muestra",
      );
    if (path === "patients.getMedicalHistory")
      return trpcSuccess({ medications: [] }, "Historial de muestra");
    if (path === "clinical.mySignedRecords")
      return trpcSuccess(
        { encounters: [], prescriptions: [] },
        "Documentos de muestra",
      );
    if (path === "doctor.getMyPatients")
      return trpcSuccess(
        scenario === "empty" ? [] : patients,
        "Pacientes de muestra",
      );
    if (path === "services.getMyServices")
      return trpcSuccess([service], "Servicios de muestra");
    if (path === "workspace.locations.list")
      return trpcSuccess([], "Ubicaciones de muestra");
    if (path === "clinical.listFollowUpTasks")
      return trpcSuccess([], "Seguimientos de muestra");
    if (path === "clinical.operationalAnalytics")
      return trpcSuccess(null, "Sin estadísticas en esta muestra");
    if (
      path === "appointments.bookingSlots" ||
      path === "appointments.availableSlots"
    )
      return trpcSuccess(
        scenario === "empty"
          ? []
          : scenario === "conflict" &&
              (counts.get("appointments.reschedule") ?? 0) +
                (counts.get("appointments.create") ?? 0) >
                0
            ? ["10:30", "12:00", "16:00"]
            : ["09:00", "10:30", "12:00", "16:00"],
        "Horas de muestra",
      );
    if (path === "appointments.reschedule" || path === "appointments.create") {
      if (scenario === "conflict" && call === 1)
        return trpcFailure(
          "SLOT_CONFLICT",
          "Este horario ya está ocupado. Elige otro horario.",
          409,
        );
      if (
        path === "appointments.reschedule" &&
        input &&
        typeof input === "object" &&
        "id" in input &&
        "newTime" in input &&
        typeof input.newTime === "string" &&
        "newDate" in input &&
        input.newDate instanceof Date
      ) {
        const { id, newTime, newDate } = input;
        appointments = appointments.map((appointment) =>
          appointment.id === id
            ? { ...appointment, time: newTime, date: newDate }
            : appointment,
        );
      }
      return trpcSuccess(
        { id: "demo-created" },
        "Guardado sólo en esta muestra",
      );
    }
    if (path === "users.create")
      return trpcSuccess({ id: "demo-new-user" }, "Acceso de muestra");
    if (path === "patients.create")
      return scenario === "profile-error" && call === 1
        ? trpcFailure(
            "DEMO_ERROR",
            "No pudimos completar el perfil. Reintenta el registro.",
            500,
          )
        : trpcSuccess({ id: "demo-new-patient" }, "Perfil de muestra");
    if (
      path === "appointments.updateStatus" ||
      path === "appointments.cancel" ||
      path === "appointments.recordAttendance"
    )
      return trpcSuccess({ id: "demo-action" }, "Acción de muestra");
    return trpcFailure(
      "DEMO_UNSUPPORTED",
      "Esta acción no está incluida en la muestra.",
      400,
    );
  };
}
