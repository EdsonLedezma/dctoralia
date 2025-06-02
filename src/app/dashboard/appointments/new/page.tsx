"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Calendar, ArrowLeft, Save, Clock, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NewAppointmentPage() {
  const [formData, setFormData] = useState({
    patientId: "",
    date: "",
    time: "",
    duration: "30",
    type: "",
    notes: "",
    priority: "normal",
  })
  const router = useRouter()

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("doctor_logged_in")
    if (!isLoggedIn) {
      router.push("/login")
    }
  }, [router])

  const patients = [
    { id: "1", name: "María González" },
    { id: "2", name: "Carlos Rodríguez" },
    { id: "3", name: "Ana López" },
    { id: "4", name: "Pedro Martínez" },
  ]

  const appointmentTypes = [
    "Consulta General",
    "Control",
    "Primera Consulta",
    "Seguimiento",
    "Urgencia",
    "Examen Médico",
    "Revisión de Resultados",
  ]

  const timeSlots = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Aquí se guardaría la cita en la base de datos
    console.log("Nueva cita:", formData)
    router.push("/dashboard/appointments")
  }

  // Obtener fecha mínima (hoy)
  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="px-6 py-4 flex items-center space-x-4">
          <Link href="/dashboard/appointments">
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
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          {/* Información del Paciente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Información del Paciente</span>
              </CardTitle>
              <CardDescription>Selecciona el paciente para la cita</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient">Paciente</Label>
                <Select onValueChange={(value) => handleInputChange("patientId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" size="sm">
                  Buscar Paciente
                </Button>
                <Link href="/dashboard/patients/new">
                  <Button type="button" variant="outline" size="sm">
                    Nuevo Paciente
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Información de la Cita */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Detalles de la Cita</span>
              </CardTitle>
              <CardDescription>Configura la fecha, hora y tipo de consulta</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  min={today}
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Hora</Label>
                <Select onValueChange={(value) => handleInputChange("time", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duración (minutos)</Label>
                <Select onValueChange={(value) => handleInputChange("duration", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="30 minutos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">60 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Consulta</Label>
                <Select onValueChange={(value) => handleInputChange("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select onValueChange={(value) => handleInputChange("priority", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Normal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notas Adicionales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Información Adicional</span>
              </CardTitle>
              <CardDescription>Notas y observaciones para la cita</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  placeholder="Motivo de la consulta, síntomas, observaciones especiales..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Resumen de la Cita */}
          {formData.patientId && formData.date && formData.time && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">Resumen de la Cita</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Paciente:</span>
                    <span className="font-medium">{patients.find((p) => p.id === formData.patientId)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Fecha:</span>
                    <span className="font-medium">
                      {new Date(formData.date).toLocaleDateString("es-ES", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Hora:</span>
                    <span className="font-medium">{formData.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Duración:</span>
                    <span className="font-medium">{formData.duration} minutos</span>
                  </div>
                  {formData.type && (
                    <div className="flex justify-between">
                      <span className="text-blue-600">Tipo:</span>
                      <span className="font-medium">{formData.type}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end space-x-4">
            <Link href="/dashboard/appointments">
              <Button variant="outline">Cancelar</Button>
            </Link>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              Agendar Cita
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
