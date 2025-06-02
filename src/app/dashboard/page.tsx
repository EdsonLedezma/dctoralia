"use client"

import { useEffect, useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Calendar, Users, Clock, Plus, Bell, Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const [doctorName, setDoctorName] = useState("")
  const router = useRouter()

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("doctor_logged_in")
    const name = localStorage.getItem("doctor_name")

    if (!isLoggedIn) {
      router.push("/login")
      return
    }

    setDoctorName(name || "Doctor")
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("doctor_logged_in")
    localStorage.removeItem("doctor_name")
    router.push("/")
  }

  const todayAppointments = [
    { id: 1, patient: "María González", time: "09:00", type: "Consulta General" },
    { id: 2, patient: "Carlos Rodríguez", time: "10:30", type: "Control" },
    { id: 3, patient: "Ana López", time: "14:00", type: "Primera Consulta" },
    { id: 4, patient: "Pedro Martínez", time: "15:30", type: "Seguimiento" },
  ]

  const stats = [
    { title: "Pacientes Totales", value: "156", icon: Users, color: "text-blue-600" },
    { title: "Citas Hoy", value: "8", icon: Calendar, color: "text-green-600" },
    { title: "Citas Pendientes", value: "12", icon: Clock, color: "text-orange-600" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">MediCare Pro</span>
            </div>
            <div className="text-gray-600">|</div>
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Bienvenido, {doctorName}</span>
            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>Gestiona tu consulta fácilmente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard/patients/new">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Paciente
                </Button>
              </Link>
              <Link href="/dashboard/appointments/new">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Agendar Cita
                </Button>
              </Link>
              <Link href="/dashboard/patients">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Ver Pacientes
                </Button>
              </Link>
              <Link href="/dashboard/appointments">
                <Button className="w-full justify-start" variant="outline">
                  <Clock className="w-4 h-4 mr-2" />
                  Ver Agenda
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Today's Appointments */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Citas de Hoy</CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString("es-ES", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <div>
                        <p className="font-medium">{appointment.patient}</p>
                        <p className="text-sm text-gray-600">{appointment.type}</p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">{appointment.time}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Link href="/dashboard/appointments">
                  <Button variant="outline" className="w-full">
                    Ver Todas las Citas
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
