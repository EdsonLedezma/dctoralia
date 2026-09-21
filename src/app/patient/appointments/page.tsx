"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
      !rescheduleData.time
    ) {
      toast.error("Completa todos los campos");
      return;
    }

    try {
      const response = await rescheduleMutation.mutateAsync({
        id: rescheduleDialog.appointmentId,
        newDate: new Date(`${rescheduleData.date}T${rescheduleData.time}:00`),
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
        <div className="min-h-screen bg-[#fafafa]">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-5 flex flex-col gap-4 border-b border-[#ebebeb] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium tracking-[0.08em] text-[#737373] uppercase">
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
            <div className="mb-6 flex flex-col gap-3 border-b border-[#ebebeb] pb-4 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#737373]" />
                <Input
                  aria-label="Buscar citas"
                  placeholder="Buscar por doctor o servicio"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 border-[#e5e5e5] bg-white pl-9 text-sm shadow-none focus-visible:border-[#a3a3a3] focus-visible:ring-1 focus-visible:ring-[#d4d4d4]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full border-[#e5e5e5] bg-white text-sm shadow-none sm:w-44">
                  <Filter className="mr-2 h-3.5 w-3.5 text-[#737373]" />
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
                  className="min-h-9 text-left text-xs font-medium text-[#737373] hover:text-[#171717] sm:px-2"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="mb-3 flex items-center justify-between text-xs text-[#737373]">
              <span>{filteredAppointments.length} citas</span>
              <span>Actualizadas recientemente</span>
            </div>

            {/* Appointments List */}
            {isError ? (
              <div
                className="border-y border-[#ebebeb] bg-white px-5 py-8 text-sm text-[#525252]"
                role="alert"
              >
                No pudimos cargar tus citas.
              </div>
            ) : isLoading ? (
              <div
                className="divide-y divide-[#ebebeb] border-y border-[#ebebeb] bg-white"
                aria-label="Cargando citas"
              >
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-28 animate-pulse" />
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="border-y border-[#ebebeb] bg-white px-5 py-12 text-center">
                <Calendar className="mx-auto h-7 w-7 text-[#737373]" />
                <p className="mt-4 text-sm font-medium">
                  No hay citas para mostrar
                </p>
                <p className="mt-1 text-xs text-[#737373]">
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
              <MotionList className="divide-y divide-[#ebebeb] border-y border-[#ebebeb] bg-white">
                {filteredAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="px-4 py-5 transition-colors hover:bg-[#fafafa] sm:px-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h2 className="truncate text-sm font-medium">
                            {appointment.doctor}
                          </h2>
                          <Badge className="border border-[#e5e5e5] bg-[#fafafa] text-xs font-normal text-[#525252]">
                            {getStatusText(appointment.status)}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-[#737373]">
                          {appointment.specialty ||
                            "Especialidad no registrada"}{" "}
                          · {appointment.type}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-[#525252] sm:text-right">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#737373]" />
                          {formatDate(appointment.date)}
                        </span>
                        <span className="flex items-center gap-1.5 font-mono">
                          <Clock className="h-3.5 w-3.5 text-[#737373]" />
                          {appointment.time}
                        </span>
                      </div>
                    </div>

                    {appointment.diagnosis && (
                      <p className="mt-3 border-l-2 border-[#d4d4d4] pl-3 text-xs leading-5 text-[#525252]">
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
                        appointment.status === "pending") && (
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
                <div className="space-y-2">
                  <Label htmlFor="reschedule-date">Nueva Fecha</Label>
                  <Input
                    id="reschedule-date"
                    type="date"
                    value={rescheduleData.date}
                    onChange={(e) =>
                      setRescheduleData({
                        ...rescheduleData,
                        date: e.target.value,
                      })
                    }
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reschedule-time">Nueva Hora</Label>
                  <Input
                    id="reschedule-time"
                    type="time"
                    value={rescheduleData.time}
                    onChange={(e) =>
                      setRescheduleData({
                        ...rescheduleData,
                        time: e.target.value,
                      })
                    }
                  />
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
                <Button onClick={handleReschedule}>Confirmar Reagendado</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ProductShell>
    </DashboardWrapper>
  );
}
