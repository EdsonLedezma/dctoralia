"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Calendar, Clock, MapPin, Phone, Mail, Star, Award, CheckCircle, Heart, Brain, Stethoscope } from "lucide-react"
import Link from "next/link"

export default function DoctorProfilePage() {
  const [selectedService, setSelectedService] = useState<string | null>(null)

  // Datos del doctor (en una app real vendría de la base de datos)
  const doctor = {
    id: "1",
    name: "Dr. Juan Carlos Pérez",
    specialty: "Cardiología",
    image: "/placeholder.svg?height=200&width=200",
    rating: 4.9,
    reviews: 127,
    experience: 15,
    patients: 1200,
    education: [
      "Medicina - Universidad Nacional (2005)",
      "Especialización en Cardiología - Hospital Central (2008)",
      "Fellowship en Cardiología Intervencionista - Mayo Clinic (2010)",
    ],
    certifications: ["Colegio Médico Nacional", "Sociedad de Cardiología", "Board Certified Cardiologist"],
    languages: ["Español", "Inglés", "Portugués"],
    about:
      "Especialista en cardiología con más de 15 años de experiencia. Me dedico a brindar atención integral del corazón, desde prevención hasta tratamientos avanzados. Mi enfoque se centra en la medicina personalizada y el cuidado compasivo de cada paciente.",
    location: "Clínica CardioVida, Av. Principal 123, Ciudad",
    phone: "+1 (555) 123-4567",
    email: "dr.perez@cardiovida.com",
    schedule: {
      Lunes: "8:00 AM - 6:00 PM",
      Martes: "8:00 AM - 6:00 PM",
      Miércoles: "8:00 AM - 6:00 PM",
      Jueves: "8:00 AM - 6:00 PM",
      Viernes: "8:00 AM - 4:00 PM",
      Sábado: "9:00 AM - 1:00 PM",
      Domingo: "Cerrado",
    },
  }

  const services = [
    {
      id: "1",
      name: "Consulta General de Cardiología",
      description: "Evaluación completa del sistema cardiovascular, diagnóstico y plan de tratamiento",
      duration: "45 minutos",
      price: "$150",
      icon: Heart,
      includes: [
        "Historia clínica completa",
        "Examen físico cardiovascular",
        "Electrocardiograma",
        "Plan de tratamiento personalizado",
      ],
    },
    {
      id: "2",
      name: "Ecocardiograma",
      description: "Ultrasonido del corazón para evaluar estructura y función cardíaca",
      duration: "30 minutos",
      price: "$200",
      icon: Stethoscope,
      includes: [
        "Ecocardiograma transtorácico",
        "Evaluación de válvulas cardíacas",
        "Medición de función ventricular",
        "Reporte detallado con imágenes",
      ],
    },
    {
      id: "3",
      name: "Holter 24 horas",
      description: "Monitoreo continuo del ritmo cardíaco durante 24 horas",
      duration: "15 minutos (colocación)",
      price: "$180",
      icon: Clock,
      includes: [
        "Colocación del dispositivo",
        "Monitoreo por 24 horas",
        "Análisis completo del ritmo",
        "Reporte de arritmias",
      ],
    },
    {
      id: "4",
      name: "Prueba de Esfuerzo",
      description: "Evaluación de la respuesta cardiovascular durante el ejercicio",
      duration: "60 minutos",
      price: "$250",
      icon: Award,
      includes: [
        "Electrocardiograma de esfuerzo",
        "Monitoreo de presión arterial",
        "Evaluación de capacidad funcional",
        "Detección de isquemia",
      ],
    },
    {
      id: "5",
      name: "Control Post-Operatorio",
      description: "Seguimiento especializado después de procedimientos cardíacos",
      duration: "30 minutos",
      price: "$120",
      icon: CheckCircle,
      includes: [
        "Evaluación de cicatrización",
        "Control de medicamentos",
        "Ajuste de tratamiento",
        "Recomendaciones de rehabilitación",
      ],
    },
    {
      id: "6",
      name: "Consulta de Segunda Opinión",
      description: "Revisión de diagnóstico y plan de tratamiento existente",
      duration: "45 minutos",
      price: "$180",
      icon: Brain,
      includes: [
        "Revisión de estudios previos",
        "Análisis de tratamiento actual",
        "Recomendaciones adicionales",
        "Reporte de segunda opinión",
      ],
    },
  ]

  const testimonials = [
    {
      name: "María González",
      rating: 5,
      comment:
        "Excelente doctor, muy profesional y dedicado. Me explicó todo claramente y el tratamiento fue muy efectivo.",
      date: "Hace 2 semanas",
    },
    {
      name: "Carlos Rodríguez",
      rating: 5,
      comment:
        "El Dr. Pérez salvó mi vida. Su diagnóstico temprano y tratamiento fueron fundamentales para mi recuperación.",
      date: "Hace 1 mes",
    },
    {
      name: "Ana López",
      rating: 5,
      comment: "Muy recomendado. Atención personalizada y seguimiento constante. Se nota su experiencia y dedicación.",
      date: "Hace 3 semanas",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">MediCare Pro</span>
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
                <Avatar className="w-32 h-32 mx-auto mb-4">
                  <AvatarImage src={doctor.image || "/placeholder.svg"} alt={doctor.name} />
                  <AvatarFallback className="text-2xl">
                    {doctor.name
                      .split(" ")
                      .map((n) => n[0])
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
                    <div className="text-2xl font-bold text-green-600">{doctor.patients}+</div>
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
                  {Object.entries(doctor.schedule).map(([day, hours]) => (
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
                  {services.map((service) => {
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
                                {service.includes.map((item, index) => (
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
                  {testimonials.map((testimonial, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{testimonial.name}</h4>
                            <div className="flex items-center space-x-1">
                              {[...Array(testimonial.rating)].map((_, i) => (
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
