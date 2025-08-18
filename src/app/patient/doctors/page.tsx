"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Badge } from "~/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import {
  Calendar,
  ArrowLeft,
  Search,
  Star,
  MapPin,
  Clock,
  Heart,
  Stethoscope,
  Brain,
  Eye,
  Filter,
  Users,
} from "lucide-react"
import Link from "next/link"
import { api } from "src/trpc/react"

export default function DoctorsDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSpecialty, setSelectedSpecialty] = useState("all")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [sortBy, setSortBy] = useState("rating")

  const { data, isLoading } = api.doctor.getAll.useQuery()
  const doctors = (data?.result ?? []).map((d: any) => {
    const averageRating =
      d.rating ?? (d.reviews?.length ? d.reviews.reduce((acc: number, r: any) => acc + (r.rating ?? 0), 0) / d.reviews.length : 0)
    const reviewsCount = d.totalReviews ?? d.reviews?.length ?? 0
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
      image: d.user?.image ?? "/placeholder.svg?height=100&width=100",
      nextAvailable: "",
      icon: Heart,
      languages: [],
      education: "",
      about: d.about ?? "",
    }
  })

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

  const locations = ["Centro de la Ciudad", "Zona Norte", "Zona Sur", "Zona Este", "Zona Oeste"]

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch =
      !searchTerm ||
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.clinic?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesSpecialty = selectedSpecialty === "all" || doctor.specialty === selectedSpecialty
    const matchesLocation = selectedLocation === "all" || doctor.location === selectedLocation

    return matchesSearch && matchesSpecialty && matchesLocation
  })

  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return b.rating - a.rating
      case "price":
        return Number.parseInt((a.price || "0").replace("$", "")) - Number.parseInt((b.price || "0").replace("$", ""))
      case "experience":
        return b.experience - a.experience
      case "reviews":
        return b.reviews - a.reviews
      default:
        return 0
    }
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
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">MediCare Pro</span>
          </div>
          <div className="text-gray-600">|</div>
          <h1 className="text-xl font-semibold">Directorio de Doctores</h1>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Search and Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Buscar Doctores</CardTitle>
              <CardDescription>Encuentra el especialista perfecto para ti</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar doctor, clínica..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                  <SelectTrigger>
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
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
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
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
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
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Mostrando {sortedDoctors.length} doctores</span>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros Avanzados
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="grid gap-6">
            {isLoading && (
              <Card>
                <CardContent className="p-6">Cargando doctores...</CardContent>
              </Card>
            )}
            {!isLoading && sortedDoctors.map((doctor) => {
              const IconComponent = doctor.icon
              return (
                <Card key={doctor.id} className="hover:shadow-lg transition-shadow">
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
                            {IconComponent && (
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <IconComponent className="w-5 h-5 text-blue-600" />
                              </div>
                            )}
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
                          <div className="space-y-1 text-sm mb-3">
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span>
                                {doctor.clinic} - {doctor.location}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600">{doctor.address}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{doctor.about}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Idiomas:</span>
                            {doctor.languages.map((lang, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {lang}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600 mb-1">{doctor.price}</div>
                        <div className="text-sm text-gray-600 mb-3">por consulta</div>
                        <div className="flex items-center space-x-1 text-sm mb-4">
                          <Clock className="w-4 h-4 text-green-500" />
                          <span className="text-green-600 font-medium">{doctor.nextAvailable}</span>
                        </div>
                        <div className="space-y-2">
                          <Link href={`/doctor/${doctor.id}`}>
                            <Button variant="outline" className="w-full">
                              Ver Perfil
                            </Button>
                          </Link>
                          <Link href={`/book-appointment/${doctor.id}`}>
                            <Button className="w-full">
                              <Calendar className="w-4 h-4 mr-2" />
                              Agendar Cita
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {sortedDoctors.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron doctores</h3>
                <p className="text-gray-600 mb-4">
                  Intenta ajustar tus filtros de búsqueda para encontrar más opciones.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setSelectedSpecialty("all")
                    setSelectedLocation("all")
                  }}
                >
                  Limpiar Filtros
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
