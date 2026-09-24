"use client";

import type React from "react";

import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Calendar as CalendarIcon,
  User,
  CheckCircle,
  ArrowLeft,
  Heart,
} from "lucide-react";
import { Calendar as DateCalendar } from "~/components/ui/calendar";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { unwrapTrpcResult } from "~/types/trpc-response";
import { motion, useReducedMotion } from "motion/react";
import { format, parseISO } from "date-fns";

export default function BookAppointmentPage() {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const params = useParams<{ doctorId: string }>();
  const doctorId = params.doctorId;
  const { status: sessionStatus } = useSession();

  const { data: doctorRes } = api.doctor.getById.useQuery(
    { id: doctorId },
    { enabled: !!doctorId },
  );
  const doctor = doctorRes?.result;
  const { data: servicesRes } = api.services.publicGetByDoctor.useQuery(
    { doctorId },
    { enabled: !!doctorId },
  );
  const services = (servicesRes?.result ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    price: `$${s.price}`,
    duration: s.duration,
  }));
  const { data: profileRes } = api.auth.getProfile.useQuery(undefined, {
    enabled: sessionStatus === "authenticated",
    retry: false,
  });
  const profile = profileRes?.result ?? null;
  const patientId = profile?.patient?.id;

  // Calcular rango de fechas (próximos 30 días)
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);

  const { data: slotsRes } = api.schedule.getAvailableSlots.useQuery(
    {
      doctorId,
      serviceId: selectedService || undefined,
      startDate: today.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    },
    { enabled: !!doctorId && !!selectedService },
  );

  const availableSlots = slotsRes?.result ?? [];

  // Agrupar slots por fecha
  const slotsByDate = availableSlots.reduce<Record<string, string[]>>(
    (acc, slot) => {
      (acc[slot.date] ??= []).push(slot.time);
      return acc;
    },
    {},
  );

  const availableDates = Object.keys(slotsByDate).sort();
  const timeSlots = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: "",
    gender: "",
    reason: "",
    insurance: "",
    emergencyContact: "",
    emergencyPhone: "",
    terms: false,
  });

  const createAppointment = api.appointments.create.useMutation();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Procesar la cita
      if (
        !doctorId ||
        !selectedService ||
        !selectedDate ||
        !selectedTime ||
        !patientId
      )
        return setSubmitError(
          "Selecciona un servicio, fecha y horario antes de continuar.",
        );
      try {
        unwrapTrpcResult(
          await createAppointment.mutateAsync({
            patientId: patientId,
            doctorId,
            serviceId: selectedService,
            date: new Date(`${selectedDate}T${selectedTime}:00`),
            time: selectedTime,
            duration:
              services.find((s) => s.id === selectedService)?.duration ?? 30,
            reason: formData.reason.trim() ? formData.reason : "Consulta",
            notes: "",
          }),
        );
        toast.success("Cita agendada");
        setStep(5);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo agendar la cita";
        setSubmitError(message);
        toast.error(message);
      }
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

  const downloadICS = () => {
    if (!selectedDate || !selectedTime || !doctor) return;

    const appointmentDate = new Date(`${selectedDate}T${selectedTime}:00`);
    const duration = selectedServiceData?.duration ?? 30;
    const endDate = new Date(appointmentDate.getTime() + duration * 60000);

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Dctoralia//Appointment//ES
BEGIN:VEVENT
UID:${Date.now()}@dctoralia.app
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(appointmentDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Cita Médica - ${selectedServiceData?.name}
DESCRIPTION:Cita con ${doctor.user?.name || "Doctor"}\\nServicio: ${selectedServiceData?.name}\\nMotivo: ${formData.reason || "Consulta"}
LOCATION:Consultorio
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `cita-${selectedDate}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedServiceData = services.find((s) => s.id === selectedService);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="border-b border-[#ebebeb] bg-white">
        <div className="container mx-auto flex flex-wrap items-center gap-2 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:py-4">
          <Link href={`/doctor/${doctorId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Perfil
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#171717]">
              <CalendarIcon className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold">Dctoralia</span>
          </div>
          <div className="hidden text-[#a3a3a3] sm:block">|</div>
          <h1 className="text-base font-semibold sm:text-xl">Agendar Cita</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                      step >= stepNumber
                        ? "bg-[#171717] text-white"
                        : "bg-[#ebebeb] text-[#6b6b6b]"
                    }`}
                  >
                    {step > stepNumber ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      stepNumber
                    )}
                  </div>
                  {stepNumber < 4 && (
                    <div
                      className={`mx-1 h-px w-8 sm:mx-2 sm:w-16 ${step > stepNumber ? "bg-[#171717]" : "bg-[#ebebeb]"}`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-[#6b6b6b] sm:text-sm">
              <span>Servicio</span>
              <span>Fecha y Hora</span>
              <span>Información</span>
              <span>Confirmación</span>
            </div>
          </div>

          {step === 5 ? (
            // Confirmation Page
            <Card className="border-[#ebebeb] bg-white text-center shadow-none">
              <CardContent className="p-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0fdf4]">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="mb-4 text-2xl font-bold">
                  ¡Cita Agendada Exitosamente!
                </h2>
                <p className="mb-6 text-[#6b6b6b]">
                  Hemos enviado los detalles de tu cita a tu correo electrónico.
                </p>
                <div className="mb-6 rounded-md border border-[#ebebeb] bg-[#fafafa] p-4">
                  <h3 className="mb-2 font-semibold">Detalles de tu cita:</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Servicio:</strong> {selectedServiceData?.name}
                    </p>
                    <p>
                      <strong>Fecha:</strong> {formatDate(selectedDate)}
                    </p>
                    <p>
                      <strong>Hora:</strong> {selectedTime}
                    </p>
                    <p>
                      <strong>Doctor:</strong> {doctor?.user?.name ?? "Doctor"}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Button className="w-full" onClick={downloadICS}>
                    Agregar al Calendario
                  </Button>
                  <Link href={`/doctor/${doctorId}`}>
                    <Button variant="outline" className="w-full">
                      Volver al Perfil
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSubmit}>
              <motion.div
                key={step}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {/* Step 1: Select Service */}
                {step === 1 && (
                  <Card className="border-[#ebebeb] bg-white shadow-none">
                    <CardHeader className="border-b border-[#ebebeb]">
                      <CardTitle className="flex items-center space-x-2">
                        <Heart className="h-5 w-5" />
                        <span>Selecciona un Servicio</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup
                        value={selectedService}
                        onValueChange={setSelectedService}
                      >
                        <div className="space-y-4">
                          {services.map((service) => (
                            <div
                              key={service.id}
                              className="flex items-center space-x-3 rounded-md border border-[#ebebeb] p-4 transition-colors hover:bg-[#fafafa]"
                            >
                              <RadioGroupItem
                                value={service.id}
                                id={service.id}
                              />
                              <div className="flex-1">
                                <Label
                                  htmlFor={service.id}
                                  className="cursor-pointer font-medium"
                                >
                                  {service.name}
                                </Label>
                                <div className="mt-1 flex items-center space-x-4">
                                  <span className="text-sm text-[#6b6b6b]">
                                    {service.duration} min
                                  </span>
                                  <span className="text-lg font-semibold text-[#171717]">
                                    {service.price}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>
                )}

                {/* Step 2: Select Date and Time */}
                {step === 2 && (
                  <Card className="border-[#ebebeb] bg-white shadow-none">
                    <CardHeader className="border-b border-[#ebebeb]">
                      <CardTitle className="flex items-center space-x-2">
                        <CalendarIcon className="h-5 w-5" />
                        <span>Fecha y Hora</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {availableDates.length === 0 ? (
                        <div className="rounded-md border border-dashed border-[#d4d4d4] bg-[#fafafa] p-6 text-center text-sm text-[#6b6b6b]">
                          El doctor aún no ha configurado horarios de atención.
                        </div>
                      ) : (
                        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_220px]">
                          <div>
                            <div className="mb-3 flex items-center justify-between">
                              <Label className="text-sm font-medium">
                                Selecciona una fecha
                              </Label>
                              <span className="text-xs text-[#737373]">
                                {availableDates.length} días disponibles
                              </span>
                            </div>
                            <div className="rounded-lg border border-[#e5e5e5] bg-white p-2 sm:p-3">
                              <DateCalendar
                                mode="single"
                                selected={
                                  selectedDate
                                    ? parseISO(selectedDate)
                                    : undefined
                                }
                                onSelect={(date) => {
                                  const nextDate = date
                                    ? format(date, "yyyy-MM-dd")
                                    : "";
                                  setSelectedDate(nextDate);
                                  setSelectedTime("");
                                }}
                                disabled={(date) =>
                                  !availableDates.includes(
                                    format(date, "yyyy-MM-dd"),
                                  )
                                }
                                className="mx-auto w-full [--cell-size:2.25rem] sm:[--cell-size:2.5rem]"
                              />
                            </div>
                          </div>

                          <div className="border-t border-[#ebebeb] pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6">
                            <div className="mb-3 flex items-center justify-between">
                              <Label className="text-sm font-medium">
                                Horario
                              </Label>
                              {selectedDate && (
                                <span className="text-xs text-[#737373]">
                                  {formatDate(selectedDate)}
                                </span>
                              )}
                            </div>
                            {!selectedDate ? (
                              <p className="text-sm text-[#737373]">
                                Elige una fecha para ver horarios.
                              </p>
                            ) : timeSlots.length === 0 ? (
                              <p className="text-sm text-[#737373]">
                                No hay horarios disponibles para este día.
                              </p>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2">
                                {timeSlots.map((time: string) => (
                                  <button
                                    key={time}
                                    type="button"
                                    onClick={() => setSelectedTime(time)}
                                    aria-pressed={selectedTime === time}
                                    className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                                      selectedTime === time
                                        ? "border-[#171717] bg-[#171717] text-white"
                                        : "border-[#e5e5e5] bg-white text-[#171717] hover:border-[#a3a3a3] hover:bg-[#fafafa]"
                                    }`}
                                  >
                                    {time}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Step 3: Personal Information */}
                {step === 3 && (
                  <Card className="border-[#ebebeb] bg-white shadow-none">
                    <CardHeader className="border-b border-[#ebebeb]">
                      <CardTitle className="flex items-center space-x-2">
                        <User className="h-5 w-5" />
                        <span>Información Personal</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="firstName">Nombre</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) =>
                              handleInputChange("firstName", e.target.value)
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Apellido</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) =>
                              handleInputChange("lastName", e.target.value)
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              handleInputChange("email", e.target.value)
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Teléfono</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) =>
                              handleInputChange("phone", e.target.value)
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                          <Input
                            id="birthDate"
                            type="date"
                            value={formData.birthDate}
                            onChange={(e) =>
                              handleInputChange("birthDate", e.target.value)
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="gender">Género</Label>
                          <Select
                            onValueChange={(value) =>
                              handleInputChange("gender", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="masculino">
                                Masculino
                              </SelectItem>
                              <SelectItem value="femenino">Femenino</SelectItem>
                              <SelectItem value="otro">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="reason">Motivo de la consulta</Label>
                        <Textarea
                          id="reason"
                          placeholder="Describe brevemente el motivo de tu consulta..."
                          value={formData.reason}
                          onChange={(e) =>
                            handleInputChange("reason", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="insurance">
                          Seguro Médico (opcional)
                        </Label>
                        <Input
                          id="insurance"
                          placeholder="Nombre de tu seguro médico"
                          value={formData.insurance}
                          onChange={(e) =>
                            handleInputChange("insurance", e.target.value)
                          }
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="emergencyContact">
                            Contacto de Emergencia
                          </Label>
                          <Input
                            id="emergencyContact"
                            placeholder="Nombre completo"
                            value={formData.emergencyContact}
                            onChange={(e) =>
                              handleInputChange(
                                "emergencyContact",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergencyPhone">
                            Teléfono de Emergencia
                          </Label>
                          <Input
                            id="emergencyPhone"
                            placeholder="Número de teléfono"
                            value={formData.emergencyPhone}
                            onChange={(e) =>
                              handleInputChange(
                                "emergencyPhone",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 4: Confirmation */}
                {step === 4 && (
                  <Card className="border-[#ebebeb] bg-white shadow-none">
                    <CardHeader className="border-b border-[#ebebeb]">
                      <CardTitle className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5" />
                        <span>Confirmar Cita</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="rounded-md border border-[#ebebeb] bg-[#fafafa] p-4">
                        <h3 className="mb-3 font-semibold">
                          Resumen de la Cita
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Servicio:</span>
                            <span className="font-medium">
                              {selectedServiceData?.name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fecha:</span>
                            <span className="font-medium">
                              {formatDate(selectedDate)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Hora:</span>
                            <span className="font-medium">{selectedTime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Duración:</span>
                            <span className="font-medium">
                              {selectedServiceData?.duration}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Precio:</span>
                            <span className="font-medium text-[#171717]">
                              {selectedServiceData?.price}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border border-[#ebebeb] bg-[#fafafa] p-4">
                        <h3 className="mb-3 font-semibold">
                          Información del Paciente
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Nombre:</span>
                            <span className="font-medium">
                              {formData.firstName} {formData.lastName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Email:</span>
                            <span className="font-medium">
                              {formData.email}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Teléfono:</span>
                            <span className="font-medium">
                              {formData.phone}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="terms"
                          checked={formData.terms}
                          onCheckedChange={(checked) =>
                            handleInputChange("terms", checked as boolean)
                          }
                        />
                        <Label htmlFor="terms" className="text-sm">
                          Acepto los términos y condiciones y la política de
                          privacidad
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>

              {submitError && (
                <p
                  className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {submitError}
                </p>
              )}

              {/* Navigation Buttons */}
              <div className="mt-6 flex justify-between">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                  >
                    Anterior
                  </Button>
                )}
                <Button
                  type="submit"
                  className="ml-auto"
                  disabled={
                    createAppointment.isPending ||
                    (step === 1 && !selectedService) ||
                    (step === 2 && (!selectedDate || !selectedTime)) ||
                    (step === 3 &&
                      (!formData.firstName ||
                        !formData.lastName ||
                        !formData.email ||
                        !formData.phone)) ||
                    (step === 4 && !formData.terms)
                  }
                >
                  {createAppointment.isPending
                    ? "Confirmando…"
                    : step === 4
                      ? "Confirmar Cita"
                      : "Siguiente"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
