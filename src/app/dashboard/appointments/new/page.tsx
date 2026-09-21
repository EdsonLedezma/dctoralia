"use client";

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Calendar, Save, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardWrapper from "../../../../components/auth/DashboardWrapper";
// import { useAppointment } from "~/server/api/routers/appointment"
import { api } from "~/trpc/react";
import { ProductShell } from "~/components/shell/product-shell";
import { toast } from "sonner";
import { unwrapTrpcResult } from "~/types/trpc-response";

const appointmentTypes = [
  "Consulta General",
  "Control",
  "Primera Consulta",
  "Seguimiento",
  "Urgencia",
  "Examen Médico",
  "Revisión de Resultados",
];

const timeSlots = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
];

export default function NewAppointmentPage() {
  const router = useRouter();

  // Obtener pacientes reales desde TRPC
  const { data: patientsData, isLoading: loadingUsers } =
    api.doctor.getMyPatients.useQuery({});
  const patients = patientsData?.result ?? [];

  // Mutación para crear cita
  const createAppointment = api.appointments.create.useMutation();

  const [formData, setFormData] = useState({
    patientId: "",
    date: "",
    time: "",
    duration: "30",
    reason: "",
    notes: "",
    priority: "normal",
  });

  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !formData.patientId ||
      !formData.date ||
      !formData.time ||
      !formData.reason
    ) {
      setError("Por favor, completa todos los campos requeridos.");
      return;
    }

    // Concatenar fecha y hora para crear un ISO string completo
    const dateObj = new Date(`${formData.date}T${formData.time}:00`);

    try {
      const response = await createAppointment.mutateAsync({
        patientId: formData.patientId,
        date: dateObj,
        time: formData.time,
        duration: Number(formData.duration),
        reason: formData.reason,
        notes: formData.notes,
      });
      unwrapTrpcResult(response);
      toast.success("Cita creada correctamente");
      router.push("/dashboard/appointments");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al crear la cita.";
      setError(message);
      toast.error(message);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <div className="min-h-screen bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
          <main className="mx-auto max-w-3xl">
            <div className="mb-6">
              <p className="text-sm text-[#6b6b6b]">Agenda</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#171717]">
                Nueva cita
              </h1>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información del Paciente */}
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb]">
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Información del Paciente</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient">Paciente</Label>
                    <Select
                      onValueChange={(value) =>
                        handleInputChange("patientId", value)
                      }
                      value={formData.patientId}
                      required
                      disabled={loadingUsers}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingUsers
                              ? "Cargando..."
                              : "Seleccionar paciente"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.user.name ?? patient.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link href="/dashboard/patients">Ver pacientes</Link>
                    </Button>
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link href="/dashboard/patients/new">Nuevo paciente</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Información de la Cita */}
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb]">
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Detalles de la Cita</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input
                      id="date"
                      type="date"
                      min={today}
                      value={formData.date}
                      onChange={(e) =>
                        handleInputChange("date", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Hora</Label>
                    <Select
                      onValueChange={(value) =>
                        handleInputChange("time", value)
                      }
                      value={formData.time}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar hora" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duración (minutos)</Label>
                    <Select
                      onValueChange={(value) =>
                        handleInputChange("duration", value)
                      }
                      value={formData.duration}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="30 minutos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="45">45 minutos</SelectItem>
                        <SelectItem value="60">60 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="reason">Tipo de Consulta</Label>
                    <Select
                      onValueChange={(value) =>
                        handleInputChange("reason", value)
                      }
                      value={formData.reason}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {appointmentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="priority">Prioridad</Label>
                    <Select
                      onValueChange={(value) =>
                        handleInputChange("priority", value)
                      }
                      value={formData.priority}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Normal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baja">Baja</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Notas Adicionales */}
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb]">
                  <CardTitle>Notas Adicionales</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="notes" className="mb-2 block">
                    Notas
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Motivo de la consulta, síntomas, observaciones..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* Botones de acción */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  disabled={createAppointment.status === "pending"}
                  className="w-full flex-1 sm:w-auto"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {createAppointment.status === "pending"
                    ? "Guardando..."
                    : "Agendar Cita"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex-1 sm:w-auto"
                  disabled={createAppointment.status === "pending"}
                  asChild
                >
                  <Link href="/dashboard/appointments">Cancelar</Link>
                </Button>
              </div>

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
            </form>
          </main>
        </div>
      </ProductShell>
    </DashboardWrapper>
  );
}
