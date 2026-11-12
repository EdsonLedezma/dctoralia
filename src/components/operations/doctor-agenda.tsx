"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  CalendarClock,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { api } from "~/trpc/react";
import { OperationsShell } from "./operations-shell";
import { Skeleton } from "~/components/ui/skeleton";
import { DatePicker } from "~/components/ui/date-picker";
import { TimeSlotPicker } from "~/components/ui/time-slot-picker";
import { SegmentedControl } from "~/components/ui/segmented-control";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  getAppointmentStatusColor,
  normalizeAppointmentStatus,
} from "./appointments.utils";
import type { DailyAppointment } from "./appointments.types";

gsap.registerPlugin(useGSAP);

function mexicoDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

function dateFromKey(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

function shiftDateKey(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekStartKey(date: Date): string {
  const key = mexicoDateKey(date);
  const day = dateFromKey(key).getUTCDay();
  return shiftDateKey(key, day === 0 ? -6 : 1 - day);
}

function formatWeekRange(startKey: string): string {
  const endKey = shiftDateKey(startKey, 6);
  const formatter = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "America/Mexico_City",
  });
  const start = formatter.format(dateFromKey(startKey));
  const end = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Mexico_City",
  }).format(dateFromKey(endKey));
  return `${start} – ${end}`;
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [rescheduleTarget, setRescheduleTarget] =
    useState<DailyAppointment | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "" });
  const [cancelTarget, setCancelTarget] = useState<DailyAppointment | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  const agendaRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
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

  const targetDate = mexicoDateKey(currentDate);
  const currentWeekStart = weekStartKey(currentDate);
  const appointments = useMemo(
    () =>
      allAppointments.filter((appointment) => appointment.date === targetDate),
    [allAppointments, targetDate],
  );
  const weekAppointments = useMemo(() => {
    const endKey = shiftDateKey(currentWeekStart, 6);
    return allAppointments.filter(
      (appointment) =>
        appointment.date >= currentWeekStart && appointment.date <= endKey,
    );
  }, [allAppointments, currentWeekStart]);
  const visibleAppointments =
    viewMode === "day" ? appointments : weekAppointments;
  const serviceOptions = useMemo(() => {
    const services = new Map<string, string>();
    allAppointments.forEach((appointment) => {
      if (appointment.service.id)
        services.set(appointment.service.id, appointment.service.name);
    });
    return [...services.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [allAppointments]);
  const locationOptions = useMemo(() => {
    const locations = new Map<string, string>();
    allAppointments.forEach((appointment) => {
      if (appointment.location)
        locations.set(appointment.location.id, appointment.location.name);
    });
    return [...locations.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [allAppointments]);
  const filteredAppointments = useMemo(
    () =>
      visibleAppointments.filter(
        (appointment) =>
          (statusFilter === "ALL" || appointment.rawStatus === statusFilter) &&
          (serviceFilter === "ALL" ||
            appointment.service.id === serviceFilter) &&
          (locationFilter === "ALL" ||
            appointment.location?.id === locationFilter),
      ),
    [visibleAppointments, statusFilter, serviceFilter, locationFilter],
  );
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const key = shiftDateKey(currentWeekStart, index);
        return {
          key,
          date: dateFromKey(key),
          appointments: filteredAppointments.filter(
            (item) => item.date === key,
          ),
        };
      }),
    [currentWeekStart, filteredAppointments],
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
      setCurrentDate(dateFromKey(rescheduleForm.date));
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

  useGSAP(
    () => {
      if (reducedMotion) return;
      const cards = gsap.utils
        .toArray<HTMLElement>(".agenda-appointment-card")
        .slice(0, 10);
      if (!cards.length) return;
      gsap.fromTo(
        cards,
        { autoAlpha: 0, y: 6 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.2,
          stagger: 0.018,
          ease: "power3.out",
          clearProps: "opacity,visibility,transform",
        },
      );
    },
    {
      scope: agendaRef,
      dependencies: [filteredAppointments, viewMode, reducedMotion],
      revertOnUpdate: true,
    },
  );

  const previousDay = () => {
    setCurrentDate((date) => {
      const baseKey =
        viewMode === "day" ? mexicoDateKey(date) : weekStartKey(date);
      return dateFromKey(shiftDateKey(baseKey, viewMode === "day" ? -1 : -7));
    });
  };

  const nextDay = () => {
    setCurrentDate((date) => {
      const baseKey =
        viewMode === "day" ? mexicoDateKey(date) : weekStartKey(date);
      return dateFromKey(shiftDateKey(baseKey, viewMode === "day" ? 1 : 7));
    });
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

  const appointmentCard = (appointment: DailyAppointment, compact = false) => (
    <article
      key={appointment.id}
      className={`agenda-appointment-card group material-card border-border bg-card hover:border-foreground/30 rounded-2xl border p-3 transition-[border-color,box-shadow] duration-150 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${compact ? "p-2.5" : ""}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-muted-foreground font-mono text-xs font-medium tabular-nums">
          {appointment.time}
        </p>
        <AppointmentActions
          appointment={appointment}
          isUpdating={updateStatus.isPending}
          isRecordingAttendance={recordAttendance.isPending}
          isRescheduling={rescheduleAppointment.isPending}
          isCancelling={cancelAppointment.isPending}
          onStatusChange={(item, status) =>
            void handleStatusChange(item, status)
          }
          onAttendance={(item, action) => void handleAttendance(item, action)}
          onReschedule={startReschedule}
          onCancel={startCancel}
        />
      </div>
      <Link
        href={`/dashboard/patients/${appointment.patient.id}`}
        className="text-foreground focus-visible:outline-ring mt-1 block truncate text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {appointment.patient.name || "Paciente"}
      </Link>
      <p className="text-muted-foreground mt-1 truncate text-xs">
        {appointment.service.name || appointment.reason || "Consulta"}
      </p>
      {appointment.checkedInAt && (
        <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs tabular-nums">
          <span className="bg-foreground size-1.5 rounded-full" />
          Llegó{" "}
          {new Intl.DateTimeFormat("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Mexico_City",
          }).format(appointment.checkedInAt)}
          {appointment.consultationStartedAt && (
            <span className="text-muted-foreground">
              · Consulta iniciada{" "}
              {new Intl.DateTimeFormat("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Mexico_City",
              }).format(appointment.consultationStartedAt)}
            </span>
          )}
        </p>
      )}
      {!compact && appointment.location && (
        <p className="text-muted-foreground mt-1 truncate text-xs">
          {appointment.location.name}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <Badge className={getAppointmentStatusColor(appointment.status)}>
          {appointment.rawStatus === "NO_SHOW"
            ? "No asistió"
            : appointment.status.charAt(0).toUpperCase() +
              appointment.status.slice(1)}
        </Badge>
        <span className="text-muted-foreground text-xs tabular-nums">
          {appointment.duration} min
        </span>
      </div>
    </article>
  );

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <OperationsShell>
        <main
          ref={agendaRef}
          className="bg-background min-h-[100dvh] px-4 py-7 sm:px-8 sm:py-10"
        >
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

            <section
              className="mb-5 grid gap-3 sm:grid-cols-3"
              aria-label={
                viewMode === "day" ? "Resumen del día" : "Resumen de la semana"
              }
            >
              {[
                {
                  label:
                    viewMode === "day" ? "Citas del día" : "Citas de la semana",
                  value: filteredAppointments.length,
                },
                {
                  label: "Por confirmar",
                  value: filteredAppointments.filter(
                    (a) => a.rawStatus === "PENDING",
                  ).length,
                },
                {
                  label: "Confirmadas",
                  value: filteredAppointments.filter(
                    (a) => a.rawStatus === "CONFIRMED",
                  ).length,
                },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={
                    reducedMotion
                      ? false
                      : { opacity: 0, transform: "translateY(6px)" }
                  }
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  transition={{
                    duration: 0.2,
                    delay: reducedMotion ? 0 : index * 0.035,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  className="material-card border-border bg-card rounded-3xl border px-5 py-4"
                >
                  <p className="text-muted-foreground text-sm">{item.label}</p>
                  <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                    {item.value}
                  </p>
                </motion.div>
              ))}
            </section>

            <section className="material-card border-border bg-card overflow-hidden rounded-3xl border">
              <div className="border-border flex flex-wrap items-center justify-between gap-4 border-b px-4 py-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={previousDay}
                    aria-label={
                      viewMode === "day" ? "Día anterior" : "Semana anterior"
                    }
                    className="size-11 lg:size-11"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={nextDay}
                    aria-label={
                      viewMode === "day" ? "Día siguiente" : "Semana siguiente"
                    }
                    className="size-11 lg:size-11"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <div className="ml-2">
                    <DatePicker
                      label="Fecha de agenda"
                      value={targetDate}
                      onValueChange={(value) =>
                        setCurrentDate(dateFromKey(value))
                      }
                    />
                    {viewMode === "week" && (
                      <p className="mt-2 text-sm font-medium">
                        {formatWeekRange(currentWeekStart)}
                      </p>
                    )}
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {filteredAppointments.length} de{" "}
                      {visibleAppointments.length}{" "}
                      {visibleAppointments.length === 1 ? "cita" : "citas"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SegmentedControl
                    value={viewMode}
                    onValueChange={setViewMode}
                    label="Vista de agenda"
                    options={[
                      { value: "day", label: "Día" },
                      { value: "week", label: "Semana" },
                    ]}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                    className="text-muted-foreground min-h-10 lg:min-h-11"
                  >
                    Hoy
                  </Button>
                </div>
              </div>

              <div className="border-border bg-background flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-5">
                <span className="text-muted-foreground mr-1 text-xs font-medium">
                  Filtrar
                </span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger
                    className="min-h-11 w-full sm:w-[170px]"
                    aria-label="Estado de citas"
                  >
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los estados</SelectItem>
                    <SelectItem value="PENDING">Pendientes</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmadas</SelectItem>
                    <SelectItem value="COMPLETED">Completadas</SelectItem>
                    <SelectItem value="CANCELLED">Canceladas</SelectItem>
                    <SelectItem value="NO_SHOW">No asistió</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger
                    className="min-h-11 w-full sm:w-[190px]"
                    aria-label="Servicio de citas"
                  >
                    <SelectValue placeholder="Servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los servicios</SelectItem>
                    {serviceOptions.map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={locationFilter}
                  onValueChange={setLocationFilter}
                >
                  <SelectTrigger
                    className="min-h-11 w-full sm:w-[190px]"
                    aria-label="Ubicación de citas"
                  >
                    <SelectValue placeholder="Ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas las ubicaciones</SelectItem>
                    {locationOptions.map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(statusFilter !== "ALL" ||
                  serviceFilter !== "ALL" ||
                  locationFilter !== "ALL") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground min-h-10 px-2 text-xs lg:min-h-11"
                    onClick={() => {
                      setStatusFilter("ALL");
                      setServiceFilter("ALL");
                      setLocationFilter("ALL");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>

              {isError || data?.error ? (
                <div role="alert" className="space-y-3 p-6">
                  <p>No pudimos cargar la agenda.</p>
                  <Button variant="outline" onClick={() => void refetch()}>
                    Reintentar agenda
                  </Button>
                </div>
              ) : isLoading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              ) : filteredAppointments.length ? (
                viewMode === "week" ? (
                  <div className="p-3 sm:p-4">
                    <div className="divide-border border-border bg-background grid min-w-0 grid-cols-1 divide-y rounded-lg border xl:grid-cols-7 xl:divide-x xl:divide-y-0">
                      {weekDays.map((day) => {
                        const dayKey = mexicoDateKey(new Date());
                        const isToday = day.key === dayKey;
                        return (
                          <section key={day.key} className="min-h-[280px] p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentDate(day.date);
                                setViewMode("day");
                              }}
                              className="hover:bg-card focus-visible:outline-ring mb-2 flex min-h-11 w-full items-center justify-between rounded-md px-1.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                              aria-label={`Ver agenda del ${new Intl.DateTimeFormat("es-MX", { dateStyle: "full", timeZone: "America/Mexico_City" }).format(day.date)}`}
                            >
                              <span>
                                <span className="text-muted-foreground block text-xs font-medium tracking-wide uppercase">
                                  {new Intl.DateTimeFormat("es-MX", {
                                    weekday: "short",
                                    timeZone: "America/Mexico_City",
                                  }).format(day.date)}
                                </span>
                                <span
                                  className={`mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-sm font-medium tabular-nums ${isToday ? "glass-thumb text-foreground" : "text-foreground"}`}
                                >
                                  {new Intl.DateTimeFormat("es-MX", {
                                    day: "numeric",
                                    timeZone: "America/Mexico_City",
                                  }).format(day.date)}
                                </span>
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {day.appointments.length}
                              </span>
                            </button>
                            <div className="space-y-2">
                              {day.appointments.map((appointment) =>
                                appointmentCard(appointment, true),
                              )}
                              {!day.appointments.length && (
                                <p className="border-border text-muted-foreground rounded-md border border-dashed px-2 py-3 text-center text-xs">
                                  Sin citas
                                </p>
                              )}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 p-3 sm:p-4">
                    {filteredAppointments.map((appointment) =>
                      appointmentCard(appointment),
                    )}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center px-6 py-14 text-center">
                  <div className="bg-muted text-muted-foreground mb-4 flex size-11 items-center justify-center rounded-full">
                    <CalendarDays className="size-5" />
                  </div>
                  <h3 className="text-foreground text-sm font-semibold">
                    {visibleAppointments.length
                      ? "No hay citas con estos filtros"
                      : viewMode === "day"
                        ? "No hay citas para este día"
                        : "No hay citas esta semana"}
                  </h3>
                  <p className="text-muted-foreground mt-1 max-w-sm text-sm leading-6">
                    Puedes agendar una consulta o revisar{" "}
                    {viewMode === "day" ? "otro día" : "otra semana"}.
                  </p>
                  <Button asChild variant="outline" className="mt-5">
                    <Link href="/dashboard/appointments/new">
                      <Plus className="mr-2 size-4" />
                      Agendar cita
                    </Link>
                  </Button>
                </div>
              )}
            </section>
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
