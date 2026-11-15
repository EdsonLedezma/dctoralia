const date = {
  type: "string",
  description: "Fecha AAAA-MM-DD en la zona del consultorio",
} as const;
const time = {
  type: "string",
  description: "HH:mm obtenido de get_available_slots",
} as const;
const serviceId = {
  type: "string",
  description: "ID de list_services de esta llamada",
} as const;
const appointmentId = {
  type: "string",
  description: "ID de list_my_appointments de esta llamada",
} as const;
const confirmed = {
  type: "boolean",
  enum: [true],
  description:
    "true solo después de confirmar explícitamente con el paciente el cambio concreto",
} as const;
export const vapiFunctionDefinitions = [
  {
    name: "list_services",
    description:
      "Servicios y precios del médico marcado. No pedir ni aceptar doctorId.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_available_slots",
    description: "Horarios reales del servicio para el médico de esta llamada.",
    parameters: {
      type: "object",
      properties: { serviceId, date },
      required: ["serviceId", "date"],
      additionalProperties: false,
    },
  },
  {
    name: "get_booking_link",
    description:
      "Enlace de reserva para quien todavía no autoriza la llamada. No envía mensajes ni reserva por sí solo.",
    parameters: {
      type: "object",
      properties: { serviceId, date, time },
      required: ["serviceId", "date", "time"],
      additionalProperties: false,
    },
  },
  {
    name: "verify_patient",
    description:
      "Verifica el código de 8 dígitos generado por el paciente en su cuenta para este consultorio. No uses el número de teléfono como prueba de identidad.",
    parameters: {
      type: "object",
      properties: { code: { type: "string", pattern: "^[0-9]{8}$" } },
      required: ["code"],
      additionalProperties: false,
    },
  },
  {
    name: "list_my_appointments",
    description:
      "Citas administrativas del paciente autorizado solo con el médico de esta llamada. Requiere verify_patient.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_appointment",
    description:
      "Crea una solicitud PENDING; no anuncies cita confirmada. Requiere identidad y confirmación verbal explícita. Verifica disponibilidad antes.",
    parameters: {
      type: "object",
      properties: { serviceId, date, time, confirmed },
      required: ["serviceId", "date", "time", "confirmed"],
      additionalProperties: false,
    },
  },
  {
    name: "reschedule_appointment",
    description:
      "Reprograma la cita propia autorizada. Mantiene el estado previo. Confirma fecha/hora explícitamente antes; no permite editar notas ni pacientes.",
    parameters: {
      type: "object",
      properties: { appointmentId, date, time, confirmed },
      required: ["appointmentId", "date", "time", "confirmed"],
      additionalProperties: false,
    },
  },
  {
    name: "cancel_appointment",
    description:
      "Cancela la cita propia sin borrarla. Requiere verificación y confirmación verbal explícita de esa cita.",
    parameters: {
      type: "object",
      properties: { appointmentId, confirmed },
      required: ["appointmentId", "confirmed"],
      additionalProperties: false,
    },
  },
] as const;
