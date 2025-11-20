"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Calendar, Clock, MapPin, Phone, Mail, Star, Award, CheckCircle, Heart, Brain, Stethoscope } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"
import { api } from "src/trpc/react"

export default function DoctorProfilePage() {
  const { data: session } = useSession()
  const homeHref = session?.user
    ? session.user.role === "DOCTOR"
      ? "/dashboard"
      : "/patient/dashboard"
    : "/"
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const params = useParams<{ id: string }>()
  const doctorId = Array.isArray(params?.id) ? params?.id[0] : params?.id

  const { data: doctorRes, isLoading } = api.doctor.getById.useQuery({ id: doctorId as string }, { enabled: !!doctorId })
  const doctorData: any = doctorRes?.result
  type Service = {
    id: string
    name: string
    description: string
    duration: string
    price: string
    icon: any
    includes: string[]
  }

  type Testimonial = {
    name: string
    rating: number
    comment: string
    date: string
  }

  const doctor = {
    id: doctorData?.id ?? doctorId,
    name: doctorData?.user?.name ?? "",
    specialty: doctorData?.specialty ?? "",
    image: doctorData?.user?.image ?? "/placeholder.svg?height=200&width=200",
    rating: doctorData?.rating ?? 0,
    reviews: doctorData?.totalReviews ?? doctorData?.reviews?.length ?? 0,
    experience: doctorData?.experience ?? 0,
    patients: undefined as number | undefined,
    education: [] as string[],
    certifications: [] as string[],
    languages: [] as string[],
    about: doctorData?.about ?? "",
    location: "",
    phone: doctorData?.phone ?? "",
    email: doctorData?.user?.email ?? "",
    schedule: (doctorData?.schedules ?? []).reduce((acc: any, s: any) => {
      acc[`Día ${s.dayOfWeek}`] = `${s.startTime} - ${s.endTime}`
      return acc
    }, {} as Record<string, string>),
  }

  const services: Service[] = (doctorData?.services ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    duration: `${s.duration} minutos`,
    price: `$${s.price}`,
    icon: Heart,
    includes: [] as string[],
  }))

  const testimonials: Testimonial[] = (doctorData?.reviews ?? []).map((r: any) => ({
    name: r.patient?.user?.name ?? "Paciente",
    rating: r.rating ?? 0,
    comment: r.comment ?? "",
    date: new Date(r.createdAt).toLocaleDateString("es-ES"),
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href={homeHref}>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Dopilot</span>
            </div>
          </Link>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost">Portal Médico</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Doctor Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6 text-center">
                {isLoading && <div>Cargando...</div>}
                <Avatar className="w-32 h-32 mx-auto mb-4">
                  <AvatarImage src={doctor.image || "/placeholder.svg"} alt={doctor.name} />
                  <AvatarFallback className="text-2xl">
                    {doctor.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold mb-2">{doctor.name}</h1>
                <p className="text-lg text-blue-600 mb-4">{doctor.specialty}</p>

                <div className="flex items-center justify-center space-x-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${i < Math.floor(doctor.rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {doctor.rating} ({doctor.reviews} reseñas)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{doctor.experience}</div>
                    <div className="text-sm text-gray-600">Años de experiencia</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{doctor.patients ?? "-"}+</div>
                    <div className="text-sm text-gray-600">Pacientes atendidos</div>
                  </div>
                </div>

                <Button className="w-full mb-4" size="lg">
                  <Calendar className="w-4 h-4 mr-2" />
                  Agendar Cita
                </Button>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="text-sm">{doctor.location}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-sm">{doctor.phone}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-sm">{doctor.email}</span>
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader>
                <CardTitle>Horarios de Atención</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(doctor.schedule as Record<string, string>).map(([day, hours]: [string, string]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="font-medium">{day}</span>
                      <span className={hours === "Cerrado" ? "text-red-600" : "text-gray-600"}>{hours}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="services" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="services">Servicios</TabsTrigger>
                <TabsTrigger value="about">Acerca de</TabsTrigger>
                <TabsTrigger value="reviews">Reseñas</TabsTrigger>
                <TabsTrigger value="education">Formación</TabsTrigger>
              </TabsList>

              {/* Services Tab */}
              <TabsContent value="services" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Servicios Disponibles</h2>
                  <p className="text-gray-600 mb-6">
                    Selecciona el servicio que necesitas y agenda tu cita de forma fácil y rápida.
                  </p>
                </div>

                <div className="grid gap-6">
                  {services.map((service: Service) => {
                    const IconComponent = service.icon
                    const isSelected = selectedService === service.id

                    return (
                      <Card
                        key={service.id}
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""
                        }`}
                        onClick={() => setSelectedService(isSelected ? null : service.id)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <IconComponent className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold">{service.name}</h3>
                                <p className="text-gray-600">{service.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600">{service.price}</div>
                              <div className="text-sm text-gray-500">{service.duration}</div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="border-t pt-4 mt-4">
                              <h4 className="font-semibold mb-2">Este servicio incluye:</h4>
                              <ul className="space-y-1">
                                {service.includes.map((item: string, index: number) => (
                                  <li key={index} className="flex items-center space-x-2 text-sm">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-4 flex space-x-3">
                                <Button className="flex-1">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Agendar Este Servicio
                                </Button>
                                <Button variant="outline">Más Información</Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>

              {/* About Tab */}
              <TabsContent value="about" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Acerca del Dr. {doctor.name.split(" ")[1]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed mb-6">{doctor.about}</p>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">Especialidades</h4>
                        <div className="space-y-2">
                          <Badge variant="secondary">Cardiología General</Badge>
                          <Badge variant="secondary">Cardiología Intervencionista</Badge>
                          <Badge variant="secondary">Ecocardiografía</Badge>
                          <Badge variant="secondary">Electrofisiología</Badge>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">Idiomas</h4>
                        <div className="space-y-1">
                          {doctor.languages.map((lang, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span>{lang}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Reseñas de Pacientes</h2>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${i < Math.floor(doctor.rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-semibold">{doctor.rating}</span>
                    <span className="text-gray-600">({doctor.reviews} reseñas)</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {testimonials.map((testimonial: Testimonial, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{testimonial.name}</h4>
                            <div className="flex items-center space-x-1">
                              {[...Array(testimonial.rating)].map((_, i: number) => (
                                <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                              ))}
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">{testimonial.date}</span>
                        </div>
                        <p className="text-gray-700">{testimonial.comment}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Education Tab */}
              <TabsContent value="education" className="space-y-6">
                <div className="grid gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Formación Académica</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {doctor.education.map((edu, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <Award className="w-5 h-5 text-blue-600" />
                            <span>{edu}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Certificaciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {doctor.certifications.map((cert, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span>{cert}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <Button size="lg" className="rounded-full shadow-lg">
          <Calendar className="w-5 h-5 mr-2" />
          Agendar Cita
        </Button>
      </div>
    </div>
  )
}
