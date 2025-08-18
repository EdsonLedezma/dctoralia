"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Badge } from "~/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Calendar, ArrowLeft, Search, Star, MapPin, Clock, Heart, Stethoscope, Brain } from "lucide-react"
import Link from "next/link"
import { api } from "src/trpc/react"

export default function BookAppointmentPage() {
  const [selectedSpecialty, setSelectedSpecialty] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null)

  const { data } = api.doctor.getAll.useQuery()
  const doctors = (data?.result ?? []).map((d: any) => ({
    id: d.id,
    name: d.user?.name ?? "",
    specialty: d.specialty,
    rating: d.rating ?? 0,
    reviews: d.totalReviews ?? d.reviews?.length ?? 0,
    experience: d.experience ?? 0,
    location: "",
    address: "",
    price: d.services?.[0]?.price ? `$${d.services[0].price}` : "",
    image: d.user?.image ?? "/placeholder.svg?height=100&width=100",
    nextAvailable: "",
    icon: Stethoscope,
  }))

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
  ]


  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSpecialty = !selectedSpecialty || doctor.specialty === selectedSpecialty
    const matchesSearch =
      !searchTerm ||
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.location.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSpecialty && matchesSearch
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="px-6 py-4 flex items-center space-x-4">
          <Link href="/patient/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">MediCare Pro</span>
          </div>
          <div className="text-gray-600">|</div>
          <h1 className="text-xl font-semibold">Agendar Nueva Cita</h1>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Search and Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Buscar Doctor</CardTitle>
              <CardDescription>Encuentra el especialista que necesitas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar por nombre o ubicación</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                  <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las especialidades" />
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Doctores Disponibles ({filteredDoctors.length})</h2>
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
                const IconComponent = doctor.icon
                return (
                  <Card
                    key={doctor.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${selectedDoctor === doctor.id ? "ring-2 ring-blue-500 bg-blue-50" : ""
                      }`}
                    onClick={() => setSelectedDoctor(selectedDoctor === doctor.id ? null : doctor.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <Avatar className="w-20 h-20">
                            <AvatarImage src={doctor.image || "/placeholder.svg"} alt={doctor.name} />
                            <AvatarFallback className="text-lg">
                              {doctor.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-semibold">{doctor.name}</h3>
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <IconComponent className="w-5 h-5 text-blue-600" />
                              </div>
                            </div>
                            <Badge variant="secondary" className="mb-2">
                              {doctor.specialty}
                            </Badge>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center space-x-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span>{doctor.rating}</span>
                                <span>({doctor.reviews} reseñas)</span>
                              </div>
                              <span>•</span>
                              <span>{doctor.experience} años de experiencia</span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span>{doctor.location}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-600">{doctor.address}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600 mb-1">{doctor.price}</div>
                          <div className="text-sm text-gray-600 mb-3">por consulta</div>
                          <div className="flex items-center space-x-1 text-sm">
                            <Clock className="w-4 h-4 text-green-500" />
                            <span className="text-green-600 font-medium">{doctor.nextAvailable}</span>
                          </div>
                        </div>
                      </div>

                      {selectedDoctor === doctor.id && (
                        <div className="mt-6 pt-6 border-t">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold mb-2">¿Listo para agendar?</h4>
                              <p className="text-sm text-gray-600">
                                Selecciona fecha y hora para tu cita con {doctor.name}
                              </p>
                            </div>
                            <div className="space-x-3">
                              <Link href={`/doctor/${doctor.id}`}>
                                <Button variant="outline">Ver Perfil Completo</Button>
                              </Link>
                              <Link href={`/book-appointment/${doctor.id}`}>
                                <Button>
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Agendar Cita
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
