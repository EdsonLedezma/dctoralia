import { createHash } from "node:crypto";
import type {
  Prisma,
  AppointmentStatus,
  MessageDeliveryStatus,
} from "@prisma/client";

export const DEMO_DOMAIN = "demo.dopilot.test";
// Public demo credentials only. Never use these accounts in a live medical system.
export const DEMO_PASSWORD = "password123";
export const DEMO_ACCOUNTS = {
  doctor: "doctora@demo.dopilot.test",
  patient: "paciente@demo.dopilot.test",
  pro: "pro@demo.dopilot.test",
  custom: "custom@demo.dopilot.test",
} as const;
export const DEMO_VERSION = "dopilot-demo-v1";
export const demoId = (key: string) =>
  `c${createHash("sha256").update(`${DEMO_VERSION}:${key}`).digest("hex").slice(0, 24)}`;

const doctorsCatalog = [
  {
    name: "Dra. Valeria Ríos",
    email: "pro",
    specialty: "Medicina General",
    experience: 9,
    price: 650,
    clinic: 0,
  },
  {
    name: "Dra. Mariana Vega",
    email: "doctora",
    specialty: "Cardiología",
    experience: 14,
    price: 1200,
    clinic: 1,
  },
  {
    name: "Dr. Gabriel Luna",
    email: "gabriel",
    specialty: "Dermatología",
    experience: 11,
    price: 950,
    clinic: 1,
  },
  {
    name: "Dra. Lucía Montes",
    email: "lucia",
    specialty: "Pediatría",
    experience: 8,
    price: 800,
    clinic: 1,
  },
  {
    name: "Dr. Andrés Solís",
    email: "andres",
    specialty: "Traumatología",
    experience: 16,
    price: 1100,
    clinic: 1,
  },
  {
    name: "Dra. Elena Prado",
    email: "custom",
    specialty: "Ginecología",
    experience: 12,
    price: 1000,
    clinic: 2,
  },
  {
    name: "Dr. Mateo Vidal",
    email: "mateo",
    specialty: "Neurología",
    experience: 18,
    price: 1400,
    clinic: 2,
  },
  {
    name: "Dra. Sofía Lara",
    email: "sofia",
    specialty: "Oftalmología",
    experience: 10,
    price: 900,
    clinic: 2,
  },
];
const patientNames = [
  "Camila Torres",
  "Daniel Robles",
  "Renata Silva",
  "Emilio Fuentes",
  "Paula Méndez",
  "Nicolás Castro",
  "Isabella León",
  "Diego Navarro",
  "Regina Salas",
  "Santiago Paredes",
  "Julia Acosta",
  "Leonardo Bravo",
  "María Serrano",
  "Adrián Lozano",
  "Natalia Herrera",
  "Sebastián Mora",
  "Victoria Campos",
  "Javier Peña",
  "Ana Beltrán",
  "Rodrigo Molina",
  "Andrea Cárdenas",
  "Tomás Reyes",
  "Sara Valdés",
  "Bruno Aguilar",
];

export function buildDemoData(now = new Date()) {
  if (!Number.isFinite(now.getTime()))
    throw new Error("Fecha de referencia inválida");
  const dayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) =>
    dayParts.find((item) => item.type === name)?.value;
  const anchor = new Date(
    `${part("year")}-${part("month")}-${part("day")}T00:00:00.000Z`,
  );
  const day = (offset: number) =>
    new Date(anchor.getTime() + offset * 86_400_000);
  const createdAt = day(-90);
  const clinics = [
    "Consultorio Ríos · Demo",
    "Clínica Alameda · Demo",
    "Centro Médico Aurora · Demo",
  ].map((name, index) => ({
    id: demoId(`clinic:${index}`),
    name,
    slug: `${DEMO_VERSION}-${index}`,
    timezone: "America/Mexico_City",
    createdAt,
  }));
  const locations = clinics.flatMap((clinic, index) =>
    Array.from({ length: index === 0 ? 1 : 2 }, (_, branch) => ({
      id: demoId(`location:${index}:${branch}`),
      clinicId: clinic.id,
      name:
        branch === 0
          ? "Sede Centro (demostración)"
          : "Sede Norte (demostración)",
      address: `Calle de Ejemplo ${100 + index * 10 + branch}, Ciudad de México · Dirección ficticia`,
      timezone: clinic.timezone,
      isActive: true,
      createdAt,
    })),
  );
  const subscriptions: Prisma.ClinicSubscriptionCreateManyInput[] = clinics.map(
    (clinic, index) => ({
      id: demoId(`subscription:${index}`),
      clinicId: clinic.id,
      plan: index === 0 ? "PRO" : index === 1 ? "ENTERPRISE" : "CUSTOM",
      status: "ACTIVE",
      currency: "MXN",
      monthlyPriceMxn: index === 0 ? 800 : null,
      includedMessagingMxn: index === 0 ? 150 : null,
      messagingOverageAllowed: false,
      customDevelopmentEnabled: index === 2,
      extendedMessagingEnabled: index === 2,
      provider: "demo",
      currentPeriodStart: day(-15),
      currentPeriodEnd: day(15),
      createdAt,
    }),
  );
  // Deliberately invalid dialable numbers: these records must never reach a provider.
  const phone = (index: number) => `DEMO-${String(index).padStart(4, "0")}`;
  const users: Prisma.UserCreateManyInput[] = [];
  const doctors: Prisma.DoctorCreateManyInput[] = [];
  const members: Prisma.ClinicMemberCreateManyInput[] = [];
  const services: Prisma.ServiceCreateManyInput[] = [];
  const schedules: Prisma.ScheduleCreateManyInput[] = [];
  for (const [index, item] of doctorsCatalog.entries()) {
    const userId = demoId(`doctor-user:${index}`);
    const doctorId = demoId(`doctor:${index}`);
    const clinicId = demoId(`clinic:${item.clinic}`);
    users.push({
      id: userId,
      name: item.name,
      email: `${item.email}@${DEMO_DOMAIN}`,
      password: "",
      phone: phone(index),
      role: "DOCTOR",
      createdAt,
    });
    doctors.push({
      id: doctorId,
      userId,
      clinicId,
      specialty: item.specialty,
      license: `DEMO-NO-VALIDA-${index + 1}`,
      phone: phone(index),
      experience: item.experience,
      about: `Perfil ficticio para demostración. ${item.specialty}, consulta presencial y seguimiento. Los servicios y la cédula no representan a un profesional real.`,
      createdAt,
    });
    members.push({
      id: demoId(`member:${index}`),
      clinicId,
      userId,
      role: [0, 1, 5].includes(index) ? "OWNER" : "DOCTOR",
      createdAt,
    });
    for (const [serviceIndex, name] of [
      "Primera consulta",
      "Consulta de seguimiento",
      "Valoración integral",
    ].entries()) {
      services.push({
        id: demoId(`service:${index}:${serviceIndex}`),
        doctorId,
        clinicId,
        name,
        description: `${name} de ${item.specialty.toLowerCase()}. Servicio ficticio de demostración.`,
        price:
          item.price +
          (serviceIndex === 2 ? 350 : serviceIndex === 1 ? -150 : 0),
        duration: serviceIndex === 2 ? 60 : 30,
        isActive: true,
        createdAt,
      });
    }
    for (let weekday = 0; weekday < 7; weekday++)
      schedules.push({
        id: demoId(`schedule:${index}:${weekday}`),
        doctorId,
        clinicId,
        dayOfWeek: weekday,
        startTime: "08:00",
        endTime: "19:00",
        isActive: true,
        createdAt,
      });
  }
  const patients: Prisma.PatientCreateManyInput[] = [];
  const histories: Prisma.MedicalHistoryCreateManyInput[] = [];
  for (const [index, name] of patientNames.entries()) {
    const patientId = demoId(`patient:${index}`);
    const userId = demoId(`patient-user:${index}`);
    users.push({
      id: userId,
      name,
      email: `${index === 0 ? "paciente" : `paciente${index + 1}`}@${DEMO_DOMAIN}`,
      password: "",
      phone: phone(100 + index),
      role: "PATIENT",
      createdAt,
    });
    patients.push({
      id: patientId,
      userId,
      phone: phone(100 + index),
      birthDate: new Date(Date.UTC(1975 + index, index % 12, 8 + (index % 20))),
      gender: index % 2 === 0 ? "female" : "male",
      address: `Calle Ficticia ${index + 1}, Ciudad de México · Demo`,
      createdAt,
    });
    histories.push({
      id: demoId(`history:${index}`),
      patientId,
      bloodType: index % 3 === 0 ? "O_POS" : "A_POS",
      allergies: index % 4 === 0 ? ["Polen (dato ficticio)"] : [],
      medications: [],
      chronicDiseases:
        index % 5 === 0 ? ["Antecedente de ejemplo, no clínico"] : [],
      surgeries: [],
      immunizations: ["Registro de vacunación de ejemplo"],
      healthStatus: "HEALTHY",
      notes:
        "Expediente completamente ficticio para evaluar la interfaz. No usar para atención médica.",
      lastUpdated: day(-index % 8),
    });
  }
  const appointments: Prisma.AppointmentCreateManyInput[] = [];
  const offsets = [
    -28, -25, -21, -18, -14, -10, -7, -5, -3, -1, 0, 1, 2, 4, 7, 10, 14,
  ];
  for (const [dateIndex, offset] of offsets.entries()) {
    for (const [doctorIndex, item] of doctorsCatalog.entries()) {
      for (let slot = 0; slot < 3; slot++) {
        const patientIndex =
          (doctorIndex * 3 + slot + dateIndex + 11) % patientNames.length;
        const status: AppointmentStatus =
          offset < 0
            ? (dateIndex + doctorIndex + slot) % 11 === 0
              ? "NO_SHOW"
              : (dateIndex + slot) % 7 === 0
                ? "CANCELLED"
                : "COMPLETED"
            : slot === 1
              ? "PENDING"
              : "CONFIRMED";
        appointments.push({
          id: demoId(`appointment:${doctorIndex}:${dateIndex}:${slot}`),
          doctorId: demoId(`doctor:${doctorIndex}`),
          patientId: demoId(`patient:${patientIndex}`),
          clinicId: demoId(`clinic:${item.clinic}`),
          locationId: demoId(`location:${item.clinic}:0`),
          serviceId: demoId(`service:${doctorIndex}:${slot}`),
          date: day(offset),
          time: `${String(9 + slot * 3).padStart(2, "0")}:00`,
          duration: slot === 2 ? 60 : 30,
          status,
          severity: "LOW",
          reason: [
            "Revisión de rutina",
            "Seguimiento de consulta",
            "Valoración inicial",
          ][slot],
          notes: "Cita ficticia de demostración.",
          createdAt: day(Math.min(offset - 5, 0)),
        });
      }
    }
  }
  const reviews: Prisma.ReviewCreateManyInput[] = [];
  const reviewed = new Set<string>();
  for (const appointment of appointments.filter(
    (item) => item.status === "COMPLETED",
  )) {
    const key = `${appointment.doctorId}:${appointment.patientId}`;
    if (reviewed.has(key)) continue;
    reviewed.add(key);
    reviews.push({
      id: demoId(`review:${key}`),
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      clinicId: appointment.clinicId,
      rating: reviews.length % 4 === 0 ? 4 : 5,
      comment: [
        "Reseña ficticia: atención puntual y explicación clara.",
        "Reseña ficticia: la consulta y el seguimiento fueron organizados.",
        "Reseña ficticia: fue sencillo encontrar y reservar el horario.",
      ][reviews.length % 3],
      createdAt: appointment.date,
    });
  }
  for (const doctor of doctors) {
    const own = reviews.filter((review) => review.doctorId === doctor.id);
    doctor.totalReviews = own.length;
    doctor.rating =
      own.reduce((sum, review) => sum + review.rating, 0) /
      Math.max(1, own.length);
  }
  const notifications: Prisma.NotificationCreateManyInput[] = appointments
    .filter((item) => new Date(item.date).getTime() >= day(-7).getTime())
    .map((item, index) => ({
      id: demoId(`notification:${item.id}`),
      doctorId: item.doctorId,
      patientId: item.patientId,
      clinicId: item.clinicId,
      appointmentId: item.id,
      type:
        item.status === "CANCELLED"
          ? "APPOINTMENT_CANCELLED"
          : "APPOINTMENT_BOOKED",
      title:
        item.status === "CANCELLED"
          ? "Cita cancelada · Demo"
          : "Cita agendada · Demo",
      message: `Actividad ficticia: consulta a las ${item.time}.`,
      isRead: index % 3 !== 0,
      createdAt: day(-index % 7),
    }));
  const messageStatuses: MessageDeliveryStatus[] = [
    "DELIVERED",
    "READ",
    "SENT",
    "DEAD_LETTER",
    "CANCELLED",
  ];
  const messages: Prisma.MessageOutboxCreateManyInput[] = clinics.flatMap(
    (clinic, clinicIndex) =>
      messageStatuses.map((status, index) => ({
        id: demoId(`message:${clinicIndex}:${index}`),
        clinicId: clinic.id,
        provider: "demo",
        channel: "WHATSAPP",
        recipient: phone(clinicIndex),
        template: "demo_recordatorio",
        payload: { demo: "true" },
        idempotencyKey: `${DEMO_VERSION}:${clinicIndex}:${index}`,
        status,
        sandbox: true,
        attempts: status === "DEAD_LETTER" ? 5 : 1,
        createdAt: day(-index),
        sentAt: status === "CANCELLED" ? null : day(-index),
        deliveredAt: ["DELIVERED", "READ"].includes(status)
          ? day(-index)
          : null,
        failedAt: status === "DEAD_LETTER" ? day(-index) : null,
        lastErrorCode:
          status === "DEAD_LETTER" ? "DEMO_TEMPLATE_REJECTED" : null,
      })),
  );
  return {
    anchor,
    clinics,
    locations,
    subscriptions,
    users,
    doctors,
    members,
    patients,
    histories,
    services,
    schedules,
    appointments,
    reviews,
    notifications,
    messages,
  };
}

export type DemoData = ReturnType<typeof buildDemoData>;
