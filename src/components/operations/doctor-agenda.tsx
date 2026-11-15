"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { MetricStrip } from "~/components/shared/metric-strip";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { CalendarClock, Check, MoreHorizontal, Plus, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { sortAppointmentHistory } from "./appointment-history";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "~/components/ui/table";
import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { api } from "~/trpc/react";
import { OperationsShell } from "./operations-shell";
import { Skeleton } from "~/components/ui/skeleton";
import { DatePicker } from "~/components/ui/date-picker";
import { TimeSlotPicker } from "~/components/ui/time-slot-picker";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";
import { unwrapTrpcResult } from "~/types/trpc-response";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import {
  getAppointmentStatusColor,
  normalizeAppointmentStatus,
} from "./appointments.utils";
import type { DailyAppointment } from "./appointments.types";

function mexicoDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

function dateFromKey(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

function AppointmentActions({
  appointment,
  isUpdating,
  isRecordingAttendance,
  isRescheduling,
  isCancelling,
  onStatusChange,
  onAttendance,
  onReschedule,
  onCancel,
}: {
  appointment: DailyAppointment;
  isUpdating: boolean;
  isRecordingAttendance: boolean;
  isRescheduling: boolean;
  isCancelling: boolean;
  onStatusChange: (
    appointment: DailyAppointment,
    status: "CONFIRMED" | "COMPLETED",
  ) => void;
  onAttendance: (
    appointment: DailyAppointment,
    action: "CHECK_IN" | "START_CONSULTATION",
  ) => void;
  onReschedule: (appointment: DailyAppointment) => void;
  onCancel: (appointment: DailyAppointment) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Acciones para ${appointment.patient.name || "la cita"}`}
          className="text-muted-foreground hover:text-foreground size-11 shrink-0 lg:size-11"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {(appointment.rawStatus === "PENDING" ||
          appointment.rawStatus === "CONFIRMED") &&
          !appointment.checkedInAt && (
            <DropdownMenuItem
              disabled={isRecordingAttendance}
              onSelect={() => onAttendance(appointment, "CHECK_IN")}
            >
              <Check className="size-4" /> Registrar llegada
            </DropdownMenuItem>
          )}
        {(appointment.rawStatus === "PENDING" ||
          appointment.rawStatus === "CONFIRMED") &&
          appointment.checkedInAt &&
          !appointment.consultationStartedAt && (
            <DropdownMenuItem
              disabled={isRecordingAttendance}
              onSelect={() => onAttendance(appointment, "START_CONSULTATION")}
            >
              <CalendarClock className="size-4" /> Iniciar consulta
            </DropdownMenuItem>
          )}
        {appointment.rawStatus === "PENDING" && (
          <DropdownMenuItem
            disabled={isUpdating}
            onSelect={() => onStatusChange(appointment, "CONFIRMED")}
          >
            <Check className="size-4" /> Confirmar cita
          </DropdownMenuItem>
        )}
        {appointment.rawStatus === "CONFIRMED" && (
          <DropdownMenuItem
            disabled={isUpdating}
            onSelect={() => onStatusChange(appointment, "COMPLETED")}
          >
            <Check className="size-4" /> Marcar como completada
          </DropdownMenuItem>
        )}
        {(appointment.rawStatus === "PENDING" ||
          appointment.rawStatus === "CONFIRMED") && (
          <>
            <DropdownMenuItem
              disabled={isRescheduling || isCancelling}
              onSelect={() => onReschedule(appointment)}
            >
              <CalendarClock className="size-4" /> Reprogramar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isCancelling || isRescheduling}
              variant="destructive"
              onSelect={() => onCancel(appointment)}
            >
              <X className="size-4" /> Cancelar cita
            </DropdownMenuItem>
          </>
        )}
        {appointment.rawStatus !== "PENDING" &&
          appointment.rawStatus !== "CONFIRMED" && (
            <DropdownMenuItem disabled>
              Sin acciones disponibles
            </DropdownMenuItem>
          )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DoctorAgenda() {
  const [selectedDate, setSelectedDate] = useState("");
  const params = useSearchParams();
  const router = useRouter();
  const focusedId = params.get("appointmentId");
  const [rescheduleTarget, setRescheduleTarget] =
    useState<DailyAppointment | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "" });
  const [cancelTarget, setCancelTarget] = useState<DailyAppointment | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");

  const { data, isLoading, isError, refetch } =
    api.appointments.listMine.useQuery();
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const utils = api.useUtils();
  const updateStatus = api.appointments.updateStatus.useMutation();
  const recordAttendance = api.appointments.recordAttendance.useMutation();
  const rescheduleAppointment = api.appointments.reschedule.useMutation();
  const cancelAppointment = api.appointments.cancel.useMutation();
  const appointmentResults = data?.result;

  const allAppointments = useMemo(() => {
    const allAppointments = appointmentResults ?? [];
    return allAppointments
      .map((a) => {
        return {
          id: a.id,
          time: a.time,
          // Appointment dates are persisted as UTC midnight date-only values.
          date: new Date(a.date).toISOString().slice(0, 10),
          duration: a.duration,
          status: normalizeAppointmentStatus(a.status),
          rawStatus: a.status,
          checkedInAt:
            a.lifecycleEvents.find((event) => event.eventType === "CHECKED_IN")
              ?.occurredAt ?? null,
          consultationStartedAt:
            a.lifecycleEvents.find(
              (event) => event.eventType === "CONSULTATION_STARTED",
            )?.occurredAt ?? null,
          reason: a.reason,
          patient: {
            id: a.patient?.id ?? "",
            name: a.patient?.user?.name ?? "",
            phone: a.patient?.phone ?? "",
          },
          service: {
            id: a.service?.id ?? "",
            name: a.service?.name ?? "Consulta",
          },
          location: a.location
            ? { id: a.location.id, name: a.location.name }
            : null,
        } satisfies DailyAppointment;
      })
      .sort(
        (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      );
  }, [appointmentResults]);

  const visibleAppointments = sortAppointmentHistory(
    allAppointments.filter(
      (appointment) =>
        (!selectedDate || appointment.date === selectedDate) &&
        (!focusedId || appointment.id === focusedId),
    ),
    new Date(),
  );
  const availableSlotsQuery = api.appointments.availableSlots.useQuery(
    {
      appointmentId: rescheduleTarget?.id ?? "",
      date: rescheduleForm.date ? dateFromKey(rescheduleForm.date) : new Date(),
    },
    { enabled: Boolean(rescheduleTarget && rescheduleForm.date) },
  );
  const availableSlots = availableSlotsQuery.data?.result ?? [];

  const refreshAppointments = async () => {
    await utils.appointments.listMine.invalidate();
  };

  const handleStatusChange = async (
    appointment: DailyAppointment,
    status: "CONFIRMED" | "COMPLETED",
  ) => {
    try {
      unwrapTrpcResult(
        await updateStatus.mutateAsync({ id: appointment.id, status }),
      );
      toast.success(
        status === "CONFIRMED"
          ? "Cita confirmada"
          : "Cita marcada como completada",
      );
      await refreshAppointments();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la cita",
      );
    }
  };

  const handleAttendance = async (
    appointment: DailyAppointment,
    action: "CHECK_IN" | "START_CONSULTATION",
  ) => {
    try {
      unwrapTrpcResult(
        await recordAttendance.mutateAsync({ id: appointment.id, action }),
      );
      toast.success(
        action === "CHECK_IN" ? "Llegada registrada" : "Consulta iniciada",
      );
      await utils.clinical.operationalAnalytics.invalidate();
      await refreshAppointments();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la atención",
      );
    }
  };

  const handleReschedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      rescheduleAppointment.isPending ||
      !rescheduleTarget ||
      !rescheduleForm.date ||
      !availableSlots.includes(rescheduleForm.time) ||
      availableSlotsQuery.isFetching ||
      availableSlotsQuery.isError ||
      availableSlotsQuery.data?.error
    )
      return;
    setRescheduleError(null);
    try {
      unwrapTrpcResult(
        await rescheduleAppointment.mutateAsync({
          id: rescheduleTarget.id,
          newDate: dateFromKey(rescheduleForm.date),
          newTime: rescheduleForm.time,
        }),
      );
      toast.success("Cita reprogramada");
      setRescheduleTarget(null);
      setSelectedDate(rescheduleForm.date);
      setRescheduleForm({ date: "", time: "" });
      await refreshAppointments();
    } catch (error) {
      setRescheduleError(
        error instanceof Error
          ? error.message
          : "No se pudo reprogramar la cita",
      );
      setRescheduleForm((current) => ({ ...current, time: "" }));
      await availableSlotsQuery.refetch();
    }
  };

  const handleCancel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cancelTarget) return;
    try {
      unwrapTrpcResult(
        await cancelAppointment.mutateAsync({
          id: cancelTarget.id,
          reason: cancelReason.trim() || undefined,
        }),
      );
      toast.success("Cita cancelada");
      setCancelTarget(null);
      setCancelReason("");
      await refreshAppointments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo cancelar la cita",
      );
    }
  };

  const startReschedule = (appointment: DailyAppointment) => {
    setRescheduleError(null);
    setRescheduleForm({ date: appointment.date, time: "" });
    setRescheduleTarget(appointment);
  };

  const startCancel = (appointment: DailyAppointment) => {
    setCancelReason("");
    setCancelTarget(appointment);
  };

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <OperationsShell>
        <main className="bg-background min-h-[100dvh] px-4 py-7 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-6xl">
            <header className="border-border mb-7 flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
                  Operación
                </p>
                <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                  Agenda
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Consulta y administra las citas de tu práctica.
                </p>
              </div>
              <Button asChild className="h-10 px-4">
                <Link href="/dashboard/appointments/new">
                  <Plus className="mr-2 size-4" />
                  Nueva cita
                </Link>
              </Button>
            </header>

            <MetricStrip
              label="Histórico de citas"
              items={[
                {
                  label: "Citas registradas",
                  value:
                    isError || data?.error ? "—" : visibleAppointments.length,
                },
                {
                  label: "Por confirmar",
                  value:
                    isError || data?.error
                      ? "—"
                      : visibleAppointments.filter(
                          (item) => item.rawStatus === "PENDING",
                        ).length,
                },
                {
                  label: "Confirmadas",
                  value:
                    isError || data?.error
                      ? "—"
                      : visibleAppointments.filter(
                          (item) => item.rawStatus === "CONFIRMED",
                        ).length,
                },
              ]}
            />
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <DatePicker
                label="Filtrar por fecha"
                value={selectedDate}
                onValueChange={setSelectedDate}
              />
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate("")}
                >
                  Todas las fechas
                </Button>
              )}
              {focusedId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.replace("/dashboard/appointments")}
                >
                  Ver todas las citas
                </Button>
              )}
            </div>
            {isError || data?.error ? (
              <div role="alert" className="space-y-3 py-6">
                <p>No pudimos cargar el historial.</p>
                <Button variant="outline" onClick={() => void refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <section
                aria-label="Historial de citas"
                className="border-border overflow-hidden rounded-2xl border"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha y hora</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <time className="text-xs tabular-nums">
                            {appointment.date} · {appointment.time}
                          </time>
                        </TableCell>
                        <TableCell>
                          <Link
                            className="font-medium underline-offset-4 hover:underline"
                            href={`/dashboard/patients/${appointment.patient.id}`}
                          >
                            {appointment.patient.name || "Paciente"}
                          </Link>
                          {appointment.checkedInAt && (
                            <span className="text-muted-foreground block text-xs">
                              {appointment.consultationStartedAt
                                ? "Consulta iniciada"
                                : "Llegada registrada"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{appointment.service.name}</TableCell>
                        <TableCell>
                          {appointment.location?.name ?? "Sin ubicación"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getAppointmentStatusColor(
                              appointment.status,
                            )}
                          >
                            {appointment.rawStatus === "NO_SHOW"
                              ? "No asistió"
                              : appointment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{appointment.duration} min</TableCell>
                        <TableCell>
                          <AppointmentActions
                            appointment={appointment}
                            isUpdating={updateStatus.isPending}
                            isRecordingAttendance={recordAttendance.isPending}
                            isRescheduling={rescheduleAppointment.isPending}
                            isCancelling={cancelAppointment.isPending}
                            onStatusChange={(item, status) =>
                              void handleStatusChange(item, status)
                            }
                            onAttendance={(item, action) =>
                              void handleAttendance(item, action)
                            }
                            onReschedule={startReschedule}
                            onCancel={startCancel}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {!visibleAppointments.length && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-muted-foreground py-10 text-center"
                        >
                          No hay citas para esta selección.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </section>
            )}
          </div>
          <Dialog
            open={!!rescheduleTarget}
            onOpenChange={(open) => {
              if (!open && !rescheduleAppointment.isPending)
                setRescheduleTarget(null);
            }}
          >
            <DialogContent className="max-w-md p-4 sm:p-6">
              <DialogHeader>
                <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
                  Agenda
                </p>
                <DialogTitle>Reprogramar cita</DialogTitle>
                <DialogDescription>
                  {rescheduleTarget
                    ? `${rescheduleTarget.patient.name || "Paciente"} · ${rescheduleTarget.time}`
                    : "Elige una nueva fecha y hora."}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(event) => void handleReschedule(event)}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <div className="space-y-2">
                    <DatePicker
                      label="Nueva fecha"
                      min={mexicoDateKey(new Date())}
                      value={rescheduleForm.date}
                      disabled={rescheduleAppointment.isPending}
                      onValueChange={(date) => {
                        setRescheduleError(null);
                        setRescheduleForm({ date, time: "" });
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Nueva hora</Label>
                    {rescheduleForm.date && !availableSlotsQuery.isLoading && (
                      <span className="text-muted-foreground text-xs">
                        {availableSlots.length} disponibles
                      </span>
                    )}
                  </div>
                  {!rescheduleForm.date ? (
                    <p className="border-border text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-sm">
                      Selecciona una fecha para consultar los horarios libres.
                    </p>
                  ) : availableSlotsQuery.isLoading ? (
                    <div
                      className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                      aria-label="Cargando horarios"
                    >
                      {Array.from({ length: 8 }).map((_, index) => (
                        <Skeleton key={index} className="h-11 rounded-lg" />
                      ))}
                    </div>
                  ) : availableSlotsQuery.isError ||
                    availableSlotsQuery.data?.error ? (
                    <div className="border-border bg-muted text-foreground rounded-lg border p-3 text-sm">
                      <p>
                        {availableSlotsQuery.data?.message ??
                          "No pudimos consultar los horarios."}
                      </p>
                      <Button
                        type="button"
                        variant="link"
                        className="text-foreground h-auto px-0 py-1"
                        onClick={() => void availableSlotsQuery.refetch()}
                      >
                        Intentar de nuevo
                      </Button>
                    </div>
                  ) : availableSlots.length ? (
                    <TimeSlotPicker
                      slots={availableSlots}
                      selectedTime={rescheduleForm.time || null}
                      onSelectTime={(time) => {
                        setRescheduleError(null);
                        setRescheduleForm((current) => ({ ...current, time }));
                      }}
                    />
                  ) : (
                    <p className="border-border text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-sm">
                      No hay horarios libres en la jornada de ese día.
                    </p>
                  )}
                </div>
                <p className="bg-background text-muted-foreground rounded-lg px-3 py-2 text-xs leading-5">
                  El horario se vuelve a validar al guardar para evitar cruces
                  con citas que se agenden mientras este diálogo está abierto.
                </p>
                {rescheduleError && (
                  <p
                    role="alert"
                    className="border-border bg-muted rounded-xl border p-3 text-sm"
                  >
                    {rescheduleError}
                  </p>
                )}
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRescheduleTarget(null)}
                    className="min-h-11"
                    disabled={rescheduleAppointment.isPending}
                  >
                    Volver
                  </Button>
                  <Button
                    type="submit"
                    className="min-h-11"
                    disabled={
                      rescheduleAppointment.isPending ||
                      !rescheduleForm.date ||
                      !availableSlots.includes(rescheduleForm.time) ||
                      availableSlotsQuery.isFetching ||
                      availableSlotsQuery.isError ||
                      Boolean(availableSlotsQuery.data?.error)
                    }
                  >
                    {rescheduleAppointment.isPending
                      ? "Guardando…"
                      : "Guardar horario"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!cancelTarget}
            onOpenChange={(open) => {
              if (!open && !cancelAppointment.isPending) setCancelTarget(null);
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
                  Acción irreversible
                </p>
                <DialogTitle>Cancelar esta cita</DialogTitle>
                <DialogDescription>
                  {cancelTarget
                    ? `Se cancelará la cita de ${cancelTarget.patient.name || "este paciente"} el ${cancelTarget.date} a las ${cancelTarget.time}.`
                    : "La cita se quitará de la agenda activa."}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(event) => void handleCancel(event)}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
                  <Textarea
                    id="cancel-reason"
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    placeholder="Añade una nota para el registro de la cita"
                    maxLength={500}
                    rows={3}
                  />
                  <p className="text-muted-foreground text-right text-xs">
                    {cancelReason.length}/500
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCancelTarget(null)}
                    disabled={cancelAppointment.isPending}
                  >
                    Conservar cita
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={cancelAppointment.isPending}
                  >
                    {cancelAppointment.isPending
                      ? "Cancelando…"
                      : "Confirmar cancelación"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </OperationsShell>
    </DashboardWrapper>
  );
}
