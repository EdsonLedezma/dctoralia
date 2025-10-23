"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { Checkbox } from "~/components/ui/checkbox"
import { Calendar, User, CheckCircle, ArrowLeft, Heart } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { api } from "src/trpc/react"
import { toast } from "sonner"

export default function BookAppointmentPage() {
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const params = useParams<{ doctorId: string }>()
  const doctorId = Array.isArray(params?.doctorId) ? params?.doctorId[0] : params?.doctorId
  const router = useRouter()

  const { data: doctorRes } = api.doctor.getById.useQuery({ id: doctorId as string }, { enabled: !!doctorId })
  const doctor = doctorRes?.result
  const { data: servicesRes } = api.services.publicGetByDoctor.useQuery({ doctorId: doctorId as string }, { enabled: !!doctorId })
  const services = (servicesRes?.result ?? []).map((s: any) => ({ id: s.id, name: s.name, price: `$${s.price}`, duration: `${s.duration} min` }))
  const { data: profile } = api.auth.getProfile.useQuery()
  const patientId = profile?.patient?.id as string | undefined
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: "",
    gender: "",
    reason: "",
    insurance: "",
    emergencyContact: "",
    emergencyPhone: "",
    terms: false,
  })

  const createAppointment = api.appointments.create.useMutation()

  const availableDates = [
    "2024-01-29",
    "2024-01-30",
    "2024-01-31",
    "2024-02-01",
    "2024-02-02",
    "2024-02-05",
    "2024-02-06",
  ]

  const timeSlots = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
  ]

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 4) {
      setStep(step + 1)
    } else {
      // Procesar la cita
      if (!doctorId || !selectedService || !selectedDate || !selectedTime || !patientId) return
      try {
        await createAppointment.mutateAsync({
          patientId: patientId,
          doctorId,
          serviceId: selectedService,
          date: new Date(`${selectedDate}T${selectedTime}:00`),
          time: selectedTime,
          duration: Number((services.find((s) => s.id === selectedService)?.duration || "0").split(" ")[0]) || 30,
          reason: formData.reason || "Consulta",
          notes: "",
        })
        toast.success("Cita agendada")
        setStep(5)
      } catch (err) {
        toast.error("No se pudo agendar la cita")
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const selectedServiceData = services.find((s) => s.id === selectedService)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <Link href="/doctor/1">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Perfil
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Dopilot</span>
          </div>
          <div className="text-gray-600">|</div>
          <h1 className="text-xl font-semibold">Agendar Cita</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= stepNumber ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {step > stepNumber ? <CheckCircle className="w-5 h-5" /> : stepNumber}
                  </div>
                  {stepNumber < 4 && (
                    <div className={`w-16 h-1 mx-2 ${step > stepNumber ? "bg-blue-600" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Servicio</span>
              <span>Fecha y Hora</span>
              <span>Información</span>
              <span>Confirmación</span>
            </div>
          </div>

          {step === 5 ? (
            // Confirmation Page
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-4">¡Cita Agendada Exitosamente!</h2>
                <p className="text-gray-600 mb-6">Hemos enviado los detalles de tu cita a tu correo electrónico.</p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold mb-2">Detalles de tu cita:</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Servicio:</strong> {selectedServiceData?.name}
                    </p>
                    <p>
                      <strong>Fecha:</strong> {formatDate(selectedDate)}
                    </p>
                    <p>
                      <strong>Hora:</strong> {selectedTime}
                    </p>
                    <p>
                      <strong>Doctor:</strong> Dr. Juan Carlos Pérez
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Button className="w-full">Agregar al Calendario</Button>
                  <Link href={`/doctor/${doctorId}`}>
                    <Button variant="outline" className="w-full">
                      Volver al Perfil
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Step 1: Select Service */}
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Heart className="w-5 h-5" />
                      <span>Selecciona un Servicio</span>
                    </CardTitle>
                    <CardDescription>Elige el tipo de consulta que necesitas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={selectedService} onValueChange={setSelectedService}>
                      <div className="space-y-4">
                        {services.map((service) => (
                          <div
                            key={service.id}
                            className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50"
                          >
                            <RadioGroupItem value={service.id} id={service.id} />
                            <div className="flex-1">
                              <Label htmlFor={service.id} className="font-medium cursor-pointer">
                                {service.name}
                              </Label>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-sm text-gray-600">{service.duration}</span>
                                <span className="text-lg font-semibold text-green-600">{service.price}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Select Date and Time */}
              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>Fecha y Hora</span>
                    </CardTitle>
                    <CardDescription>Selecciona cuándo quieres tu cita</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-base font-medium mb-3 block">Fecha disponible</Label>
                      <RadioGroup value={selectedDate} onValueChange={setSelectedDate}>
                        <div className="grid grid-cols-2 gap-3">
                          {availableDates.map((date) => (
                            <div
                              key={date}
                              className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <RadioGroupItem value={date} id={date} />
                              <Label htmlFor={date} className="cursor-pointer">
                                {formatDate(date)}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {selectedDate && (
                      <div>
                        <Label className="text-base font-medium mb-3 block">Hora disponible</Label>
                        <RadioGroup value={selectedTime} onValueChange={setSelectedTime}>
                          <div className="grid grid-cols-3 gap-3">
                            {timeSlots.map((time) => (
                              <div
                                key={time}
                                className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50"
                              >
                                <RadioGroupItem value={time} id={time} />
                                <Label htmlFor={time} className="cursor-pointer">
                                  {time}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Personal Information */}
              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="w-5 h-5" />
                      <span>Información Personal</span>
                    </CardTitle>
                    <CardDescription>Completa tus datos para la cita</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">Nombre</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange("firstName", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Apellido</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange("lastName", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                        <Input
                          id="birthDate"
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) => handleInputChange("birthDate", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="gender">Género</Label>
                        <Select onValueChange={(value) => handleInputChange("gender", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="femenino">Femenino</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="reason">Motivo de la consulta</Label>
                      <Textarea
                        id="reason"
                        placeholder="Describe brevemente el motivo de tu consulta..."
                        value={formData.reason}
                        onChange={(e) => handleInputChange("reason", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="insurance">Seguro Médico (opcional)</Label>
                      <Input
                        id="insurance"
                        placeholder="Nombre de tu seguro médico"
                        value={formData.insurance}
                        onChange={(e) => handleInputChange("insurance", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="emergencyContact">Contacto de Emergencia</Label>
                        <Input
                          id="emergencyContact"
                          placeholder="Nombre completo"
                          value={formData.emergencyContact}
                          onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyPhone">Teléfono de Emergencia</Label>
                        <Input
                          id="emergencyPhone"
                          placeholder="Número de teléfono"
                          value={formData.emergencyPhone}
                          onChange={(e) => handleInputChange("emergencyPhone", e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Confirmation */}
              {step === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>Confirmar Cita</span>
                    </CardTitle>
                    <CardDescription>Revisa los detalles antes de confirmar</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Resumen de la Cita</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Servicio:</span>
                          <span className="font-medium">{selectedServiceData?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fecha:</span>
                          <span className="font-medium">{formatDate(selectedDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hora:</span>
                          <span className="font-medium">{selectedTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Duración:</span>
                          <span className="font-medium">{selectedServiceData?.duration}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Precio:</span>
                          <span className="font-medium text-green-600">{selectedServiceData?.price}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Información del Paciente</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Nombre:</span>
                          <span className="font-medium">
                            {formData.firstName} {formData.lastName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Email:</span>
                          <span className="font-medium">{formData.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Teléfono:</span>
                          <span className="font-medium">{formData.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="terms"
                        checked={formData.terms}
                        onCheckedChange={(checked) => handleInputChange("terms", checked as boolean)}
                      />
                      <Label htmlFor="terms" className="text-sm">
                        Acepto los términos y condiciones y la política de privacidad
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                    Anterior
                  </Button>
                )}
                <Button
                  type="submit"
                  className="ml-auto"
                  disabled={
                    (step === 1 && !selectedService) ||
                    (step === 2 && (!selectedDate || !selectedTime)) ||
                    (step === 3 && (!formData.firstName || !formData.lastName || !formData.email || !formData.phone)) ||
                    (step === 4 && !formData.terms)
                  }
                >
                  {step === 4 ? "Confirmar Cita" : "Siguiente"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
