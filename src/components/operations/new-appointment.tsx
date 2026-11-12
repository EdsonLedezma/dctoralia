"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Stethoscope,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { OperationsShell } from "./operations-shell";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { SearchableSelect } from "~/components/ui/searchable-select";
import { Skeleton } from "~/components/ui/skeleton";
import { TimeSlotPicker } from "~/components/ui/time-slot-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
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

const appointmentTypeKeywords: Record<string, string[]> = {
  "Consulta General": ["chequeo", "medicina general", "valoracion"],
  Control: ["revision", "seguimiento", "chequeo"],
  "Primera Consulta": ["nuevo paciente", "valoracion inicial"],
  Seguimiento: ["control", "revision", "segunda consulta"],
  Urgencia: ["urgente", "inmediato", "emergencia"],
  "Examen Médico": ["certificado", "evaluacion", "chequeo"],
  "Revisión de Resultados": ["laboratorio", "estudios", "analisis"],
};

const steps = [
  {
    title: "Paciente y servicio",
    shortTitle: "Paciente",
    description: "A quién y qué consulta",
  },
  {
    title: "Fecha y horario",
    shortTitle: "Horario",
    description: "Elige un espacio disponible",
  },
  {
    title: "Confirmación",
    shortTitle: "Detalles",
    description: "Completa los detalles",
  },
];

function mexicoToday(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Mexico_City",
  });
}

function dateFromKey(date: string): Date {
  // Keep the calendar date stable when the server normalizes it to UTC midnight.
  return new Date(`${date}T12:00:00Z`);
}

export function NewAppointment() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const {
    data: patientsData,
    isLoading: loadingPatients,
    isError: patientsError,
    refetch: refetchPatients,
  } = api.doctor.getMyPatients.useQuery({});
  const patients = patientsData?.result ?? [];
  const {
    data: servicesData,
    isLoading: loadingServices,
    isError: servicesError,
    refetch: refetchServices,
  } = api.services.getMyServices.useQuery();
  const { data: locationsData } = api.workspace.locations.list.useQuery();
  const locations = (locationsData?.result ?? []).filter(
    (location) => location.isActive,
  );
  const services = (servicesData?.result ?? []).filter(
    (service) => service.isActive,
  );
  const createAppointment = api.appointments.create.useMutation();
  const utils = api.useUtils();
  const [step, setStep] = useState(0);
  const submittingRef = useRef(false);
  const [formData, setFormData] = useState({
    patientId: "",
    serviceId: "",
    locationId: "",
    date: "",
    time: "",
    reason: "",
    notes: "",
    severity: "LOW" as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  });
  const [error, setError] = useState<string | null>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);
  const selectedService = services.find(
    (service) => service.id === formData.serviceId,
  );
  const selectedPatient = patients.find(
    (patient) => patient.id === formData.patientId,
  );
  const patientOptions = patients.map((patient) => ({
    value: patient.id,
    label: patient.user.name || patient.id,
    description: patient.user.email,
    keywords: [patient.phone],
  }));
  const serviceOptions = services.map((service) => ({
    value: service.id,
    label: service.name,
    description: `${service.duration} min${service.description ? ` · ${service.description}` : ""}`,
    keywords: service.description ? [service.description] : [],
  }));
  const locationOptions = [
    {
      value: "none",
      label: "Sin ubicación asignada",
      keywords: ["ninguna", "remoto"],
    },
    ...locations.map((location) => ({
      value: location.id,
      label: location.name,
    })),
  ];
  const reasonOptions = appointmentTypes.map((type) => ({
    value: type,
    label: type,
    keywords: appointmentTypeKeywords[type] ?? [],
  }));
  const severityOptions = [
    { value: "LOW", label: "Normal", keywords: ["baja", "rutina"] },
    { value: "MEDIUM", label: "Media", keywords: ["moderada"] },
    { value: "HIGH", label: "Alta", keywords: ["prioritaria"] },
    { value: "CRITICAL", label: "Urgente", keywords: ["critica", "inmediata"] },
  ];
  const bookingSlotsQuery = api.appointments.bookingSlots.useQuery(
    {
      serviceId: formData.serviceId,
      date: formData.date ? dateFromKey(formData.date) : new Date(),
    },
    { enabled: Boolean(formData.serviceId && formData.date) },
  );
  const bookingSlots = bookingSlotsQuery.data?.result ?? [];

  useEffect(() => {
    if (stepContentRef.current) stepContentRef.current.scrollTop = 0;
  }, [step]);

  const updateForm = (field: keyof typeof formData, value: string) => {
    setError(null);
    setFormData((current) => ({
      ...current,
      [field]: value,
      ...(field === "date" || field === "serviceId" ? { time: "" } : {}),
    }));
  };

  const goToNextStep = () => {
    setError(null);
    if (
      step === 0 &&
      (!selectedPatient ||
        !selectedService ||
        patientsError ||
        servicesError ||
        patientsData?.error ||
        servicesData?.error)
    ) {
      setError("Selecciona un paciente y el servicio de la consulta.");
      return;
    }
    if (
      step === 1 &&
      (!formData.date ||
        !bookingSlots.includes(formData.time) ||
        bookingSlotsQuery.isFetching ||
        bookingSlotsQuery.isError ||
        bookingSlotsQuery.data?.error)
    ) {
      setError("Selecciona una fecha y un horario disponible.");
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step !== 2 || submittingRef.current) return;
    setError(null);
    if (
      !selectedPatient ||
      !selectedService ||
      bookingSlotsQuery.isFetching ||
      bookingSlotsQuery.isError ||
      bookingSlotsQuery.data?.error ||
      !bookingSlots.includes(formData.time) ||
      !formData.patientId ||
      !formData.serviceId ||
      !formData.date ||
      !formData.time ||
      !formData.reason
    ) {
      setError("Completa los datos necesarios antes de agendar.");
      return;
    }

    submittingRef.current = true;
    try {
      const response = await createAppointment.mutateAsync({
        patientId: formData.patientId,
        serviceId: formData.serviceId,
        locationId: formData.locationId || undefined,
        date: dateFromKey(formData.date),
        time: formData.time,
        reason: formData.reason,
        notes: formData.notes,
        severity: formData.severity,
      });
      if (response.status === 409) {
        setStep(1);
        setFormData((current) => ({ ...current, time: "" }));
        await bookingSlotsQuery.refetch();
      }
      unwrapTrpcResult(response);
      toast.success("Cita creada correctamente");
      await utils.appointments.listMine.invalidate();
      router.push("/dashboard/appointments");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo crear la cita.";
      setError(message);
      toast.error(message);
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <OperationsShell>
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !submittingRef.current)
              router.replace("/dashboard/appointments");
          }}
        >
          <DialogContent className="inset-x-0 top-auto bottom-0 left-0 flex h-[min(94dvh,760px)] max-h-[94dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-b-0 p-0 sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:h-[min(88dvh,760px)] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:p-0">
            <DialogHeader className="border-border shrink-0 border-b px-5 py-4 pr-14 sm:px-6 sm:py-5">
              <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
                Agenda · Nueva cita
              </p>
              <DialogTitle className="text-foreground mt-1 text-xl tracking-tight">
                Agendar paciente
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-5">
                Programa una cita con horarios calculados desde tu jornada y tus
                servicios.
              </DialogDescription>
              <ol
                className="grid grid-cols-3 gap-1 pt-4 sm:gap-2"
                aria-label="Pasos para agendar"
              >
                {steps.map((item, index) => {
                  const complete = index < step;
                  const active = index === step;
                  return (
                    <li
                      key={item.title}
                      aria-current={active ? "step" : undefined}
                      className="flex min-w-0 items-center gap-1.5 sm:gap-2"
                    >
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                          complete || active
                            ? "border-border bg-accent text-foreground"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {complete ? <Check className="size-3.5" /> : index + 1}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`hidden truncate text-xs font-medium sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {item.title}
                        </span>
                        <span
                          className={`block truncate text-xs font-medium sm:hidden ${active ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {item.shortTitle}
                        </span>
                        <span className="text-muted-foreground hidden truncate text-xs sm:block">
                          {item.description}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </DialogHeader>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              {(patientsError ||
                servicesError ||
                patientsData?.error ||
                servicesData?.error) && (
                <div
                  role="alert"
                  className="border-border bg-muted mx-5 mt-4 rounded-xl border p-3 text-sm"
                >
                  <p>No pudimos cargar pacientes o servicios.</p>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => {
                      void refetchPatients();
                      void refetchServices();
                    }}
                  >
                    Reintentar datos
                  </Button>
                </div>
              )}
              <div
                ref={stepContentRef}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.section
                    key={step}
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, transform: "translateY(6px)" }
                    }
                    animate={{ opacity: 1, transform: "translateY(0px)" }}
                    exit={
                      shouldReduceMotion
                        ? undefined
                        : { opacity: 0, transform: "translateY(-4px)" }
                    }
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.18,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="space-y-4"
                  >
                    {step === 0 && (
                      <>
                        <section className="material-card border-border bg-card rounded-3xl border p-4 sm:p-5">
                          <div className="mb-4 flex items-center gap-3">
                            <span className="bg-muted text-foreground flex size-9 items-center justify-center rounded-lg">
                              <UserRound className="size-4" />
                            </span>
                            <div>
                              <h2 className="text-foreground text-sm font-semibold">
                                Paciente
                              </h2>
                              <p className="text-muted-foreground text-xs">
                                Elige a quién atenderás.
                              </p>
                            </div>
                          </div>
                          <Label htmlFor="patient">Paciente</Label>
                          <SearchableSelect
                            id="patient"
                            label="Paciente"
                            value={formData.patientId}
                            onValueChange={(value) =>
                              updateForm("patientId", value)
                            }
                            options={patientOptions}
                            disabled={loadingPatients}
                            placeholder={
                              loadingPatients
                                ? "Cargando pacientes…"
                                : "Buscar paciente en tu lista"
                            }
                            searchPlaceholder="Nombre, correo o teléfono"
                            emptyMessage="No encontramos ese paciente."
                            className="mt-2"
                          />
                          {!loadingPatients && patients.length === 0 && (
                            <div className="bg-background mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-3">
                              <p className="text-muted-foreground text-sm">
                                Aún no tienes pacientes registrados.
                              </p>
                              <Button
                                asChild
                                type="button"
                                variant="outline"
                                size="sm"
                              >
                                <Link href="/dashboard/patients/new">
                                  Registrar paciente
                                </Link>
                              </Button>
                            </div>
                          )}
                        </section>

                        <section className="material-card border-border bg-card rounded-3xl border p-4 sm:p-5">
                          <div className="mb-4 flex items-center gap-3">
                            <span className="bg-muted text-foreground flex size-9 items-center justify-center rounded-lg">
                              <Stethoscope className="size-4" />
                            </span>
                            <div>
                              <h2 className="text-foreground text-sm font-semibold">
                                Servicio
                              </h2>
                              <p className="text-muted-foreground text-xs">
                                La duración define los horarios disponibles.
                              </p>
                            </div>
                          </div>
                          <Label htmlFor="service">Tipo de consulta</Label>
                          <SearchableSelect
                            id="service"
                            label="Tipo de consulta"
                            value={formData.serviceId}
                            onValueChange={(value) => {
                              setFormData((current) => ({
                                ...current,
                                serviceId: value,
                                time: "",
                              }));
                              setError(null);
                            }}
                            options={serviceOptions}
                            disabled={loadingServices || services.length === 0}
                            placeholder={
                              loadingServices
                                ? "Cargando servicios…"
                                : "Buscar tipo de consulta"
                            }
                            searchPlaceholder="Nombre o descripción del servicio"
                            emptyMessage="No encontramos ese servicio."
                            className="mt-2"
                          />
                          {!loadingServices && services.length === 0 && (
                            <div className="bg-background mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-3">
                              <p className="text-muted-foreground text-sm">
                                Crea un servicio para poder agendar.
                              </p>
                              <Button
                                asChild
                                type="button"
                                variant="outline"
                                size="sm"
                              >
                                <Link href="/dashboard/services">
                                  Ir a servicios
                                </Link>
                              </Button>
                            </div>
                          )}
                          {selectedService && (
                            <div className="bg-background mt-3 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm">
                              <span className="text-muted-foreground">
                                {selectedService.description ||
                                  selectedService.name}
                              </span>
                              <span className="text-muted-foreground ml-3 shrink-0 font-mono text-xs">
                                {selectedService.duration} min
                              </span>
                            </div>
                          )}
                        </section>

                        {locations.length > 0 && (
                          <section className="material-card border-border bg-card rounded-3xl border p-4 sm:p-5">
                            <div className="mb-4">
                              <h2 className="text-foreground text-sm font-semibold">
                                Ubicación
                              </h2>
                              <p className="text-muted-foreground mt-1 text-xs">
                                Asigna el consultorio donde atenderás esta cita.
                              </p>
                            </div>
                            <Label htmlFor="appointment-location">
                              Consultorio{" "}
                              <span className="text-muted-foreground">
                                (opcional)
                              </span>
                            </Label>
                            <SearchableSelect
                              id="appointment-location"
                              label="Consultorio"
                              value={formData.locationId || "none"}
                              onValueChange={(value) =>
                                updateForm(
                                  "locationId",
                                  value === "none" ? "" : value,
                                )
                              }
                              options={locationOptions}
                              placeholder="Sin ubicación asignada"
                              searchPlaceholder="Buscar consultorio"
                              className="mt-2"
                            />
                          </section>
                        )}
                      </>
                    )}

                    {step === 1 && (
                      <section className="material-card border-border bg-card rounded-3xl border p-4 sm:p-5">
                        <div className="mb-5 flex items-center gap-3">
                          <span className="bg-muted text-foreground flex size-9 items-center justify-center rounded-lg">
                            <CalendarDays className="size-4" />
                          </span>
                          <div>
                            <h2 className="text-foreground text-sm font-semibold">
                              Fecha y horario
                            </h2>
                            <p className="text-muted-foreground text-xs">
                              {selectedService
                                ? `${selectedService.name} · ${selectedService.duration} minutos`
                                : "Selecciona un servicio para consultar horarios."}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <DatePicker
                            label="Fecha de la cita"
                            value={formData.date}
                            min={mexicoToday()}
                            disabled={!selectedService}
                            onValueChange={(date) => updateForm("date", date)}
                          />
                        </div>
                        <div className="mt-5 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <Label>Horarios disponibles</Label>
                            {formData.date && !bookingSlotsQuery.isLoading && (
                              <span className="text-muted-foreground text-xs">
                                {bookingSlots.length} espacios
                              </span>
                            )}
                          </div>
                          {!formData.serviceId || !formData.date ? (
                            <p className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-5 text-sm">
                              Selecciona un servicio y una fecha para ver los
                              espacios libres.
                            </p>
                          ) : bookingSlotsQuery.isLoading ? (
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                              {Array.from({ length: 8 }).map((_, index) => (
                                <Skeleton
                                  key={index}
                                  className="h-10 rounded-md"
                                />
                              ))}
                            </div>
                          ) : bookingSlotsQuery.isError ||
                            bookingSlotsQuery.data?.error ? (
                            <div className="border-border bg-muted text-foreground rounded-lg border p-3 text-sm">
                              <p>
                                {bookingSlotsQuery.data?.message ??
                                  "No pudimos consultar tu agenda."}
                              </p>
                              <Button
                                type="button"
                                variant="link"
                                className="text-foreground h-auto px-0 py-1"
                                onClick={() => void bookingSlotsQuery.refetch()}
                              >
                                Intentar de nuevo
                              </Button>
                            </div>
                          ) : (
                            <TimeSlotPicker
                              slots={bookingSlots}
                              selectedTime={formData.time || null}
                              onSelectTime={(time) => updateForm("time", time)}
                              emptyMessage="No quedan horarios libres para este servicio en esa fecha."
                            />
                          )}
                        </div>
                      </section>
                    )}

                    {step === 2 && (
                      <>
                        <section className="material-card border-border bg-card rounded-3xl border p-4 sm:p-5">
                          <div className="mb-4 flex items-center gap-3">
                            <span className="bg-muted text-foreground flex size-9 items-center justify-center rounded-lg">
                              <FileText className="size-4" />
                            </span>
                            <div>
                              <h2 className="text-foreground text-sm font-semibold">
                                Detalles de la consulta
                              </h2>
                              <p className="text-muted-foreground text-xs">
                                Esta información quedará en el registro de la
                                cita.
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="reason">Motivo de la cita</Label>
                              <SearchableSelect
                                id="reason"
                                label="Motivo de la cita"
                                value={formData.reason}
                                onValueChange={(value) =>
                                  updateForm("reason", value)
                                }
                                options={reasonOptions}
                                placeholder="Seleccionar motivo"
                                searchPlaceholder="Ej. control, laboratorio, urgencia"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="severity">
                                Prioridad clínica
                              </Label>
                              <SearchableSelect
                                id="severity"
                                label="Prioridad clínica"
                                value={formData.severity}
                                onValueChange={(value) =>
                                  updateForm("severity", value)
                                }
                                options={severityOptions}
                                placeholder="Seleccionar prioridad"
                                searchPlaceholder="Buscar prioridad"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="notes">
                                Nota para el equipo (opcional)
                              </Label>
                              <Textarea
                                id="notes"
                                placeholder="Contexto breve para preparar la consulta"
                                value={formData.notes}
                                onChange={(event) =>
                                  updateForm("notes", event.target.value)
                                }
                                rows={3}
                                maxLength={2000}
                              />
                            </div>
                          </div>
                        </section>
                        <section className="border-border bg-background rounded-xl border p-4">
                          <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                            Resumen de la cita
                          </h2>
                          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                            <dt className="text-muted-foreground">Paciente</dt>
                            <dd className="text-foreground truncate text-right font-medium">
                              {selectedPatient?.user.name || "Paciente"}
                            </dd>
                            <dt className="text-muted-foreground">Servicio</dt>
                            <dd className="text-foreground truncate text-right font-medium">
                              {selectedService?.name || "Servicio"}
                            </dd>
                            <dt className="text-muted-foreground">
                              Fecha y hora
                            </dt>
                            <dd className="text-foreground text-right font-mono text-xs">
                              {formData.date} · {formData.time}
                            </dd>
                            <dt className="text-muted-foreground">Duración</dt>
                            <dd className="text-foreground text-right">
                              {selectedService?.duration ?? "—"} min
                            </dd>
                          </dl>
                        </section>
                      </>
                    )}
                  </motion.section>
                </AnimatePresence>
              </div>

              {error && (
                <p
                  role="alert"
                  className="border-border bg-muted text-foreground mx-5 mb-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm sm:mx-6"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {error}
                </p>
              )}

              <footer className="border-border bg-card flex shrink-0 flex-col-reverse gap-2 border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground min-h-11 w-full sm:w-auto"
                  onClick={() =>
                    step > 0
                      ? setStep((current) => current - 1)
                      : router.replace("/dashboard/appointments")
                  }
                  disabled={createAppointment.isPending}
                >
                  {step > 0 ? (
                    <>
                      <ChevronLeft className="mr-1 size-4" /> Volver
                    </>
                  ) : (
                    "Cancelar"
                  )}
                </Button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  {step < steps.length - 1 ? (
                    <Button
                      key="continue-step"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        goToNextStep();
                      }}
                      className="min-h-11"
                      disabled={
                        (step === 0 && (loadingPatients || loadingServices)) ||
                        (step === 1 &&
                          (!formData.time || bookingSlotsQuery.isFetching))
                      }
                    >
                      Continuar <ChevronRight className="ml-1 size-4" />
                    </Button>
                  ) : (
                    <Button
                      key="confirm-appointment"
                      type="submit"
                      aria-busy={createAppointment.isPending}
                      className="min-h-11 w-full"
                      disabled={
                        createAppointment.isPending ||
                        !formData.reason ||
                        !selectedService ||
                        !selectedPatient ||
                        !bookingSlots.includes(formData.time) ||
                        bookingSlotsQuery.isFetching ||
                        bookingSlotsQuery.isError ||
                        Boolean(bookingSlotsQuery.data?.error)
                      }
                    >
                      <Clock3 className="mr-2 size-4" />
                      {createAppointment.isPending
                        ? "Agendando…"
                        : "Confirmar cita"}
                    </Button>
                  )}
                </div>
              </footer>
            </form>
          </DialogContent>
        </Dialog>
      </OperationsShell>
    </DashboardWrapper>
  );
}
