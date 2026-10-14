"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Calendar,
  Search,
  Star,
  MapPin,
  Map as MapIcon,
  Clock,
  Heart,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import Link from "next/link";
import { api, type RouterOutputs } from "src/trpc/react";
import { ProductShell } from "~/components/shell/product-shell";
import { avatarUrl } from "~/lib/avatar-url";
import { MotionList } from "~/components/shared/motion-list";
import { DoctorsMap, type MapDoctor } from "./_components/doctors-map";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";

type Doctor = Exclude<
  RouterOutputs["doctor"]["getAll"]["result"],
  null
>[number];
type DoctorReview = Doctor["reviews"][number];

export default function DoctorsDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const { data, isLoading } = api.doctor.getAll.useQuery();
  const doctors = (data?.result ?? []).map((d: Doctor) => {
    const averageRating =
      d.rating ??
      (d.reviews?.length
        ? d.reviews.reduce(
            (acc: number, review: DoctorReview) => acc + (review.rating ?? 0),
            0,
          ) / d.reviews.length
        : 0);
    const reviewsCount = d.totalReviews ?? d.reviews?.length ?? 0;
    return {
      id: d.id,
      userId: d.user?.id ?? "",
      name: d.user?.name ?? "Sin nombre",
      specialty: d.specialty,
      rating: Number(averageRating?.toFixed?.(1) ?? 0),
      reviews: reviewsCount,
      experience: d.experience ?? 0,
      location: d.city ?? "",
      city: d.city ?? "",
      state: d.state ?? "",
      clinic: "",
      address: d.address ?? "",
      latitude: d.latitude,
      longitude: d.longitude,
      googleMapsUrl: d.googleMapsUrl ?? "",
      price: d.services?.[0]?.price ? `$${d.services[0].price}` : "",
      image: d.user?.image,
      nextAvailable: "",
      icon: Heart,
      languages: [],
      education: "",
      about: d.about ?? "",
    };
  });

  const specialties = [
    "Medicina General",
    "Cardiología",
    "Dermatología",
    "Pediatría",
    "Ginecología",
    "Neurología",
    "Traumatología",
    "Psiquiatría",
    "Oftalmología",
    "Otorrinolaringología",
  ];

  const locations = Array.from(
    new Set(doctors.map((doctor) => doctor.city).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "es-MX"));

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch =
      !searchTerm ||
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.clinic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.state.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialty =
      selectedSpecialty === "all" || doctor.specialty === selectedSpecialty;
    const matchesLocation =
      selectedLocation === "all" || doctor.city === selectedLocation;

    return matchesSearch && matchesSpecialty && matchesLocation;
  });

  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return b.rating - a.rating;
      case "price":
        return (
          Number.parseInt((a.price || "0").replace("$", "")) -
          Number.parseInt((b.price || "0").replace("$", ""))
        );
      case "experience":
        return b.experience - a.experience;
      case "reviews":
        return b.reviews - a.reviews;
      default:
        return 0;
    }
  });

  const mapDoctors: MapDoctor[] = sortedDoctors
    .filter(
      (doctor) =>
        typeof doctor.latitude === "number" &&
        typeof doctor.longitude === "number" &&
        doctor.latitude >= 14 &&
        doctor.latitude <= 33.5 &&
        doctor.longitude >= -118 &&
        doctor.longitude <= -86,
    )
    .map((doctor) => ({
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      city: doctor.city,
      state: doctor.state,
      address: doctor.address,
      latitude: doctor.latitude as number,
      longitude: doctor.longitude as number,
      googleMapsUrl: doctor.googleMapsUrl,
    }));

  const activeFilterCount =
    Number(selectedSpecialty !== "all") + Number(selectedLocation !== "all");
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSpecialty("all");
    setSelectedLocation("all");
    setSortBy("rating");
  };

  const specialtySelect = (
    <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
      <SelectTrigger
        aria-label="Filtrar por especialidad"
        className="min-h-11 w-full border-[#e5e5e5] bg-white px-3 text-sm shadow-none sm:min-h-9 sm:w-auto sm:border-transparent sm:bg-transparent sm:px-2.5"
      >
        <SelectValue placeholder="Especialidad" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas las especialidades</SelectItem>
        {specialties.map((specialty) => (
          <SelectItem key={specialty} value={specialty}>
            {specialty}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const locationSelect = (
    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
      <SelectTrigger
        aria-label="Filtrar por ciudad"
        className="min-h-11 w-full border-[#e5e5e5] bg-white px-3 text-sm shadow-none sm:min-h-9 sm:w-auto sm:border-transparent sm:bg-transparent sm:px-2.5 sm:hover:bg-[#f5f5f5]"
      >
        <SelectValue placeholder="Ciudad" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas las ciudades</SelectItem>
        {locations.map((location) => (
          <SelectItem key={location} value={location}>
            {location}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const sortSelect = (
    <Select value={sortBy} onValueChange={setSortBy}>
      <SelectTrigger
        aria-label="Ordenar resultados"
        className="min-h-11 w-full border-[#e5e5e5] bg-white px-3 text-sm shadow-none sm:min-h-9 sm:w-auto sm:border-transparent sm:bg-transparent sm:px-2.5 sm:hover:bg-[#f5f5f5]"
      >
        <SelectValue placeholder="Ordenar por" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="rating">Mejor calificados</SelectItem>
        <SelectItem value="price">Precio menor</SelectItem>
        <SelectItem value="experience">Más experiencia</SelectItem>
        <SelectItem value="reviews">Más reseñas</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <ProductShell role="PATIENT">
      <div className="min-h-[100dvh] bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 border-b border-[#ebebeb] pb-4 sm:mb-8">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:max-w-[320px]">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#8a8a8a]" />
                <Input
                  aria-label="Buscar doctor, especialidad o ciudad"
                  placeholder="Doctor, especialidad o ciudad"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 rounded-md border-[#e5e5e5] bg-white pl-9 text-base shadow-none placeholder:text-[#8a8a8a] focus-visible:border-[#a3a3a3] focus-visible:ring-1 focus-visible:ring-[#d4d4d4] sm:h-9 sm:text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="relative min-h-11 min-w-11 px-3 sm:hidden"
                aria-label={
                  activeFilterCount
                    ? `Filtros, ${activeFilterCount} activos`
                    : "Abrir filtros"
                }
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal className="size-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[#171717] text-[10px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 min-w-11 px-3 sm:hidden"
                aria-label={`Abrir mapa con ${mapDoctors.length} ubicaciones`}
                onClick={() => setMapOpen(true)}
              >
                <MapIcon className="size-4" />
              </Button>
            </div>

            <div className="mt-2 hidden flex-wrap items-center gap-1.5 sm:flex">
              {specialtySelect}
              {locationSelect}
              {sortSelect}
            </div>

            <div className="mt-3 flex min-h-8 items-center justify-between gap-3 px-1 text-xs text-[#737373]">
              <span aria-live="polite">
                {isLoading
                  ? "Buscando doctores…"
                  : `${sortedDoctors.length} ${sortedDoctors.length === 1 ? "doctor encontrado" : "doctores encontrados"}`}
              </span>
              {(searchTerm || activeFilterCount > 0 || sortBy !== "rating") && (
                <button
                  type="button"
                  className="min-h-10 shrink-0 rounded-md px-2 text-[#525252] underline-offset-2 transition-colors hover:text-black hover:underline focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:outline-none"
                  onClick={clearFilters}
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="mb-6 hidden sm:block">
            <DoctorsMap doctors={mapDoctors} />
          </div>

          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetContent
              side="bottom"
              className="max-h-[85dvh] gap-2 overflow-y-auto px-4 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:hidden"
            >
              <SheetHeader className="px-0 pt-0 pr-10">
                <SheetTitle>Filtrar doctores</SheetTitle>
                <SheetDescription>
                  Elige especialidad y ciudad para afinar tu búsqueda.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2 text-sm font-medium text-[#404040]">
                  <span>Especialidad</span>
                  {specialtySelect}
                </div>
                <div className="grid gap-2 text-sm font-medium text-[#404040]">
                  <span>Ciudad</span>
                  {locationSelect}
                </div>
                <div className="grid gap-2 text-sm font-medium text-[#404040]">
                  <span>Ordenar por</span>
                  {sortSelect}
                </div>
              </div>
              <SheetFooter className="sticky bottom-0 -mx-4 border-t border-[#ebebeb] bg-white/95 px-4 pt-3 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur">
                <Button
                  type="button"
                  className="min-h-12 w-full"
                  onClick={() => setFiltersOpen(false)}
                >
                  Ver {sortedDoctors.length} resultados
                </Button>
                {(activeFilterCount > 0 || sortBy !== "rating") && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 w-full"
                    onClick={() => {
                      setSelectedSpecialty("all");
                      setSelectedLocation("all");
                      setSortBy("rating");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Sheet open={mapOpen} onOpenChange={setMapOpen}>
            <SheetContent
              side="bottom"
              className="max-h-[85dvh] gap-3 overflow-y-auto px-3 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:hidden"
            >
              <SheetHeader className="px-1 pt-0 pr-10">
                <SheetTitle>Mapa de consultorios</SheetTitle>
                <SheetDescription>
                  {mapDoctors.length
                    ? `${mapDoctors.length} ubicaciones disponibles en México.`
                    : "Aún no hay doctores con coordenadas para mostrar."}
                </SheetDescription>
              </SheetHeader>
              <DoctorsMap doctors={mapDoctors} />
            </SheetContent>
          </Sheet>

          {/* Results */}
          <MotionList className="grid gap-6">
            {isLoading && (
              <Card>
                <CardContent className="p-6">Cargando doctores...</CardContent>
              </Card>
            )}
            {!isLoading &&
              sortedDoctors.map((doctor) => {
                const IconComponent = doctor.icon;
                return (
                  <Card
                    key={doctor.id}
                    className="border-[#ebebeb] bg-white shadow-none transition-colors hover:border-[#d4d4d4]"
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                          <Avatar className="h-16 w-16 shrink-0 sm:h-20 sm:w-20">
                            {doctor.image && (
                              <AvatarImage
                                src={avatarUrl(doctor.image, doctor.userId)}
                                alt={doctor.name}
                              />
                            )}
                            <AvatarFallback className="text-lg">
                              {doctor.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="mb-2 flex items-center space-x-3">
                              <h3 className="text-lg font-semibold break-words sm:text-xl">
                                {doctor.name}
                              </h3>
                              {IconComponent && (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#f5f5f5]">
                                  <IconComponent className="h-4 w-4 text-[#6b6b6b]" />
                                </div>
                              )}
                            </div>
                            <Badge variant="secondary" className="mb-2">
                              {doctor.specialty}
                            </Badge>
                            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#6b6b6b]">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-current text-yellow-400" />
                                <span>{doctor.rating}</span>
                                <span>({doctor.reviews} reseñas)</span>
                              </div>
                              <span>•</span>
                              <span>
                                {doctor.experience} años de experiencia
                              </span>
                            </div>
                            <div className="mb-3 space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 shrink-0 text-[#a3a3a3]" />
                                <span>
                                  {doctor.clinic ? `${doctor.clinic} · ` : ""}
                                  {[doctor.location, doctor.state]
                                    .filter(Boolean)
                                    .join(", ") || "Ubicación no registrada"}
                                </span>
                              </div>
                              {doctor.address && (
                                <div className="flex items-center gap-2 pl-6">
                                  <span className="text-[#6b6b6b]">
                                    {doctor.address}
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="mb-3 text-sm text-[#525252]">
                              {doctor.about}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm text-[#6b6b6b]">
                                Idiomas:
                              </span>
                              {doctor.languages.map((lang, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {lang}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="w-full min-w-0 sm:w-40 sm:shrink-0 sm:text-right">
                          <div className="mb-1 text-xl font-semibold text-[#171717] sm:text-2xl">
                            {doctor.price}
                          </div>
                          <div className="mb-3 text-sm text-[#6b6b6b]">
                            por consulta
                          </div>
                          <div className="mb-4 flex items-center gap-1 text-sm sm:justify-end">
                            <Clock className="h-4 w-4 text-[#6b6b6b]" />
                            <span className="font-medium text-[#525252]">
                              {doctor.nextAvailable}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <Link href={`/doctor/${doctor.id}`}>
                              <Button
                                variant="outline"
                                className="min-h-11 w-full"
                              >
                                Ver Perfil
                              </Button>
                            </Link>
                            <Link href={`/book-appointment/${doctor.id}`}>
                              <Button className="min-h-11 w-full">
                                <Calendar className="mr-2 h-4 w-4" />
                                Agendar Cita
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </MotionList>

          {sortedDoctors.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold">
                  No se encontraron doctores
                </h3>
                <p className="mb-4 text-gray-600">
                  Intenta ajustar tus filtros de búsqueda para encontrar más
                  opciones.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedSpecialty("all");
                    setSelectedLocation("all");
                  }}
                >
                  Limpiar Filtros
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProductShell>
  );
}
