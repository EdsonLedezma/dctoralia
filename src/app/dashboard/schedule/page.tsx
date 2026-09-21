"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Clock, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { unwrapTrpcResult } from "~/types/trpc-response";
import { MotionList } from "~/components/shared/motion-list";
import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { ProductShell } from "~/components/shell/product-shell";

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

const TIME_SLOTS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hours = Math.floor(i / 4)
    .toString()
    .padStart(2, "0");
  const minutes = ((i % 4) * 15).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
});

export default function ScheduleManagementPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    dayOfWeek: "",
    startTime: "",
    endTime: "",
  });

  const {
    data: schedulesRes,
    refetch,
    isLoading,
    isError,
  } = api.schedule.getMine.useQuery();
  const schedules = schedulesRes?.result ?? [];

  const createSchedule = api.schedule.create.useMutation();
  const updateIsActive = api.schedule.updateIsActive.useMutation();
  const deleteSchedule = api.schedule.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await createSchedule.mutateAsync({
        dayOfWeek: parseInt(formData.dayOfWeek),
        startTime: formData.startTime,
        endTime: formData.endTime,
      });
      unwrapTrpcResult(response);
      toast.success("Horario creado correctamente");
      setIsCreating(false);
      setFormData({ dayOfWeek: "", startTime: "", endTime: "" });
      void refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al crear el horario. Verifica que no exista ya un horario para este día.",
      );
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await updateIsActive.mutateAsync({
        id,
        isActive: !isActive,
      });
      unwrapTrpcResult(response);
      toast.success(isActive ? "Horario desactivado" : "Horario activado");
      void refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al cambiar el estado",
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este horario?")) return;

    try {
      const response = await deleteSchedule.mutateAsync({ id });
      unwrapTrpcResult(response);
      toast.success("Horario eliminado");
      void refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar el horario",
      );
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setFormData({ dayOfWeek: "", startTime: "", endTime: "" });
  };

  const groupedSchedules = DAYS_OF_WEEK.map((day) => ({
    day: day.label,
    dayValue: day.value,
    schedules: schedules.filter((schedule) => schedule.dayOfWeek === day.value),
  }));

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <div className="min-h-screen bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-[#6b6b6b]">Operación</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#171717]">
                  Horarios
                </h1>
              </div>
              {!isCreating && (
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo horario
                </Button>
              )}
            </div>

            {/* Create Form */}
            {isCreating && (
              <Card className="mb-6 border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb]">
                  <CardTitle>Crear Nuevo Horario</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <Label htmlFor="dayOfWeek">Día de la Semana</Label>
                        <Select
                          value={formData.dayOfWeek}
                          onValueChange={(value) =>
                            setFormData({ ...formData, dayOfWeek: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar día" />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((day) => (
                              <SelectItem
                                key={day.value}
                                value={day.value.toString()}
                              >
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="startTime">Hora de Inicio</Label>
                        <Select
                          value={formData.startTime}
                          onValueChange={(value) =>
                            setFormData({ ...formData, startTime: value })
                          }
                        >
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
                        <Select
                          value={formData.endTime}
                          onValueChange={(value) =>
                            setFormData({ ...formData, endTime: value })
                          }
                        >
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
                    <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                      <Button type="submit" className="w-full sm:w-auto">
                        Crear Horario
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={handleCancel}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Schedules List Grouped by Day */}
            {isLoading ? (
              <div className="grid gap-4" aria-label="Cargando horarios">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-lg border border-[#ebebeb] bg-white"
                  />
                ))}
              </div>
            ) : isError || schedulesRes?.ok === false ? (
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardContent className="p-10 text-center">
                  <p className="font-medium">No pudimos cargar tus horarios.</p>
                  <p className="mt-2 text-sm text-[#6b6b6b]">
                    {schedulesRes?.ok === false
                      ? schedulesRes.message
                      : "Intenta actualizar la página."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <MotionList className="grid gap-4">
                {groupedSchedules.map((group) => (
                  <Card
                    key={group.dayValue}
                    className="border-[#ebebeb] bg-white shadow-none"
                  >
                    <CardHeader className="border-b border-[#ebebeb]">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span>{group.day}</span>
                        {group.schedules.length === 0 && (
                          <Badge variant="secondary">
                            Sin horario configurado
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {group.schedules.length === 0 ? (
                        <p className="text-sm text-[#6b6b6b]">
                          No hay horarios configurados para este día
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {group.schedules.map((schedule) => (
                            <div
                              key={schedule.id}
                              className={`flex items-center justify-between rounded-md border border-[#ebebeb] bg-[#fafafa] p-3 ${!schedule.isActive ? "opacity-60" : ""}`}
                            >
                              <div className="flex items-center space-x-3">
                                <Clock className="h-4 w-4 text-[#6b6b6b]" />
                                <span className="font-medium">
                                  {schedule.startTime} - {schedule.endTime}
                                </span>
                                <Badge
                                  variant={
                                    schedule.isActive ? "default" : "secondary"
                                  }
                                >
                                  {schedule.isActive ? "Activo" : "Inactivo"}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleToggleActive(
                                      schedule.id,
                                      schedule.isActive,
                                    )
                                  }
                                >
                                  {schedule.isActive ? (
                                    <>
                                      <EyeOff className="mr-1 h-4 w-4" />
                                      Desactivar
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="mr-1 h-4 w-4" />
                                      Activar
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(schedule.id)}
                                >
                                  <Trash2 className="mr-1 h-4 w-4" />
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
              </MotionList>
            )}
          </div>
        </div>
      </ProductShell>
    </DashboardWrapper>
  );
}
