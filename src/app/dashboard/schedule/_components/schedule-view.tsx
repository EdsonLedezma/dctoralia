"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
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

export function ScheduleView() {
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

    if (formData.startTime >= formData.endTime) {
      toast.error("La hora de fin debe ser posterior al inicio.");
      return;
    }
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

  const groupedSchedules = [...DAYS_OF_WEEK]
    .sort((a, b) => ((a.value + 6) % 7) - ((b.value + 6) % 7))
    .map((day) => ({
      day: day.label,
      dayValue: day.value,
      schedules: schedules.filter(
        (schedule) => schedule.dayOfWeek === day.value,
      ),
    }));

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <div className="bg-background px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Operación</p>
                <h1 className="text-foreground mt-1 text-xl font-semibold tracking-tight">
                  Horarios
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Tu semana de atención, de un vistazo.
                </p>
              </div>
              {!isCreating && (
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo horario
                </Button>
              )}
            </div>

            <Dialog
              open={isCreating}
              onOpenChange={(open) => {
                if (!createSchedule.isPending) {
                  if (open) setIsCreating(true);
                  else handleCancel();
                }
              }}
            >
              <DialogContent className="schedule-editor sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Definir horario</DialogTitle>
                  <DialogDescription>
                    Elige el día y las horas en las que recibes citas.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="schedule-preset">
                      Empezar con una plantilla
                    </Label>
                    <Select
                      onValueChange={(value) => {
                        const presets = {
                          full: ["09:00", "18:00"],
                          morning: ["08:00", "14:00"],
                          afternoon: ["14:00", "20:00"],
                        };
                        if (
                          value === "full" ||
                          value === "morning" ||
                          value === "afternoon"
                        ) {
                          const [startTime = "", endTime = ""] = presets[value];
                          setFormData((previous) => ({
                            ...previous,
                            startTime,
                            endTime,
                          }));
                        }
                      }}
                    >
                      <SelectTrigger id="schedule-preset" className="w-full">
                        <SelectValue placeholder="Personalizado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">
                          Jornada · 09:00–18:00
                        </SelectItem>
                        <SelectItem value="morning">
                          Mañana · 08:00–14:00
                        </SelectItem>
                        <SelectItem value="afternoon">
                          Tarde · 14:00–20:00
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">
                      Día de atención
                    </legend>
                    <div className="grid grid-cols-7 gap-1">
                      {[...DAYS_OF_WEEK]
                        .sort(
                          (a, b) => ((a.value + 6) % 7) - ((b.value + 6) % 7),
                        )
                        .map((day) => (
                          <button
                            type="button"
                            key={day.value}
                            title={day.label}
                            aria-label={day.label}
                            aria-pressed={
                              formData.dayOfWeek === String(day.value)
                            }
                            disabled={createSchedule.isPending}
                            onClick={() =>
                              setFormData((previous) => ({
                                ...previous,
                                dayOfWeek: String(day.value),
                              }))
                            }
                            className={`focus-visible:ring-ring min-h-11 rounded-xl text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${formData.dayOfWeek === String(day.value) ? "bg-accent text-foreground ring-border ring-1" : "text-muted-foreground hover:bg-muted"}`}
                          >
                            {day.label.slice(0, 3)}
                          </button>
                        ))}
                    </div>
                  </fieldset>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Desde</Label>
                      <Input
                        id="startTime"
                        type="time"
                        step={900}
                        required
                        value={formData.startTime}
                        disabled={createSchedule.isPending}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            startTime: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Hasta</Label>
                      <Input
                        id="endTime"
                        type="time"
                        step={900}
                        min={formData.startTime || undefined}
                        required
                        value={formData.endTime}
                        disabled={createSchedule.isPending}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            endTime: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 border-t pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={createSchedule.isPending}
                      onClick={handleCancel}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        !formData.dayOfWeek ||
                        !formData.startTime ||
                        !formData.endTime ||
                        createSchedule.isPending
                      }
                    >
                      {createSchedule.isPending
                        ? "Guardando…"
                        : "Guardar horario"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            {/* Schedules List Grouped by Day */}
            {isLoading ? (
              <Card className="border-border bg-card shadow-none">
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
              <Card className="border-border bg-card shadow-none">
                <CardContent className="p-10 text-center">
                  <p className="font-medium">No pudimos cargar tus horarios.</p>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {schedulesRes?.error
                      ? schedulesRes.message
                      : "Intenta actualizar la página."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card overflow-hidden shadow-none">
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
                                          className="text-destructive focus:text-destructive"
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
                            : [
                                <TableRow key={group.dayValue}>
                                  <TableCell className="font-medium">
                                    {group.day}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    Sin horario
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-muted-foreground text-xs">
                                      No disponible
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label={`Definir horario de ${group.day}`}
                                      onClick={() => {
                                        setFormData({
                                          dayOfWeek: String(group.dayValue),
                                          startTime: "",
                                          endTime: "",
                                        });
                                        setIsCreating(true);
                                      }}
                                    >
                                      <Plus className="size-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>,
                              ],
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
                className="bg-secondary hover:bg-secondary"
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
