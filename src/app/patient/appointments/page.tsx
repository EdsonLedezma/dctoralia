"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Calendar, Clock, User, Search, Filter, Plus, MapPin, Phone, ArrowLeft, X } from "lucide-react"
import Link from "next/link"
import { api } from "src/trpc/react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog"

export default function PatientAppointmentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [rescheduleDialog, setRescheduleDialog] = useState<{ open: boolean; appointmentId: string | null }>({
    open: false,
    appointmentId: null,
  })
  const [rescheduleData, setRescheduleData] = useState({ date: "", time: "" })
  
  const { data: mine, refetch } = api.appointments.listMine.useQuery()
  const cancelMutation = api.appointments.cancel.useMutation()
  const rescheduleMutation = api.appointments.reschedule.useMutation()
  
  const appointments = (mine?.result ?? []).map((a: any) => ({
    id: a.id,
    doctor: a.doctor?.user?.name ?? "",
    specialty: a.doctor?.specialty ?? "",
    date: new Date(a.date).toISOString().split("T")[0],
    time: a.time,
    type: a.reason ?? "Consulta",
    status: a.status?.toLowerCase?.() ?? "pending",
    location: "",
    address: "",
    phone: a.doctor?.phone ?? "",
    diagnosis: a.notes ?? "",
  }))

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

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmada"
      case "pending":
        return "Pendiente"
      case "completed":
        return "Completada"
      case "cancelled":
        return "Cancelada"
      default:
        return status
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

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch =
      appointment.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.type.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || appointment.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const upcomingCount = appointments.filter((apt) => apt.status === "confirmed" || apt.status === "pending").length
  const completedCount = appointments.filter((apt) => apt.status === "completed").length

  const handleCancel = async (appointmentId: string) => {
    if (!confirm("¿Estás seguro de cancelar esta cita?")) return
    
    try {
      await cancelMutation.mutateAsync({ id: appointmentId, reason: "Cancelada por el paciente" })
      toast.success("Cita cancelada correctamente")
      refetch()
    } catch (error) {
      toast.error("Error al cancelar la cita")
    }
  }

  const handleReschedule = async () => {
    if (!rescheduleDialog.appointmentId || !rescheduleData.date || !rescheduleData.time) {
      toast.error("Completa todos los campos")
      return
    }

    try {
      await rescheduleMutation.mutateAsync({
        id: rescheduleDialog.appointmentId,
        newDate: new Date(`${rescheduleData.date}T${rescheduleData.time}:00`),
        newTime: rescheduleData.time,
      })
      toast.success("Cita reagendada correctamente")
      setRescheduleDialog({ open: false, appointmentId: null })
      setRescheduleData({ date: "", time: "" })
      refetch()
    } catch (error) {
      toast.error("Error al reagendar la cita")
    }
  }

  const openRescheduleDialog = (appointmentId: string, currentDate: string, currentTime: string) => {
    setRescheduleDialog({ open: true, appointmentId })
    setRescheduleData({ date: currentDate, time: currentTime })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/patient/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Dopilot</span>
            </div>
            <div className="text-gray-600">|</div>
            <h1 className="text-xl font-semibold">Mis Citas</h1>
          </div>
          <Link href="/patient/appointments/book">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cita
            </Button>
          </Link>
        </div>
      </header>

      <div className="p-6">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Citas</p>
                  <p className="text-2xl font-bold">{appointments.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Próximas</p>
                  <p className="text-2xl font-bold text-green-600">{upcomingCount}</p>
                </div>
                <Clock className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completadas</p>
                  <p className="text-2xl font-bold text-blue-600">{completedCount}</p>
                </div>
                <User className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Este Mes</p>
                  <p className="text-2xl font-bold text-purple-600">3</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por doctor, especialidad o tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las citas</SelectItem>
                  <SelectItem value="confirmed">Confirmadas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="completed">Completadas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Citas</CardTitle>
            <CardDescription>Gestiona todas tus citas médicas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{appointment.doctor}</h3>
                      <p className="text-blue-600">{appointment.specialty}</p>
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>{getStatusText(appointment.status)}</Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(appointment.date ?? "")}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>
                          {appointment.time} - {appointment.type}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{appointment.location}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{appointment.phone}</span>
                      </div>
                    </div>
                  </div>

                  {appointment.diagnosis && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <p className="text-sm">
                        <strong>Diagnóstico:</strong> {appointment.diagnosis}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/patient/appointments/${appointment.id}`}>
                      <Button size="sm" variant="outline">
                        Ver Detalles
                      </Button>
                    </Link>
                    {(appointment.status === "confirmed" || appointment.status === "pending") && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openRescheduleDialog(appointment.id, appointment.date || "", appointment.time)}
                        >
                          Reagendar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCancel(appointment.id)}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                    {appointment.status === "completed" && (
                      <Button size="sm" variant="outline">
                        Descargar Reporte
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${appointment.phone}`}>
                        <Phone className="w-4 h-4 mr-1" />
                        Contactar
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog.open} onOpenChange={(open: boolean) => setRescheduleDialog({ ...rescheduleDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar Cita</DialogTitle>
            <DialogDescription>
              Selecciona la nueva fecha y hora para tu cita
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">Nueva Fecha</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleData.date}
                onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">Nueva Hora</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={rescheduleData.time}
                onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRescheduleDialog({ open: false, appointmentId: null })}
            >
              Cancelar
            </Button>
            <Button onClick={handleReschedule}>
              Confirmar Reagendado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
