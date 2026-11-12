"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Calendar, Clock, Search, Filter, Plus, Phone } from "lucide-react";
import Link from "next/link";
import { api } from "src/trpc/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { unwrapTrpcResult } from "~/types/trpc-response";
import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { ProductShell } from "~/components/shell/product-shell";
import { MotionList } from "~/components/shared/motion-list";
import { DatePicker } from "~/components/ui/date-picker";
import { TimeSlotPicker } from "~/components/ui/time-slot-picker";

function mexicoDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function isUpcomingAppointment(date: string, time: string, now: Date) {
  const today = mexicoDateKey(now);
  if (date !== today) return date > today;
  const currentTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return time > currentTime;
}

export default function PatientAppointmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rescheduleDialog, setRescheduleDialog] = useState<{
    open: boolean;
    appointmentId: string | null;
  }>({
    open: false,
    appointmentId: null,
  });
  const [rescheduleData, setRescheduleData] = useState({ date: "", time: "" });

  const {
    data: mine,
    refetch,
    isLoading,
    isError,
  } = api.appointments.listMine.useQuery();
  const cancelMutation = api.appointments.cancel.useMutation();
  const rescheduleMutation = api.appointments.reschedule.useMutation();

  const appointments = (mine?.result ?? []).map((appointment) => ({
    id: appointment.id,
    doctor: appointment.doctor.user.name,
    specialty: appointment.doctor.specialty,
    date: appointment.date.toISOString().slice(0, 10),
    time: appointment.time,
    type: appointment.reason ?? "Consulta",
    status: appointment.status.toLowerCase(),
    location: "",
    address: "",
    phone: appointment.doctor.phone,
    diagnosis: appointment.notes ?? "",
  }));
  const availableSlots = api.appointments.availableSlots.useQuery(
    {
      appointmentId: rescheduleDialog.appointmentId ?? "",
      date: new Date(
        `${rescheduleData.date || mexicoDateKey(new Date())}T12:00:00.000Z`,
      ),
    },
    {
      enabled: rescheduleDialog.open && Boolean(rescheduleDialog.appointmentId),
    },
  );
  const availableTimes = availableSlots.data?.result ?? [];
  const currentAppointment = appointments.find(
    (appointment) => appointment.id === rescheduleDialog.appointmentId,
  );
  const canReschedule =
    availableTimes.includes(rescheduleData.time) &&
    Boolean(
      currentAppointment &&
        (currentAppointment.date !== rescheduleData.date ||
          currentAppointment.time !== rescheduleData.time),
    );

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmada";
      case "pending":
        return "Pendiente";
      case "completed":
        return "Completada";
      case "cancelled":
        return "Cancelada";
      case "no_show":
        return "No asistió";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch =
      appointment.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || appointment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCancel = async (appointmentId: string) => {
    if (!confirm("¿Estás seguro de cancelar esta cita?")) return;

    try {
      const response = await cancelMutation.mutateAsync({
        id: appointmentId,
        reason: "Cancelada por el paciente",
      });
      unwrapTrpcResult(response);
      toast.success("Cita cancelada correctamente");
      void refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al cancelar la cita",
      );
    }
  };

  const handleReschedule = async () => {
    if (
      !rescheduleDialog.appointmentId ||
      !rescheduleData.date ||
      !canReschedule
    ) {
      toast.error(
        "Elige una fecha y un horario disponible distintos a tu cita actual",
      );
      return;
    }

    try {
      const response = await rescheduleMutation.mutateAsync({
        id: rescheduleDialog.appointmentId,
        newDate: new Date(`${rescheduleData.date}T12:00:00.000Z`),
        newTime: rescheduleData.time,
      });
      unwrapTrpcResult(response);
      toast.success("Cita reagendada correctamente");
      setRescheduleDialog({ open: false, appointmentId: null });
      setRescheduleData({ date: "", time: "" });
      void refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al reagendar la cita",
      );
    }
  };

  const openRescheduleDialog = (
    appointmentId: string,
    currentDate: string,
    currentTime: string,
  ) => {
    setRescheduleDialog({ open: true, appointmentId });
    setRescheduleData({ date: currentDate, time: currentTime });
  };

  return (
    <DashboardWrapper allowedRoles={["PATIENT"]}>
      <ProductShell role="PATIENT">
        <div className="bg-background min-h-screen">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
            <div className="border-border mb-5 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
                  Agenda personal
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  Mis citas
                </h1>
              </div>
              <Link href="/patient/appointments/book">
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva cita
                </Button>
              </Link>
            </div>

            {/* Filters */}
            <div className="border-border mb-6 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  aria-label="Buscar citas"
                  placeholder="Buscar por doctor o servicio"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-border bg-card focus-visible:border-border focus-visible:ring-ring h-11 pl-9 text-base shadow-none focus-visible:ring-1"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-border bg-card h-11 w-full text-sm shadow-none sm:w-44">
                  <Filter className="text-muted-foreground mr-2 h-3.5 w-3.5" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="confirmed">Confirmadas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="completed">Completadas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  className="text-muted-foreground hover:text-foreground min-h-9 text-left text-xs font-medium sm:px-2"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="text-muted-foreground mb-3 flex items-center justify-between text-xs">
              <span>{filteredAppointments.length} citas</span>
              <span>Actualizadas recientemente</span>
            </div>

            {/* Appointments List */}
            {isError ? (
              <div
                className="material-card border-border bg-card text-muted-foreground rounded-2xl border px-5 py-8 text-sm"
                role="alert"
              >
                No pudimos cargar tus citas.
              </div>
            ) : isLoading ? (
              <div
                className="material-card border-border bg-card divide-border divide-y rounded-2xl border"
                aria-label="Cargando citas"
              >
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-28 animate-pulse" />
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="material-card border-border bg-card rounded-2xl border px-5 py-12 text-center">
                <Calendar className="text-muted-foreground mx-auto h-7 w-7" />
                <p className="mt-4 text-sm font-medium">
                  No hay citas para mostrar
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {searchTerm || statusFilter !== "all"
                    ? "Prueba con otros filtros."
                    : "Agenda una consulta cuando lo necesites."}
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Link
                    href="/patient/appointments/book"
                    className="mt-5 inline-flex"
                  >
                    <Button variant="outline">Buscar doctor</Button>
                  </Link>
                )}
              </div>
            ) : (
              <MotionList className="material-card border-border bg-card divide-border divide-y rounded-2xl border">
                {filteredAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="hover:bg-muted/50 px-4 py-5 transition-colors sm:px-6 sm:py-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h2 className="truncate text-sm font-medium">
                            {appointment.doctor}
                          </h2>
                          <Badge className="border-border bg-background text-muted-foreground border text-xs font-normal">
                            {getStatusText(appointment.status)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 truncate text-xs">
                          {appointment.specialty ||
                            "Especialidad no registrada"}{" "}
                          · {appointment.type}
                        </p>
                      </div>
                      <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs sm:text-right">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                          {formatDate(appointment.date)}
                        </span>
                        <span className="flex items-center gap-1.5 font-mono">
                          <Clock className="text-muted-foreground h-3.5 w-3.5" />
                          {appointment.time}
                        </span>
                      </div>
                    </div>

                    {appointment.diagnosis && (
                      <p className="border-border text-muted-foreground mt-3 border-l-2 pl-3 text-xs leading-5">
                        {appointment.diagnosis}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/patient/appointments/${appointment.id}`}>
                        <Button size="sm" variant="outline">
                          Ver detalles
                        </Button>
                      </Link>
                      {(appointment.status === "confirmed" ||
                        appointment.status === "pending") &&
                        isUpcomingAppointment(
                          appointment.date,
                          appointment.time,
                          new Date(),
                        ) && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                openRescheduleDialog(
                                  appointment.id,
                                  appointment.date,
                                  appointment.time,
                                )
                              }
                            >
                              Reagendar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancel(appointment.id)}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                      {appointment.phone && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={`tel:${appointment.phone}`}>
                            <Phone className="mr-1 h-3.5 w-3.5" />
                            Contactar
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </MotionList>
            )}
          </div>

          {/* Reschedule Dialog */}
          <Dialog
            open={rescheduleDialog.open}
            onOpenChange={(open: boolean) =>
              setRescheduleDialog({ ...rescheduleDialog, open })
            }
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reagendar Cita</DialogTitle>
                <DialogDescription>
                  Selecciona la nueva fecha y hora para tu cita
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <DatePicker
                  value={rescheduleData.date}
                  label="Nueva fecha"
                  onValueChange={(date) =>
                    setRescheduleData({ date, time: "" })
                  }
                  min={mexicoDateKey(new Date())}
                />
                <div className="space-y-2">
                  {availableSlots.isLoading ? (
                    <p className="text-muted-foreground text-sm">
                      Consultando horarios…
                    </p>
                  ) : availableSlots.error || availableSlots.data?.error ? (
                    <p className="text-destructive text-sm" role="alert">
                      No pudimos consultar los horarios. Elige otra fecha o
                      intenta de nuevo.
                    </p>
                  ) : availableTimes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No hay horarios libres para esta fecha.
                    </p>
                  ) : (
                    <TimeSlotPicker
                      slots={availableTimes}
                      selectedTime={rescheduleData.time || null}
                      onSelectTime={(time) =>
                        setRescheduleData((current) => ({
                          ...current,
                          time,
                        }))
                      }
                    />
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    setRescheduleDialog({ open: false, appointmentId: null })
                  }
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleReschedule}
                  disabled={!canReschedule || rescheduleMutation.isPending}
                >
                  {rescheduleMutation.isPending
                    ? "Guardando…"
                    : "Confirmar reagendamiento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ProductShell>
    </DashboardWrapper>
  );
}
