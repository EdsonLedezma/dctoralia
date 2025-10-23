"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Calendar, Clock, User, Heart, FileText, Bell, Settings, LogOut, Plus, MapPin, Phone } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "~/trpc/react"

export default function PatientDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "PATIENT") {
      router.push("/login")
    }
  }, [session, status, router])

  // Obtener datos reales del backend
  const { data: upcomingRes } = api.appointments.upcoming.useQuery({ limit: 5 })
  const { data: allAppointmentsRes } = api.appointments.listMine.useQuery()
  
  const upcomingAppointments = (upcomingRes?.result ?? []).map((a: any) => ({
    id: a.id,
    doctor: a.doctor?.user?.name ?? "Doctor",
    specialty: a.doctor?.specialty ?? "",
    date: a.date.toISOString().split('T')[0] as string,
    time: a.time,
    type: a.service?.name ?? a.reason ?? "Consulta",
    status: a.status.toLowerCase(),
    location: "",
    address: "",
    phone: a.doctor?.phone ?? "",
  }))

  const allAppointments = allAppointmentsRes?.result ?? []
  const recentAppointments = allAppointments
    .filter((a: any) => a.status === 'COMPLETED')
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
    .map((a: any) => ({
      id: a.id,
      doctor: a.doctor?.user?.name ?? "Doctor",
      specialty: a.doctor?.specialty ?? "",
      date: a.date.toISOString().split('T')[0] as string,
      time: a.time,
      type: a.service?.name ?? a.reason ?? "Consulta",
      status: "completed",
      diagnosis: a.notes || "Consulta completada",
    }))

  // Calcular métricas reales
  const lastAppointment = allAppointments
    .filter((a: any) => a.status === 'COMPLETED')
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  
  const nextAppointment = upcomingAppointments[0]
  
  const uniqueDoctors = new Set(allAppointments.map((a: any) => a.doctorId))

  const healthMetrics = [
    { 
      label: "Última Consulta", 
      value: lastAppointment 
        ? new Date(lastAppointment.date).toLocaleDateString("es-ES", { day: 'numeric', month: 'short', year: 'numeric' })
        : "N/A", 
      icon: Calendar 
    },
    { 
      label: "Próxima Cita", 
      value: nextAppointment 
        ? new Date(nextAppointment.date).toLocaleDateString("es-ES", { day: 'numeric', month: 'short', year: 'numeric' })
        : "N/A", 
      icon: Clock 
    },
    { 
      label: "Doctores Visitados", 
      value: uniqueDoctors.size.toString(), 
      icon: User 
    },
    { 
      label: "Estado General", 
      value: "Saludable", 
      icon: Heart 
    },
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
                <span className="text-xl font-bold">Dopilot</span>
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
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No tienes citas programadas</p>
                    <Link href="/patient/appointments/book">
                      <Button className="mt-4">Agendar Primera Cita</Button>
                    </Link>
                  </div>
                ) : (
                  upcomingAppointments.map((appointment) => (
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
                          {appointment.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{appointment.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex space-x-2">
                        <Link href={`/patient/appointments/${appointment.id}`}>
                          <Button size="sm" variant="outline">
                            Ver Detalles
                          </Button>
                        </Link>
                        <Link href="/patient/appointments">
                          <Button size="sm" variant="outline">
                            Reagendar
                          </Button>
                        </Link>
                        {appointment.phone && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={`tel:${appointment.phone}`}>
                              <Phone className="w-4 h-4 mr-1" />
                              Contactar
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
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
              {recentAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No tienes historial de consultas</p>
                </div>
              ) : (
                recentAppointments.map((appointment: any) => (
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
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
