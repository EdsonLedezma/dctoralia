"use client"

import React, { useState } from "react"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Calendar, ArrowLeft, Save, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import DashboardWrapper from "../../../../components/auth/DashboardWrapper"
import { useAppointment } from "~/server/api/routers/appointment"

type FormData = {
  patientId: string
  date: string 
  duration: string
  reason: string
  notes: string
  priority: string
}

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

export default function NewAppointmentPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    patientId: "",
    date: "", // aquí solo fecha seleccionada, luego se concatena con hora antes de enviar
    time: "",
    duration: "30",
    reason: "",
    notes: "",
    priority: "normal",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!formData.patientId || !formData.date || !formData.time || !formData.reason) {
      setError("Por favor, completa todos los campos requeridos.")
      setLoading(false)
      return
    }

    // Concatenar fecha y hora para crear un ISO string completo
    const dateTimeISO = new Date(`${formData.date}T${formData.time}:00`).toISOString()

    // Construir el objeto que enviaremos al backend
    const bodyToSend = {
      patientId: formData.patientId,
      date: dateTimeISO,
      duration: formData.duration,
      reason: formData.reason,
      notes: formData.notes,
      priority: formData.priority,
     
    }

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyToSend),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || "Error desconocido al crear la cita.")
        setLoading(false)
        return
      }

      router.push("/dashboard/appointments")
    } catch {
      setError("Error de conexión al servidor.")
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="px-6 py-4 flex items-center space-x-4">
            <Link href="/dashboard/appointments" passHref>
              <Button variant="ghost" size="sm" asChild>
                <span className="inline-flex items-center">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </span>
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

        <main className="p-6">
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
                  <Select
                    onValueChange={(value) => handleInputChange("patientId", value)}
                    value={formData.patientId}
                    required
                  >
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
                  <Link href="/dashboard/patients/new" passHref>
                    <Button type="button" variant="outline" size="sm" asChild>
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
                  <Select
                    onValueChange={(value) => handleInputChange("time", value)}
                    value={formData.time}
                    required
                  >
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
                  <Select
                    onValueChange={(value) => handleInputChange("duration", value)}
                    value={formData.duration}
                    required
                  >
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
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="reason">Tipo de Consulta</Label>
                  <Select
                    onValueChange={(value) => handleInputChange("reason", value)}
                    value={formData.reason}
                    required
                  >
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
                  <Select
                    onValueChange={(value) => handleInputChange("priority", value)}
                    value={formData.priority}
                    required
                  >
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
                <CardTitle>Notas Adicionales</CardTitle>
                <CardDescription>Información adicional sobre la cita</CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor="notes" className="block mb-2">
                  Notas
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Motivo de la consulta, síntomas, observaciones..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="flex space-x-4">
              <Button type="submit" disabled={loading} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Guardando..." : "Agendar Cita"}
              </Button>
              <Link href="/dashboard/appointments" passHref>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                  asChild
                >
                  Cancelar
                </Button>
              </Link>
            </div>

            {error && (
              <p className="mt-4 text-red-600 text-center font-medium">{error}</p>
            )}
          </form>
        </main>
      </div>
    </DashboardWrapper>
  )
}
