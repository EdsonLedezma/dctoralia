import type { DirectoryDoctor } from "~/components/doctors/directory-model";
import type { RouterOutputs } from "~/trpc/react";

export const doctorId = "c000000000000000000000001";
export const serviceId = "c000000000000000000000011";
export const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
export function calendarDay(offset: number) {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export const availableDay = calendarDay(1);
export const service = {
  id: serviceId,
  name: "Consulta de muestra",
  description: "Datos ficticios",
  price: 850,
  duration: 45,
  isActive: true,
};
export function directoryDoctor(
  overrides: Partial<DirectoryDoctor> = {},
): DirectoryDoctor {
  return {
    id: doctorId,
    userId: "demo-user",
    specialty: "cardiologia",
    license: "0000000",
    phone: "",
    about: "Datos ficticios para probar la interfaz.",
    experience: 8,
    rating: 4.8,
    totalReviews: 20,
    address: "Dirección ficticia",
    city: "Ciudad de México",
    state: "Ciudad de México",
    googleMapsUrl: "",
    latitude: 19.4326,
    longitude: -99.1332,
    createdAt: new Date("2026-10-29T12:00:00Z"),
    user: { id: "demo-user", name: "Alicia de Prueba", image: null },
    services: [service],
    reviews: [{ rating: 5 }],
    nextAvailable: { date: availableDay, time: "09:00" },
    ...overrides,
  };
}
export const doctorProfile = {
  id: doctorId,
  specialty: "cardiologia",
  license: "0000000",
  phone: "",
  about: "Datos ficticios para probar la interfaz.",
  experience: 8,
  rating: 4.8,
  totalReviews: 20,
  address: "Dirección ficticia",
  city: "Ciudad de México",
  state: "Ciudad de México",
  googleMapsUrl: "",
  latitude: 19.4326,
  longitude: -99.1332,
  createdAt: new Date("2026-10-29T12:00:00Z"),
  user: { name: "Alicia de Prueba" },
  services: [service],
  schedules: [
    {
      id: "demo-schedule",
      dayOfWeek: 4,
      startTime: "09:00",
      endTime: "18:00",
      isActive: true,
    },
  ],
  reviews: [
    {
      id: "demo-review",
      rating: 5,
      comment: "Opinión ficticia.",
      createdAt: new Date("2026-10-28T12:00:00Z"),
    },
  ],
} satisfies NonNullable<RouterOutputs["doctor"]["getById"]["result"]>;
