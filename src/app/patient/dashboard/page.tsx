"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Calendar, Clock, User, Heart, FileText, Bell, Settings, LogOut, Plus, MapPin, Phone } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function PatientDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "PATIENT") {
      router.push("/login")
    }
  }, [session, status, router])

  const upcomingAppointments = [
    {
      id: 1,
      doctor: "Dr. Juan Carlos Pérez",
      specialty: "Cardiología",
      date: "2024-01-29",
      time: "10:00",
      type: "Consulta General",
      status: "confirmed",
      location: "Clínica CardioVida",
      address: "Av. Principal 123",
    },
    {
      id: 2,
      doctor: "Dra. María González",
      specialty: "Dermatología",
      date: "2024-02-05",
      time: "14:30",
      type: "Control",
      status: "pending",
      location: "Centro Médico Integral",
      address: "Calle Salud 456",
    },
  ]

  const recentAppointments = [
    {
      id: 3,
      doctor: "Dr. Carlos Rodríguez",
      specialty: "Medicina General",
      date: "2024-01-15",
      time: "09:00",
      type: "Consulta General",
      status: "completed",
      diagnosis: "Control rutinario - Todo normal",
    },
    {
      id: 4,
      doctor: "Dra. Ana López",
      specialty: "Ginecología",
      date: "2024-01-10",
      time: "11:00",
      type: "Control Anual",
      status: "completed",
      diagnosis: "Examen preventivo - Sin novedades",
    },
  ]

  const healthMetrics = [
    { label: "Última Consulta", value: "15 Ene 2024", icon: Calendar },
    { label: "Próxima Cita", value: "29 Ene 2024", icon: Clock },
    { label: "Doctores Visitados", value: "4", icon: User },
    { label: "Estado General", value: "Saludable", icon: Heart },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
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

  if (status === "loading") {
    return <div>Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">MediCare Pro</span>
              </div>
            </Link>
            <div className="text-gray-600">|</div>
            <h1 className="text-xl font-semibold">Mi Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Bienvenido, {session?.user?.name}</span>
            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Health Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {healthMetrics.map((metric, index) => {
            const IconComponent = metric.icon
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{metric.label}</CardTitle>
                  <IconComponent className="w-5 h-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>Gestiona tu salud fácilmente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/patient/appointments/book">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Agendar Nueva Cita
                </Button>
              </Link>
              <Link href="/patient/appointments">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Ver Mis Citas
                </Button>
              </Link>
              <Link href="/patient/medical-history">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Historial Médico
                </Button>
              </Link>
              <Link href="/patient/doctors">
                <Button className="w-full justify-start" variant="outline">
                  <User className="w-4 h-4 mr-2" />
                  Buscar Doctores
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Próximas Citas</CardTitle>
              <CardDescription>Tus citas médicas programadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{appointment.doctor}</h3>
                        <p className="text-blue-600">{appointment.specialty}</p>
                      </div>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status === "confirmed" ? "Confirmada" : "Pendiente"}
                      </Badge>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(appointment.date)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>
                            {appointment.time} - {appointment.type}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{appointment.location}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">{appointment.address}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <Button size="sm" variant="outline">
                        Ver Detalles
                      </Button>
                      <Button size="sm" variant="outline">
                        Reagendar
                      </Button>
                      <Button size="sm" variant="outline">
                        <Phone className="w-4 h-4 mr-1" />
                        Contactar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Link href="/patient/appointments">
                  <Button variant="outline" className="w-full">
                    Ver Todas las Citas
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Appointments */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Historial Reciente</CardTitle>
            <CardDescription>Tus últimas consultas médicas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{appointment.doctor}</h4>
                      <p className="text-sm text-gray-600">{appointment.specialty}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(appointment.date)} - {appointment.time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(appointment.status)}>Completada</Badge>
                    <p className="text-sm text-gray-600 mt-1">{appointment.diagnosis}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
