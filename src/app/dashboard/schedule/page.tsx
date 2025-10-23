"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Label } from "~/components/ui/label"
import { Badge } from "~/components/ui/badge"
import { Clock, Plus, Trash2, Eye, EyeOff } from "lucide-react"
import { api } from "~/trpc/react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
]

const TIME_SLOTS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hours = Math.floor(i / 4).toString().padStart(2, '0')
  const minutes = ((i % 4) * 15).toString().padStart(2, '0')
  return `${hours}:${minutes}`
})

export default function ScheduleManagementPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    dayOfWeek: "",
    startTime: "",
    endTime: "",
  })

  const { data: profile } = api.auth.getProfile.useQuery()
  const doctorId = profile?.doctor?.id

  const { data: schedulesRes, refetch } = api.schedule.getByDoctor.useQuery(
    { doctorId: doctorId as string },
    { enabled: !!doctorId }
  )
  const schedules = schedulesRes?.result ?? []

  const createSchedule = api.schedule.create.useMutation()
  const updateIsActive = api.schedule.updateIsActive.useMutation()
  const deleteSchedule = api.schedule.delete.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!doctorId) return

    try {
      await createSchedule.mutateAsync({
        doctorId,
        dayOfWeek: parseInt(formData.dayOfWeek),
        startTime: formData.startTime,
        endTime: formData.endTime,
      })
      toast.success("Horario creado correctamente")
      setIsCreating(false)
      setFormData({ dayOfWeek: "", startTime: "", endTime: "" })
      refetch()
    } catch (error) {
      toast.error("Error al crear el horario. Verifica que no exista ya un horario para este día.")
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateIsActive.mutateAsync({ id, isActive: !isActive })
      toast.success(isActive ? "Horario desactivado" : "Horario activado")
      refetch()
    } catch (error) {
      toast.error("Error al cambiar el estado")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este horario?")) return

    try {
      await deleteSchedule.mutateAsync({ id })
      toast.success("Horario eliminado")
      refetch()
    } catch (error) {
      toast.error("Error al eliminar el horario")
    }
  }

  const handleCancel = () => {
    setIsCreating(false)
    setFormData({ dayOfWeek: "", startTime: "", endTime: "" })
  }

  const getDayLabel = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || ""
  }

  const groupedSchedules = DAYS_OF_WEEK.map(day => ({
    day: day.label,
    dayValue: day.value,
    schedules: schedules.filter((s: any) => s.dayOfWeek === day.value)
  }))

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configuración de Horarios</h1>
            <p className="text-gray-600 mt-1">Define tus horarios de atención para cada día de la semana</p>
          </div>
          {!isCreating && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Horario
            </Button>
          )}
        </div>

        {/* Create Form */}
        {isCreating && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Crear Nuevo Horario</CardTitle>
              <CardDescription>
                Define el horario de atención para un día de la semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="dayOfWeek">Día de la Semana</Label>
                    <Select value={formData.dayOfWeek} onValueChange={(value) => setFormData({ ...formData, dayOfWeek: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar día" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="startTime">Hora de Inicio</Label>
                    <Select value={formData.startTime} onValueChange={(value) => setFormData({ ...formData, startTime: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="00:00" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="endTime">Hora de Fin</Label>
                    <Select value={formData.endTime} onValueChange={(value) => setFormData({ ...formData, endTime: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="00:00" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button type="submit">Crear Horario</Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Schedules List Grouped by Day */}
        <div className="grid gap-4">
          {groupedSchedules.map((group) => (
            <Card key={group.dayValue}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{group.day}</span>
                  {group.schedules.length === 0 && (
                    <Badge variant="secondary">Sin horario configurado</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {group.schedules.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay horarios configurados para este día</p>
                ) : (
                  <div className="space-y-2">
                    {group.schedules.map((schedule: any) => (
                      <div
                        key={schedule.id}
                        className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg ${!schedule.isActive ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center space-x-3">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">
                            {schedule.startTime} - {schedule.endTime}
                          </span>
                          <Badge variant={schedule.isActive ? "default" : "secondary"}>
                            {schedule.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(schedule.id, schedule.isActive)}
                          >
                            {schedule.isActive ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-1" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                Activar
                              </>
                            )}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(schedule.id)}>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
