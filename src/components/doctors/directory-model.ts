import type { RouterOutputs } from "~/trpc/react";

export type DirectoryDoctor = NonNullable<
  RouterOutputs["doctor"]["getAll"]["result"]
>[number];
export type DirectoryFilters = {
  search: string;
  specialty: string;
  city: string;
  sort: "rating" | "availability" | "price" | "experience" | "reviews";
};
export const defaultDirectoryFilters: DirectoryFilters = {
  search: "",
  specialty: "all",
  city: "all",
  sort: "rating",
};
export const normalizeDirectoryText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]+/g, " ")
    .toLocaleLowerCase("es-MX")
    .trim();
export function specialtyLabel(value: string) {
  const labels: Record<string, string> = {
    "medicina general": "Medicina general",
    cardiologia: "Cardiología",
    dermatologia: "Dermatología",
    pediatria: "Pediatría",
    ginecologia: "Ginecología",
    neurologia: "Neurología",
    traumatologia: "Traumatología",
    psiquiatria: "Psiquiatría",
    oftalmologia: "Oftalmología",
    otorrinolaringologia: "Otorrinolaringología",
  };
  return labels[normalizeDirectoryText(value)] ?? value;
}
export function readDirectoryFilters(
  params: URLSearchParams,
): DirectoryFilters {
  const sort = params.get("sort");
  return {
    search: params.get("q") ?? "",
    specialty: params.get("specialty") ?? "all",
    city: params.get("city") ?? "all",
    sort:
      sort === "availability" ||
      sort === "price" ||
      sort === "experience" ||
      sort === "reviews"
        ? sort
        : "rating",
  };
}
export function directoryFilterQuery(filters: DirectoryFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.specialty !== "all") params.set("specialty", filters.specialty);
  if (filters.city !== "all") params.set("city", filters.city);
  if (filters.sort !== "rating") params.set("sort", filters.sort);
  return params.toString();
}
export function doctorRating(doctor: DirectoryDoctor) {
  return (
    doctor.rating ??
    (doctor.reviews.length
      ? doctor.reviews.reduce((sum, review) => sum + review.rating, 0) /
        doctor.reviews.length
      : 0)
  );
}
export function doctorPrice(doctor: DirectoryDoctor) {
  return Math.min(
    ...doctor.services
      .filter((service) => service.isActive)
      .map((service) => Number(service.price)),
  );
}
export function filterDirectory(
  doctors: readonly DirectoryDoctor[],
  filters: DirectoryFilters,
) {
  const query = normalizeDirectoryText(filters.search);
  const result = doctors.filter(
    (doctor) =>
      (!query ||
        [
          doctor.user?.name ?? "",
          doctor.specialty,
          doctor.city ?? "",
          doctor.state ?? "",
        ].some((value) => normalizeDirectoryText(value).includes(query))) &&
      (filters.specialty === "all" ||
        normalizeDirectoryText(doctor.specialty) ===
          normalizeDirectoryText(filters.specialty)) &&
      (filters.city === "all" || doctor.city === filters.city),
  );
  return result.sort((a, b) => {
    switch (filters.sort) {
      case "price":
        return doctorPrice(a) - doctorPrice(b) || a.id.localeCompare(b.id);
      case "experience":
        return (b.experience ?? 0) - (a.experience ?? 0);
      case "reviews":
        return (
          (b.totalReviews ?? b.reviews.length) -
          (a.totalReviews ?? a.reviews.length)
        );
      case "availability":
        return (
          a.nextAvailable
            ? `${a.nextAvailable.date}T${a.nextAvailable.time}`
            : "z"
        ).localeCompare(
          b.nextAvailable
            ? `${b.nextAvailable.date}T${b.nextAvailable.time}`
            : "z",
        );
      default:
        return doctorRating(b) - doctorRating(a);
    }
  });
}

export function nextAvailableLabel(slot: DirectoryDoctor["nextAvailable"]) {
  if (!slot) return "Sin horarios publicados en el próximo mes";
  const day = new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${slot.date}T12:00:00.000Z`));
  return `${day} · ${slot.time}`;
}
