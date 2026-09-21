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
  Clock,
  Heart,
  Users,
} from "lucide-react";
import Link from "next/link";
import { api, type RouterOutputs } from "src/trpc/react";
import { ProductShell } from "~/components/shell/product-shell";

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
      name: d.user?.name ?? "Sin nombre",
      specialty: d.specialty,
      rating: Number(averageRating?.toFixed?.(1) ?? 0),
      reviews: reviewsCount,
      experience: d.experience ?? 0,
      location: "",
      clinic: "",
      address: "",
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

  const locations = [
    "Centro de la Ciudad",
    "Zona Norte",
    "Zona Sur",
    "Zona Este",
    "Zona Oeste",
  ];

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch =
      !searchTerm ||
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.clinic?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialty =
      selectedSpecialty === "all" || doctor.specialty === selectedSpecialty;
    const matchesLocation =
      selectedLocation === "all" || doctor.location === selectedLocation;

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

  return (
    <ProductShell role="PATIENT">
      <div className="min-h-[100dvh] bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-5xl">
          {/* Search and Filters */}
          <div className="mb-8 border-b border-[#ebebeb] pb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="relative w-full md:w-[280px]">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#8a8a8a]" />
                <Input
                  placeholder="Buscar doctor o clínica"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 rounded-md border-[#e5e5e5] bg-white pl-9 text-sm shadow-none placeholder:text-[#8a8a8a] focus-visible:border-[#a3a3a3] focus-visible:ring-1 focus-visible:ring-[#d4d4d4]"
                />
              </div>
              <div className="w-full sm:w-auto">
                <Select
                  value={selectedSpecialty}
                  onValueChange={setSelectedSpecialty}
                >
                  <SelectTrigger className="h-9 w-full border-transparent bg-transparent px-2.5 shadow-none hover:bg-[#f5f5f5] sm:w-auto">
                    <SelectValue placeholder="Especialidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Todas las especialidades
                    </SelectItem>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-auto">
                <Select
                  value={selectedLocation}
                  onValueChange={setSelectedLocation}
                >
                  <SelectTrigger className="h-9 w-full border-transparent bg-transparent px-2.5 shadow-none hover:bg-[#f5f5f5] sm:w-auto">
                    <SelectValue placeholder="Ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las ubicaciones</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-auto">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9 w-full border-transparent bg-transparent px-2.5 shadow-none hover:bg-[#f5f5f5] sm:w-auto">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Mejor calificados</SelectItem>
                    <SelectItem value="price">Precio menor</SelectItem>
                    <SelectItem value="experience">Más experiencia</SelectItem>
                    <SelectItem value="reviews">Más reseñas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-xs text-[#737373]">
              <span>{sortedDoctors.length} doctores encontrados</span>
              {(searchTerm ||
                selectedSpecialty !== "all" ||
                selectedLocation !== "all") && (
                <button
                  type="button"
                  className="cursor-pointer text-[#525252] underline-offset-2 transition-colors hover:text-black hover:underline"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedSpecialty("all");
                    setSelectedLocation("all");
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="grid gap-6">
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
                                src={doctor.image}
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
                                  {doctor.clinic} - {doctor.location}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[#6b6b6b]">
                                  {doctor.address}
                                </span>
                              </div>
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
                              <Button variant="outline" className="w-full">
                                Ver Perfil
                              </Button>
                            </Link>
                            <Link href={`/book-appointment/${doctor.id}`}>
                              <Button className="w-full">
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
          </div>

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
