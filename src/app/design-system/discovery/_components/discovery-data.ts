import type { DirectoryDoctor } from "~/components/doctors/directory-model";
const date = "2026-10-30";
const base = {
  userId: "demo-user",
  license: "0000000",
  phone: "",
  about:
    "Atención personalizada y seguimiento de tu consulta. Perfil ficticio del laboratorio de diseño.",
  experience: 8,
  rating: 4.8,
  totalReviews: 24,
  address: "Ubicación de muestra",
  city: "Ciudad de México",
  state: "Ciudad de México",
  googleMapsUrl: "",
  latitude: 19.4326,
  longitude: -99.1332,
  createdAt: new Date("2026-10-29T12:00:00Z"),
  user: { id: "demo-user", name: "Dra. Alicia Salas", image: null },
  services: [
    {
      id: "demo-service",
      name: "Consulta general",
      description: "Primera valoración",
      price: 850,
      duration: 45,
      isActive: true,
    },
  ],
  reviews: [{ rating: 5 }],
  nextAvailable: { date, time: "10:30" },
};
export const discoveryDoctors = [
  { ...base, id: "c000000000000000000000001", specialty: "medicina-general" },
  {
    ...base,
    id: "c000000000000000000000002",
    specialty: "cardiologia",
    city: "Guadalajara",
    state: "Jalisco",
    latitude: 20.6597,
    longitude: -103.3496,
    rating: 4.9,
    experience: 12,
    user: { id: "demo-user-2", name: "Dr. Diego Torres", image: null },
    services: [
      {
        ...base.services[0]!,
        id: "demo-service-2",
        name: "Consulta de cardiología",
        price: 1200,
      },
    ],
  },
  {
    ...base,
    id: "c000000000000000000000003",
    specialty: "dermatologia",
    city: "Monterrey",
    state: "Nuevo León",
    latitude: null,
    longitude: null,
    rating: null,
    totalReviews: 0,
    reviews: [],
    nextAvailable: null,
    user: { id: "demo-user-3", name: "Dra. Elena Ríos", image: null },
    services: [
      {
        ...base.services[0]!,
        id: "demo-service-3",
        name: "Consulta de dermatología",
        price: 700,
      },
    ],
  },
] satisfies DirectoryDoctor[];
