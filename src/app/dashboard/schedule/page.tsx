"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Plus, MoreHorizontal, Eye, EyeOff, Trash2 } from "lucide-react";
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
import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { ProductShell } from "~/components/shell/product-shell";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

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
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

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
    try {
      const response = await deleteSchedule.mutateAsync({ id });
      unwrapTrpcResult(response);
      toast.success("Horario eliminado");
      void refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar el horario",
      );
    } finally {
      setScheduleToDelete(null);
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
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardContent
                  className="space-y-3 p-6"
                  aria-label="Cargando horarios"
                >
                  {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-12 w-full" />
                  ))}
                </CardContent>
              </Card>
            ) : isError || schedulesRes?.error ? (
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardContent className="p-10 text-center">
                  <p className="font-medium">No pudimos cargar tus horarios.</p>
                  <p className="mt-2 text-sm text-[#6b6b6b]">
                    {schedulesRes?.error
                      ? schedulesRes.message
                      : "Intenta actualizar la página."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden border-[#ebebeb] bg-white shadow-none">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Día</TableHead>
                          <TableHead>Horario</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="w-12" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedSchedules.flatMap((group) =>
                          group.schedules.length > 0
                            ? group.schedules.map((schedule) => (
                                <TableRow
                                  key={schedule.id}
                                  className={
                                    !schedule.isActive
                                      ? "opacity-60"
                                      : undefined
                                  }
                                >
                                  <TableCell className="font-medium">
                                    {group.day}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {schedule.startTime} – {schedule.endTime}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        schedule.isActive
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {schedule.isActive
                                        ? "Activo"
                                        : "Inactivo"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          aria-label={`Acciones para ${group.day}`}
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onSelect={() =>
                                            void handleToggleActive(
                                              schedule.id,
                                              schedule.isActive,
                                            )
                                          }
                                        >
                                          {schedule.isActive ? (
                                            <EyeOff className="mr-2 h-4 w-4" />
                                          ) : (
                                            <Eye className="mr-2 h-4 w-4" />
                                          )}
                                          {schedule.isActive
                                            ? "Desactivar"
                                            : "Activar"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-red-600 focus:text-red-600"
                                          onSelect={() =>
                                            setScheduleToDelete(schedule.id)
                                          }
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Eliminar
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))
                            : [],
                        )}
                        {schedules.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="h-24 text-center text-sm text-[#737373]"
                            >
                              Aún no tienes horarios configurados.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <AlertDialog
          open={!!scheduleToDelete}
          onOpenChange={(open) => !open && setScheduleToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este horario?</AlertDialogTitle>
              <AlertDialogDescription>
                Las citas existentes no se modifican, pero este horario dejará
                de ofrecerse.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  scheduleToDelete && void handleDelete(scheduleToDelete)
                }
                className="bg-red-600 hover:bg-red-700"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ProductShell>
    </DashboardWrapper>
  );
}
