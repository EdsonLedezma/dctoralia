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
import DashboardWrapper from "../../../components/auth/DashboardWrapper";
import { api } from "src/trpc/react";
import { ProductShell } from "~/components/shell/product-shell";
import { Skeleton } from "~/components/ui/skeleton";
import { Input } from "~/components/ui/input";
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
  formatAppointmentDate,
  getAppointmentStatusColor,
  normalizeAppointmentStatus,
} from "./_components/appointments.utils";
import type { DailyAppointment } from "./_components/appointments.types";

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
          className="size-11 shrink-0 text-[#737373] hover:text-[#171717] lg:size-8"
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

export default function AppointmentsPage() {
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
  const { data, isLoading } = api.appointments.listMine.useQuery();
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
    if (!rescheduleTarget || !rescheduleForm.date || !rescheduleForm.time)
      return;
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
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo reprogramar la cita",
      );
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
    setRescheduleForm({ date: appointment.date, time: appointment.time });
    setRescheduleTarget(appointment);
  };

  const startCancel = (appointment: DailyAppointment) => {
    setCancelReason("");
    setCancelTarget(appointment);
  };

  const appointmentCard = (appointment: DailyAppointment, compact = false) => (
    <article
      key={appointment.id}
      className={`agenda-appointment-card group rounded-lg border border-[#ebebeb] bg-white p-3 transition-[border-color,box-shadow] duration-150 hover:border-[#d4d4d4] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${compact ? "p-2.5" : ""}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="font-mono text-xs font-medium text-[#525252] tabular-nums">
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
        className="mt-1 block truncate text-sm font-medium text-[#171717] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0070f3]"
      >
        {appointment.patient.name || "Paciente"}
      </Link>
      <p className="mt-1 truncate text-xs text-[#737373]">
        {appointment.service.name || appointment.reason || "Consulta"}
      </p>
      {appointment.checkedInAt && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#525252] tabular-nums">
          <span className="size-1.5 rounded-full bg-[#00a878]" />
          Llegó{" "}
          {new Intl.DateTimeFormat("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Mexico_City",
          }).format(appointment.checkedInAt)}
          {appointment.consultationStartedAt && (
            <span className="text-[#888]">
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
        <p className="mt-1 truncate text-xs text-[#888]">
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
        <span className="text-[11px] text-[#888] tabular-nums">
          {appointment.duration} min
        </span>
      </div>
    </article>
  );

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <main
          ref={agendaRef}
          className="min-h-[100dvh] bg-[#fafafa] px-4 py-7 sm:px-8 sm:py-10"
        >
          <div className="mx-auto max-w-6xl">
            <header className="mb-7 flex flex-col gap-5 border-b border-[#ebebeb] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium tracking-[0.08em] text-[#737373] uppercase">
                  Operación
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717] sm:text-3xl">
                  Agenda
                </h1>
                <p className="mt-2 text-sm text-[#737373]">
                  Consulta y administra las citas de tu práctica.
                </p>
              </div>
              <Button
                asChild
                className="h-10 bg-[#171717] px-4 text-white hover:bg-[#333]"
              >
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
                  className="rounded-xl border border-[#ebebeb] bg-white px-5 py-4"
                >
                  <p className="text-sm text-[#737373]">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[#171717] tabular-nums">
                    {item.value}
                  </p>
                </motion.div>
              ))}
            </section>

            <section className="overflow-hidden rounded-xl border border-[#ebebeb] bg-white">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ebebeb] px-4 py-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={previousDay}
                    aria-label={
                      viewMode === "day" ? "Día anterior" : "Semana anterior"
                    }
                    className="size-11 lg:size-9"
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
                    className="size-11 lg:size-9"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <div className="ml-2">
                    <h2 className="text-sm font-semibold text-[#171717] capitalize">
                      {viewMode === "day"
                        ? formatAppointmentDate(currentDate)
                        : formatWeekRange(currentWeekStart)}
                    </h2>
                    <p className="mt-0.5 text-xs text-[#737373]">
                      {filteredAppointments.length} de{" "}
                      {visibleAppointments.length}{" "}
                      {visibleAppointments.length === 1 ? "cita" : "citas"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex rounded-lg border border-[#ebebeb] bg-[#fafafa] p-1"
                    aria-label="Vista de agenda"
                  >
                    {(["day", "week"] as const).map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        size="sm"
                        variant={viewMode === mode ? "secondary" : "ghost"}
                        aria-pressed={viewMode === mode}
                        onClick={() => setViewMode(mode)}
                        className="h-10 px-3 text-xs lg:h-8"
                      >
                        {mode === "day" ? "Día" : "Semana"}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                    className="min-h-10 text-[#525252] lg:min-h-8"
                  >
                    Hoy
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
                <span className="mr-1 text-xs font-medium text-[#737373]">
                  Filtrar
                </span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="min-h-11 w-[150px] bg-white text-xs lg:min-h-8">
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
                  <SelectTrigger className="min-h-11 w-[170px] bg-white text-xs lg:min-h-8">
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
                  <SelectTrigger className="min-h-11 w-[170px] bg-white text-xs lg:min-h-8">
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
                    className="min-h-10 px-2 text-xs text-[#737373] lg:min-h-8"
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

              {isLoading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              ) : filteredAppointments.length ? (
                viewMode === "week" ? (
                  <div className="p-3 sm:p-4">
                    <div className="grid min-w-0 grid-cols-1 divide-y divide-[#ebebeb] rounded-lg border border-[#ebebeb] bg-[#fafafa] xl:min-w-[980px] xl:grid-cols-7 xl:divide-x xl:divide-y-0">
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
                              className="mb-2 flex min-h-11 w-full items-center justify-between rounded-md px-1.5 py-2 text-left hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0070f3]"
                              aria-label={`Ver agenda del ${new Intl.DateTimeFormat("es-MX", { dateStyle: "full", timeZone: "America/Mexico_City" }).format(day.date)}`}
                            >
                              <span>
                                <span className="block text-[11px] font-medium tracking-wide text-[#737373] uppercase">
                                  {new Intl.DateTimeFormat("es-MX", {
                                    weekday: "short",
                                    timeZone: "America/Mexico_City",
                                  }).format(day.date)}
                                </span>
                                <span
                                  className={`mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-sm font-medium tabular-nums ${isToday ? "bg-[#171717] text-white" : "text-[#171717]"}`}
                                >
                                  {new Intl.DateTimeFormat("es-MX", {
                                    day: "numeric",
                                    timeZone: "America/Mexico_City",
                                  }).format(day.date)}
                                </span>
                              </span>
                              <span className="text-[11px] text-[#888]">
                                {day.appointments.length}
                              </span>
                            </button>
                            <div className="space-y-2">
                              {day.appointments.map((appointment) =>
                                appointmentCard(appointment, true),
                              )}
                              {!day.appointments.length && (
                                <p className="rounded-md border border-dashed border-[#e5e5e5] px-2 py-3 text-center text-[11px] text-[#a3a3a3]">
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
                  <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-[#f5f5f5] text-[#525252]">
                    <CalendarDays className="size-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#171717]">
                    {visibleAppointments.length
                      ? "No hay citas con estos filtros"
                      : viewMode === "day"
                        ? "No hay citas para este día"
                        : "No hay citas esta semana"}
                  </h3>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-[#737373]">
                    No mostramos horarios vacíos como si fueran citas. Puedes
                    crear una cita o revisar{" "}
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
                <p className="text-xs font-medium tracking-[0.08em] text-[#737373] uppercase">
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
                    <Label htmlFor="reschedule-date">Nueva fecha</Label>
                    <Input
                      id="reschedule-date"
                      type="date"
                      className="h-11 text-base sm:text-sm"
                      min={new Date().toLocaleDateString("en-CA", {
                        timeZone: "America/Mexico_City",
                      })}
                      value={rescheduleForm.date}
                      onChange={(event) =>
                        setRescheduleForm((current) => ({
                          ...current,
                          date: event.target.value,
                          time: "",
                        }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Nueva hora</Label>
                    {rescheduleForm.date && !availableSlotsQuery.isLoading && (
                      <span className="text-xs text-[#737373]">
                        {availableSlots.length} disponibles
                      </span>
                    )}
                  </div>
                  {!rescheduleForm.date ? (
                    <p className="rounded-lg border border-dashed border-[#e5e5e5] px-3 py-4 text-sm text-[#737373]">
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
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <p>
                        {availableSlotsQuery.data?.message ??
                          "No pudimos consultar los horarios."}
                      </p>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0 py-1 text-red-700"
                        onClick={() => void availableSlotsQuery.refetch()}
                      >
                        Intentar de nuevo
                      </Button>
                    </div>
                  ) : availableSlots.length ? (
                    <div
                      className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4"
                      aria-label="Horarios disponibles"
                    >
                      {availableSlots.map((time) => (
                        <Button
                          key={time}
                          type="button"
                          size="sm"
                          variant={
                            rescheduleForm.time === time ? "default" : "outline"
                          }
                          aria-pressed={rescheduleForm.time === time}
                          onClick={() =>
                            setRescheduleForm((current) => ({
                              ...current,
                              time,
                            }))
                          }
                          className="min-h-11 font-mono text-xs tabular-nums"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-[#e5e5e5] px-3 py-4 text-sm text-[#737373]">
                      No hay horarios libres en la jornada de ese día.
                    </p>
                  )}
                </div>
                <p className="rounded-lg bg-[#fafafa] px-3 py-2 text-xs leading-5 text-[#737373]">
                  El horario se vuelve a validar al guardar para evitar cruces
                  con citas que se agenden mientras este diálogo está abierto.
                </p>
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
                      !rescheduleForm.time
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
                <p className="text-xs font-medium tracking-[0.08em] text-[#737373] uppercase">
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
                  <p className="text-right text-xs text-[#737373]">
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
      </ProductShell>
    </DashboardWrapper>
  );
}
