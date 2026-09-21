"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { api, type RouterOutputs } from "src/trpc/react";
import { ProductShell } from "~/components/shell/product-shell";

type Doctor = Exclude<
  RouterOutputs["doctor"]["getAll"]["result"],
  null
>[number];

export default function BookAppointmentPage() {
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);

  const { data } = api.doctor.getAll.useQuery();
  const doctors = (data?.result ?? []).map((d: Doctor) => ({
    id: d.id,
    name: d.user?.name ?? "",
    specialty: d.specialty,
    rating: d.rating ?? 0,
    reviews: d.totalReviews ?? d.reviews?.length ?? 0,
    experience: d.experience ?? 0,
    location: "",
    address: "",
    price: d.services?.[0]?.price ? `$${d.services[0].price}` : "",
    image: d.user?.image,
    nextAvailable: "",
    icon: Stethoscope,
  }));

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

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSpecialty =
      selectedSpecialty === "all" || doctor.specialty === selectedSpecialty;
    const matchesSearch =
      !searchTerm ||
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.location.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSpecialty && matchesSearch;
  });

  return (
    <ProductShell role="PATIENT">
      <div className="min-h-screen bg-[#fafafa] p-6 sm:p-8">
        <div className="mx-auto max-w-6xl">
          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar por nombre o ubicación</Label>
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Dr. Juan Pérez, Clínica..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialty">Especialidad</Label>
                  <Select
                    value={selectedSpecialty}
                    onValueChange={setSelectedSpecialty}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las especialidades" />
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
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Doctores Disponibles ({filteredDoctors.length})
              </h2>
              <Select defaultValue="rating">
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Mejor calificados</SelectItem>
                  <SelectItem value="price">Precio menor</SelectItem>
                  <SelectItem value="experience">Más experiencia</SelectItem>
                  <SelectItem value="availability">Disponibilidad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-6">
              {filteredDoctors.map((doctor) => {
                const IconComponent = doctor.icon;
                return (
                  <Card
                    key={doctor.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedDoctor === doctor.id
                        ? "bg-blue-50 ring-2 ring-blue-500"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedDoctor(
                        selectedDoctor === doctor.id ? null : doctor.id,
                      )
                    }
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <Avatar className="h-20 w-20">
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
                              <h3 className="text-xl font-semibold">
                                {doctor.name}
                              </h3>
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                                <IconComponent className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <Badge variant="secondary" className="mb-2">
                              {doctor.specialty}
                            </Badge>
                            <div className="mb-3 flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 fill-current text-yellow-400" />
                                <span>{doctor.rating}</span>
                                <span>({doctor.reviews} reseñas)</span>
                              </div>
                              <span>•</span>
                              <span>
                                {doctor.experience} años de experiencia
                              </span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span>{doctor.location}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-600">
                                  {doctor.address}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="mb-1 text-2xl font-bold text-green-600">
                            {doctor.price}
                          </div>
                          <div className="mb-3 text-sm text-gray-600">
                            por consulta
                          </div>
                          <div className="flex items-center space-x-1 text-sm">
                            <Clock className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-green-600">
                              {doctor.nextAvailable}
                            </span>
                          </div>
                        </div>
                      </div>

                      {selectedDoctor === doctor.id && (
                        <div className="mt-6 border-t pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="mb-2 font-semibold">
                                ¿Listo para agendar?
                              </h4>
                              <p className="text-sm text-gray-600">
                                Selecciona fecha y hora para tu cita con{" "}
                                {doctor.name}
                              </p>
                            </div>
                            <div className="space-x-3">
                              <Link href={`/doctor/${doctor.id}`}>
                                <Button variant="outline">
                                  Ver Perfil Completo
                                </Button>
                              </Link>
                              <Link href={`/book-appointment/${doctor.id}`}>
                                <Button>
                                  <Calendar className="mr-2 h-4 w-4" />
                                  Agendar Cita
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ProductShell>
  );
}
