"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, CalendarDays, Check } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { directoryReturnHref } from "~/components/doctors/directory-navigation";
import { specialtyLabel } from "~/components/doctors/directory-model";
import { AppointmentLocation } from "~/components/appointments/appointment-location";
import { BookingFrame } from "./booking-frame";
import { ServicePicker } from "./service-picker";
import {
  ConsultationDetailsForm,
  type ConsultationDetails,
} from "./consultation-details";
import { authPageHref } from "~/components/auth/auth-navigation";
import { DatePicker } from "~/components/ui/date-picker";
import { TimeSlotPicker } from "~/components/ui/time-slot-picker";
import { parseCalendarDate } from "~/components/ui/date-picker.utils";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

const steps = ["Consulta", "Fecha y hora", "Confirmar"] as const;
const mexicoDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const dateLabel = (value: string) =>
  format(new Date(`${value}T12:00:00`), "EEEE d 'de' MMMM", { locale: es });

export function BookingView() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const searchParams = useSearchParams();
  const directoryHref = directoryReturnHref(searchParams.get("from"));
  const { data: session, status } = useSession();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [details, setDetails] = useState<ConsultationDetails>({
    symptoms: "",
    allergies: "",
    medications: "",
    context: "",
  });
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactConsent, setContactConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedId, setBookedId] = useState<string | null>(null);
  const [bookedLocation, setBookedLocation] = useState<{
    name: string;
    address: string;
    directions: string | null;
    mapsUrl: string;
  } | null>(null);
  const [today] = useState(mexicoDate);
  const initializedDoctorId = useRef<string | null>(null);
  const submitting = useRef(false);
  const lastDay = useMemo(() => {
    const end = new Date(`${today}T12:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 30);
    return end.toISOString().slice(0, 10);
  }, [today]);
  const doctorQuery = api.doctor.getById.useQuery(
    { id: doctorId },
    { enabled: Boolean(doctorId) },
  );
  const servicesQuery = api.services.publicGetByDoctor.useQuery(
    { doctorId },
    { enabled: Boolean(doctorId) },
  );
  const profileQuery = api.auth.getProfile.useQuery(undefined, {
    enabled: status === "authenticated",
    retry: false,
  });
  useEffect(() => {
    if (session?.user.role === "PATIENT") {
      setContactName((previous) => previous || session.user.name || "");
      setContactPhone(
        (previous) =>
          previous || profileQuery.data?.result?.patient?.phone || "",
      );
    }
  }, [session, profileQuery.data?.result?.patient?.phone]);
  const slotsQuery = api.schedule.getAvailableSlots.useQuery(
    {
      doctorId,
      serviceId: serviceId || undefined,
      startDate: today,
      endDate: lastDay,
    },
    { enabled: Boolean(doctorId && serviceId) },
  );
  const create = api.guestBooking.publicCreate.useMutation();
  const doctor = doctorQuery.data?.result;
  const services = useMemo(
    () => servicesQuery.data?.result ?? [],
    [servicesQuery.data?.result],
  );
  const service = services.find((item) => item.id === serviceId);
  useEffect(() => {
    if (initializedDoctorId.current === doctorId || services.length === 0)
      return;
    if (initializedDoctorId.current !== null) {
      setStep(0);
      setServiceId("");
      setDate("");
      setTime("");
      setBookedId(null);
      setBookedLocation(null);
      setError(null);
      setDetails({ symptoms: "", allergies: "", medications: "", context: "" });
    }
    initializedDoctorId.current = doctorId;
    const params = searchParams;
    const suggestedServiceId = params.get("serviceId");
    if (!services.some((item) => item.id === suggestedServiceId)) return;
    setServiceId(suggestedServiceId ?? "");
    const suggestedDate = params.get("date") ?? "";
    const suggestedTime = params.get("time") ?? "";
    if (
      parseCalendarDate(suggestedDate) &&
      suggestedDate >= today &&
      suggestedDate <= lastDay &&
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(suggestedTime)
    ) {
      setDate(suggestedDate);
      setTime(suggestedTime);
      if (params.get("resume") === "1") setStep(1);
    }
  }, [doctorId, services, today, lastDay, searchParams]);
  const dates = [
    ...new Set((slotsQuery.data?.result ?? []).map((slot) => slot.date)),
  ].sort();
  const times = (slotsQuery.data?.result ?? [])
    .filter((slot) => slot.date === date)
    .map((slot) => slot.time);
  const selectedSlot = slotsQuery.data?.result?.find(
    (slot) => slot.date === date && slot.time === time,
  );
  const selectedLocation = bookedLocation ?? selectedSlot?.location;
  const selectedSlotAvailable = Boolean(date && time && times.includes(time));
  const availabilityReady =
    !slotsQuery.isFetching && !slotsQuery.error && !slotsQuery.data?.error;
  const returnPath = `/book-appointment/${doctorId}?${new URLSearchParams({ serviceId, date, time, resume: "1", from: directoryHref })}`;
  const loginHref = authPageHref("/login", returnPath);
  const canAdvance =
    step === 0
      ? Boolean(service)
      : step === 1
        ? selectedSlotAvailable && availabilityReady
        : Boolean(
            service &&
              contactName.trim().length >= 2 &&
              contactPhone.trim().length >= 7,
          ) &&
          details.symptoms.trim().length >= 3 &&
          selectedSlotAvailable &&
          availabilityReady;

  async function submit() {
    if (create.isPending || submitting.current) return;
    setError(null);
    if (!canAdvance) return;
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    submitting.current = true;
    try {
      const response = await create.mutateAsync({
        name: contactName.trim(),
        phone: contactPhone,
        contactConsent,
        doctorId,
        serviceId,
        date,
        time,
        intake: {
          symptoms: details.symptoms.trim(),
          allergies: details.allergies.trim(),
          medications: details.medications.trim(),
          context: details.context.trim(),
        },
      });
      if (response.error && response.status === 409) {
        void slotsQuery.refetch();
        setStep(1);
      }
      const appointment = unwrapTrpcResult(response);
      setBookedId(appointment.id);
      setBookedLocation(selectedLocation ?? null);
      toast.success("Solicitud enviada al consultorio");
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "No pudimos reservar ese horario.";
      setError(message);
      if (message.toLowerCase().includes("horario")) {
        void slotsQuery.refetch();
        setStep(1);
      }
    } finally {
      submitting.current = false;
    }
  }

  return (
    <BookingFrame
      authenticated={status === "authenticated"}
      role={session?.user?.role === "DOCTOR" ? "DOCTOR" : "PATIENT"}
      portalHref={loginHref}
    >
      <div className="bg-background text-foreground min-h-screen px-4 py-7 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <Link
            href={
              session?.user?.role === "PATIENT" ? directoryHref : "/doctores"
            }
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="size-4" />{" "}
            {session?.user?.role === "PATIENT"
              ? "Volver a doctores"
              : "Volver a doctores"}
          </Link>
          <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
                Tu próxima consulta
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Agenda con tranquilidad.
              </h1>
              <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
                Elige un horario y cuéntale al médico lo esencial antes de
                llegar.
              </p>
              {bookedId ? (
                <motion.section
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-border bg-card mt-8 rounded-3xl border p-7 shadow-sm sm:p-9"
                >
                  <div className="bg-muted text-foreground flex size-12 items-center justify-center rounded-2xl">
                    <Check className="size-6" />
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                    Solicitud enviada
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    El consultorio recibió tu solicitud. Si autorizaste
                    mensajes, recibirás el aviso al confirmar el horario.
                  </p>
                  <div className="bg-muted mt-6 rounded-2xl p-4 text-sm">
                    <strong>{service?.name}</strong>
                    <p className="text-muted-foreground mt-1 capitalize">
                      {dateLabel(date)} · {time}
                    </p>
                  </div>
                  <Button asChild className="mt-6">
                    <Link
                      href={
                        session?.user.role === "PATIENT"
                          ? `/patient/appointments/${bookedId}`
                          : "/doctores"
                      }
                    >
                      {session?.user.role === "PATIENT"
                        ? "Ver mi solicitud"
                        : "Volver a doctores"}{" "}
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </motion.section>
              ) : (
                <section className="border-border bg-card mt-8 overflow-clip rounded-3xl border shadow-sm">
                  <div
                    className="border-border grid grid-cols-3 gap-2 border-b px-6 py-5 sm:px-8"
                    aria-label="Progreso de la reserva"
                  >
                    {steps.map((label, index) => (
                      <div key={label}>
                        <div
                          className={`h-1 rounded-full ${index <= step ? "bg-foreground" : "bg-muted"}`}
                        />
                        <p
                          className={`mt-2 text-xs font-medium ${index === step ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {String(index + 1).padStart(2, "0")} · {label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <motion.div
                    key={step}
                    initial={reduceMotion ? false : { opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="px-6 py-7 sm:px-8 sm:py-9"
                  >
                    {step === 0 && (
                      <>
                        <h2 className="text-xl font-semibold">
                          ¿Qué consulta necesitas?
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                          El precio y duración se muestran antes de reservar.
                        </p>
                        <div className="mt-6 space-y-3">
                          {doctorQuery.isLoading || servicesQuery.isLoading ? (
                            <p className="text-muted-foreground text-sm">
                              Cargando servicios…
                            </p>
                          ) : !doctor ||
                            doctorQuery.error ||
                            doctorQuery.data?.error ? (
                            <p
                              className="bg-background rounded-xl p-5 text-sm"
                              role="alert"
                            >
                              No encontramos a este doctor. Vuelve al directorio
                              para elegir otro.
                              {(doctorQuery.isError ||
                                Boolean(
                                  doctorQuery.data?.error &&
                                    doctorQuery.data.status >= 500,
                                )) && (
                                <Button
                                  className="mt-4"
                                  variant="outline"
                                  onClick={() => void doctorQuery.refetch()}
                                >
                                  Reintentar perfil
                                </Button>
                              )}
                            </p>
                          ) : servicesQuery.isError ||
                            servicesQuery.data?.error ? (
                            <div role="alert" className="space-y-3">
                              <p className="text-sm">
                                No pudimos cargar los servicios.
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => void servicesQuery.refetch()}
                                disabled={servicesQuery.isFetching}
                              >
                                Reintentar servicios
                              </Button>
                            </div>
                          ) : services.length === 0 ? (
                            <p className="bg-background rounded-xl p-5 text-sm">
                              Este doctor todavía no tiene consultas
                              disponibles.
                            </p>
                          ) : (
                            <ServicePicker
                              services={services}
                              value={serviceId}
                              onChange={(value) => {
                                setServiceId(value);
                                setDate("");
                                setTime("");
                                setError(null);
                              }}
                            />
                          )}
                        </div>
                      </>
                    )}
                    {step === 1 && (
                      <>
                        <h2 className="text-xl font-semibold">
                          Elige fecha y hora
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                          Disponibilidad del consultorio durante el próximo mes.
                        </p>
                        {slotsQuery.isLoading ? (
                          <p role="status" className="mt-6 text-sm">
                            Consultando disponibilidad…
                          </p>
                        ) : slotsQuery.error || slotsQuery.data?.error ? (
                          <div role="alert" className="mt-6 space-y-3">
                            <p className="text-sm">
                              No pudimos consultar los horarios.
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => void slotsQuery.refetch()}
                            >
                              Reintentar disponibilidad
                            </Button>
                          </div>
                        ) : dates.length === 0 ? (
                          <p
                            role="status"
                            className="bg-muted mt-6 rounded-xl p-5 text-sm"
                          >
                            No hay horarios libres en el próximo mes. Puedes
                            elegir otro doctor.
                          </p>
                        ) : (
                          <div className="mt-6 space-y-5">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">
                                Fecha de la consulta
                              </p>
                              <DatePicker
                                label="Fecha de la reserva"
                                value={date}
                                min={today}
                                max={lastDay}
                                availableDates={dates}
                                onValueChange={(value) => {
                                  setDate(value);
                                  setTime("");
                                  setError(null);
                                }}
                                className="w-full sm:w-auto"
                              />
                              <p className="text-muted-foreground text-xs">
                                Sólo puedes elegir días con horarios
                                disponibles.
                              </p>
                            </div>
                            {date && (
                              <>
                                <TimeSlotPicker
                                  slots={times}
                                  selectedTime={time}
                                  onSelectTime={(value) => {
                                    setTime(value);
                                    setError(null);
                                  }}
                                />
                                {time && !selectedSlotAvailable && (
                                  <p
                                    role="alert"
                                    className="bg-muted rounded-xl p-4 text-sm"
                                  >
                                    El horario sugerido ya no está libre. Elige
                                    otra hora.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {step === 2 && (
                      <>
                        <h2 className="text-xl font-semibold">
                          Prepara tu consulta
                        </h2>
                        <p className="text-muted-foreground mt-2 text-sm leading-6">
                          Revisa tu selección y comparte lo necesario para esta
                          consulta.
                        </p>
                        <div className="mt-6">
                          <div className="mb-5 grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="booking-name">Tu nombre</Label>
                              <Input
                                id="booking-name"
                                autoComplete="name"
                                value={contactName}
                                maxLength={120}
                                onChange={(event) =>
                                  setContactName(event.target.value)
                                }
                                disabled={create.isPending}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="booking-phone">
                                Teléfono con lada
                              </Label>
                              <Input
                                id="booking-phone"
                                type="tel"
                                autoComplete="tel"
                                value={contactPhone}
                                maxLength={40}
                                onChange={(event) =>
                                  setContactPhone(event.target.value)
                                }
                                disabled={create.isPending}
                              />
                            </div>
                          </div>
                          <p className="text-muted-foreground mb-4 text-xs leading-5">
                            No necesitas crear una cuenta para solicitar tu
                            cita. Tu doctor podrá invitarte a tu espacio de
                            salud después de atenderte.
                          </p>
                          <ConsultationDetailsForm
                            value={details}
                            onChange={setDetails}
                            disabled={create.isPending}
                          />
                          <label className="mt-4 flex min-h-11 items-start gap-3 text-xs leading-5">
                            <Checkbox
                              checked={contactConsent}
                              onCheckedChange={(value) =>
                                setContactConsent(value === true)
                              }
                              disabled={create.isPending}
                            />
                            <span>
                              Autorizo recibir por WhatsApp avisos de mi cita e
                              invitación al portal en este número. Puedo
                              reservar sin aceptar estos mensajes.
                            </span>
                          </label>
                        </div>
                      </>
                    )}
                  </motion.div>
                  {error && (
                    <p
                      className="bg-muted text-foreground mx-6 mb-4 rounded-xl px-4 py-3 text-sm"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}
                  <div
                    data-booking-actions
                    className={`bg-card/95 border-border sticky z-10 flex items-center justify-between gap-3 border-t px-4 py-4 backdrop-blur-xl sm:px-8 ${status === "authenticated" ? "bottom-24 md:bottom-0" : "bottom-0"}`}
                  >
                    {step > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={create.isPending}
                        onClick={() => {
                          setError(null);
                          setStep(step - 1);
                        }}
                      >
                        Atrás
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Sin cargos por explorar horarios
                      </span>
                    )}
                    <Button
                      className="min-w-0 flex-1 sm:flex-none"
                      type="button"
                      onClick={() => void submit()}
                      disabled={!canAdvance || create.isPending}
                    >
                      {create.isPending
                        ? "Enviando…"
                        : step === 2
                          ? "Solicitar cita"
                          : "Continuar"}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </div>
                </section>
              )}
            </div>
            <aside className="border-border bg-card rounded-3xl border p-6 lg:sticky lg:top-6">
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.13em] uppercase">
                Tu especialista
              </p>
              {doctor ? (
                <div className="mt-5 flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarFallback>
                      {doctor.user?.name?.charAt(0) ?? "D"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{doctor.user?.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {specialtyLabel(doctor.specialty)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground mt-5 text-sm">
                  {doctorQuery.isLoading
                    ? "Cargando doctor…"
                    : "Doctor no disponible"}
                </p>
              )}
              <div className="border-border mt-6 border-t pt-5 text-sm">
                {service && (
                  <p className="font-medium">
                    {service.name} · {service.duration} min · $
                    {Number(service.price).toLocaleString("es-MX")}
                  </p>
                )}
                {date && (
                  <p className="text-muted-foreground mt-2 flex items-center gap-2 capitalize">
                    <CalendarDays className="size-4" /> {dateLabel(date)}{" "}
                    {time && `· ${time}`}
                  </p>
                )}
              </div>
              {selectedLocation && (
                <div className="mt-5 border-t pt-4">
                  <AppointmentLocation location={selectedLocation} />
                </div>
              )}
              <p className="text-muted-foreground mt-6 text-xs leading-5">
                La solicitud queda pendiente hasta que el consultorio la
                confirme.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </BookingFrame>
  );
}
