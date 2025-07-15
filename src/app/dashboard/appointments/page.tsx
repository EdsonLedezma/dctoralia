"use client"

import { useEffect, useState } from "react"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Calendar, Plus, Phone, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import DashboardWrapper from "../../../components/auth/DashboardWrapper"
import { useAppointment } from "~/server/api/routers/appointment"

type Appointment = {
  id: string
  time: string
  duration: number
  status: string
  reason?: string | null
  patient: {
    name: string
    phone?: string
  }
  service: {
    name: string
  }
}

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00",
]

const formatDate = (date: Date) =>
  date.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "confirmada":
      return "bg-green-100 text-green-800"
    case "pendiente":
      return "bg-yellow-100 text-yellow-800"
    case "completada":
      return "bg-blue-100 text-blue-800"
    case "cancelada":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export default function AppointmentsPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const { data: appointmentsData, isLoading } = useAppointment.getAll.useQuery()
  const appointments = appointmentsData?.result || []

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true)
      const dateISO = currentDate.toISOString().split("T")[0]

      try {
        const response = await fetch(`/api/appointments/appointments?date=${dateISO}`)
        if (!response.ok) throw new Error("Error al obtener citas")
        const data = await response.json()
        setAppointments(data)
      } catch (error) {
        console.error("Error fetching appointments:", error)
        setAppointments([])
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [currentDate])

  const previousDay = () => {
    setCurrentDate((date) => {
      const newDate = new Date(date)
      newDate.setDate(newDate.getDate() - 1)
      return newDate
    })
  }

  const nextDay = () => {
    setCurrentDate((date) => {
      const newDate = new Date(date)
      newDate.setDate(newDate.getDate() + 1)
      return newDate
    })
  }

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">MediCare Pro</span>
              </Link>
              <div className="text-gray-600">|</div>
              <h1 className="text-xl font-semibold">Agenda de Citas</h1>
            </div>

            <Link href="/dashboard/appointments/new" className="inline-flex">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Cita
              </Button>
            </Link>
          </div>
        </header>

        <div className="p-6">
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={previousDay}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-center">
                  <h2 className="text-lg font-semibold">{formatDate(currentDate)}</h2>
                  <p className="text-sm text-gray-600">{appointments.length} citas programadas</p>
                </div>
                <Button variant="outline" size="sm" onClick={nextDay}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Horarios del Día</CardTitle>
                <CardDescription>Vista detallada de la agenda</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center text-gray-600">Cargando citas...</p>
                ) : (
                  <div className="space-y-2">
                    {timeSlots.map((time) => {
                      const appointmentAtTime = appointments.find(
                        (appointment) => appointment.time === time
                      )
                      return (
                        <div
                          key={time}
                          className="flex items-center space-x-4 p-2 border-b border-gray-100"
                        >
                          <div className="w-16 text-sm font-medium text-gray-600">{time}</div>
                          {appointmentAtTime ? (
                            <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{appointmentAtTime.patient.name}</p>
                                  <p className="text-sm text-gray-600">{appointmentAtTime.service.name}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge className={getStatusColor(appointmentAtTime.status)}>
                                    {appointmentAtTime.status}
                                  </Badge>
                                  <span className="text-sm text-gray-500">{appointmentAtTime.duration} min</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 text-gray-400 text-sm">Disponible</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen del Día</CardTitle>
                <CardDescription>Estadísticas de citas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <SummaryCard label="Total" value={appointments.length} color="blue" />
                  <SummaryCard
                    label="Confirmadas"
                    value={appointments.filter((a) => a.status.toLowerCase() === "confirmada").length}
                    color="green"
                  />
                  <SummaryCard
                    label="Pendientes"
                    value={appointments.filter((a) => a.status.toLowerCase() === "pendiente").length}
                    color="yellow"
                  />
                  <SummaryCard
                    label="Completadas"
                    value={appointments.filter((a) => a.status.toLowerCase() === "completada").length}
                    color="blue"
                  />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Próximas Citas</h4>
                  <div className="space-y-3">
                    {appointments
                      .filter((appointment) => appointment.status.toLowerCase() !== "completada")
                      .slice(0, 3)
                      .map((appointment) => (
                        <div key={appointment.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{appointment.patient.name}</p>
                              <p className="text-xs text-gray-600">{appointment.service.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{appointment.time}</p>
                              <Badge className={getStatusColor(appointment.status)}>
                                {appointment.status}
                              </Badge>
                            </div>
                          </div>
                          {appointment.patient.phone && (
                            <div className="flex items-center space-x-1 mt-2">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{appointment.patient.phone}</span>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardWrapper>
  )
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  )
}
