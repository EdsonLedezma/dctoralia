"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Calendar, Clock, Plus, User, Phone, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import DashboardWrapper from "../../../components/auth/DashboardWrapper"

export default function AppointmentsPage() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const appointments = [
    {
      id: 1,
      patient: "María González",
      time: "09:00",
      duration: 30,
      type: "Consulta General",
      status: "confirmada",
      phone: "+1 234 567 8901",
      date: "2024-01-27",
    },
    {
      id: 2,
      patient: "Carlos Rodríguez",
      time: "10:30",
      duration: 45,
      type: "Control",
      status: "pendiente",
      phone: "+1 234 567 8902",
      date: "2024-01-27",
    },
    {
      id: 3,
      patient: "Ana López",
      time: "14:00",
      duration: 30,
      type: "Primera Consulta",
      status: "confirmada",
      phone: "+1 234 567 8903",
      date: "2024-01-27",
    },
    {
      id: 4,
      patient: "Pedro Martínez",
      time: "15:30",
      duration: 30,
      type: "Seguimiento",
      status: "completada",
      phone: "+1 234 567 8904",
      date: "2024-01-26",
    },
  ]

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const todayAppointments = appointments.filter((apt) => apt.date === currentDate.toISOString().split("T")[0])

  const previousDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 1)
    setCurrentDate(newDate)
  }

  const nextDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    setCurrentDate(newDate)
  }

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

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold">MediCare Pro</span>
                </div>
              </Link>
              <div className="text-gray-600">|</div>
              <h1 className="text-xl font-semibold">Agenda de Citas</h1>
            </div>
            <Link href="/dashboard/appointments/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Cita
              </Button>
            </Link>
          </div>
        </header>

        <div className="p-6">
          {/* Date Navigation */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={previousDay}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-center">
                  <h2 className="text-lg font-semibold">{formatDate(currentDate)}</h2>
                  <p className="text-sm text-gray-600">{todayAppointments.length} citas programadas</p>
                </div>
                <Button variant="outline" size="sm" onClick={nextDay}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Horarios del Día</CardTitle>
                <CardDescription>Vista detallada de la agenda</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {timeSlots.map((time) => {
                    const appointment = todayAppointments.find((apt) => apt.time === time)
                    return (
                      <div key={time} className="flex items-center space-x-4 p-2 border-b border-gray-100">
                        <div className="w-16 text-sm font-medium text-gray-600">{time}</div>
                        {appointment ? (
                          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{appointment.patient}</p>
                                <p className="text-sm text-gray-600">{appointment.type}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
                                <span className="text-sm text-gray-500">{appointment.duration} min</span>
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
              </CardContent>
            </Card>

            {/* Appointments Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen del Día</CardTitle>
                <CardDescription>Estadísticas de citas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{todayAppointments.length}</p>
                    <p className="text-sm text-gray-600">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {todayAppointments.filter((apt) => apt.status === "confirmada").length}
                    </p>
                    <p className="text-sm text-gray-600">Confirmadas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {todayAppointments.filter((apt) => apt.status === "pendiente").length}
                    </p>
                    <p className="text-sm text-gray-600">Pendientes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {todayAppointments.filter((apt) => apt.status === "completada").length}
                    </p>
                    <p className="text-sm text-gray-600">Completadas</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Próximas Citas</h4>
                  <div className="space-y-3">
                    {todayAppointments
                      .filter((apt) => apt.status !== "completada")
                      .slice(0, 3)
                      .map((appointment) => (
                        <div key={appointment.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{appointment.patient}</p>
                              <p className="text-xs text-gray-600">{appointment.type}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{appointment.time}</p>
                              <Badge className={getStatusColor(appointment.status)}>
                                {appointment.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 mt-2">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{appointment.phone}</span>
                          </div>
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
