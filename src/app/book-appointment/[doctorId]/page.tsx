"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { ProductShell } from "~/components/shell/product-shell";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

const steps = ["Consulta", "Disponibilidad", "Tu brief"] as const;
const mexicoDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const dateLabel = (value: string) =>
  format(new Date(`${value}T12:00:00`), "EEEE d 'de' MMMM", { locale: es });

export default function BookAppointmentPage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const { status } = useSession();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bookedId, setBookedId] = useState<string | null>(null);
  const [today] = useState(mexicoDate);
  const initializedDoctorId = useRef<string | null>(null);
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
  const slotsQuery = api.schedule.getAvailableSlots.useQuery(
    {
      doctorId,
      serviceId: serviceId || undefined,
      startDate: today,
      endDate: lastDay,
    },
    { enabled: Boolean(doctorId && serviceId) },
  );
  const create = api.appointments.create.useMutation();
  const doctor = doctorQuery.data?.result;
  const services = useMemo(
    () => servicesQuery.data?.result ?? [],
    [servicesQuery.data?.result],
  );
  const service = services.find((item) => item.id === serviceId);
  useEffect(() => {
    if (initializedDoctorId.current === doctorId || services.length === 0)
      return;
    initializedDoctorId.current = doctorId;
    const params = new URLSearchParams(window.location.search);
    const suggestedServiceId = params.get("serviceId");
    if (!services.some((item) => item.id === suggestedServiceId)) return;
    setServiceId(suggestedServiceId ?? "");
    const suggestedDate = params.get("date") ?? "";
    const suggestedTime = params.get("time") ?? "";
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(suggestedDate) &&
      /^\d{2}:\d{2}$/.test(suggestedTime)
    ) {
      setDate(suggestedDate);
      setTime(suggestedTime);
    }
  }, [doctorId, services]);
  const dates = [
    ...new Set((slotsQuery.data?.result ?? []).map((slot) => slot.date)),
  ].sort();
  const times = (slotsQuery.data?.result ?? [])
    .filter((slot) => slot.date === date)
    .map((slot) => slot.time);
  const selectedSlotAvailable = Boolean(date && time && times.includes(time));
  const canAdvance =
    step === 0
      ? Boolean(serviceId)
      : step === 1
        ? selectedSlotAvailable
        : symptoms.trim().length >= 3;

  async function submit() {
    setError(null);
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    const patientId = profileQuery.data?.result?.patient?.id;
    if (status !== "authenticated" || !patientId) {
      setError("Inicia sesión como paciente para enviar tu solicitud.");
      return;
    }
    try {
      const appointment = unwrapTrpcResult(
        await create.mutateAsync({
          patientId,
          doctorId,
          serviceId,
          date: new Date(`${date}T12:00:00.000Z`),
          time,
          reason: symptoms.trim().slice(0, 500),
          intake: {
            symptoms: symptoms.trim(),
            allergies: allergies.trim(),
            medications: medications.trim(),
            context: context.trim(),
          },
        }),
      );
      setBookedId(appointment.id);
      toast.success("Solicitud enviada al consultorio");
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "No pudimos reservar ese horario.";
      setError(message);
      if (message.toLowerCase().includes("horario")) void slotsQuery.refetch();
    }
  }

  return (
    <ProductShell role="PATIENT">
      <main className="min-h-screen bg-[#f7f8f6] px-4 py-7 text-[#18332c] sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/patient/doctors"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#557067] hover:text-[#18332c]"
          >
            <ArrowLeft className="size-4" /> Volver a doctores
          </Link>
          <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#5e8b7c] uppercase">
                Tu próxima consulta
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Agenda con tranquilidad.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#62736d]">
                Elige un horario y cuéntale al médico lo esencial antes de
                llegar.
              </p>
              {bookedId ? (
                <motion.section
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 rounded-3xl border border-[#dce9e2] bg-white p-7 shadow-[0_14px_40px_-30px_#254d3d] sm:p-9"
                >
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[#e5f3ea] text-[#268062]">
                    <Check className="size-6" />
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                    Solicitud enviada
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#62736d]">
                    El consultorio recibió tu cita y el brief médico. Te
                    avisaremos cuando confirme el horario.
                  </p>
                  <div className="mt-6 rounded-2xl bg-[#f4f8f5] p-4 text-sm">
                    <strong>{service?.name}</strong>
                    <p className="mt-1 text-[#62736d] capitalize">
                      {dateLabel(date)} · {time}
                    </p>
                  </div>
                  <Link
                    href={`/patient/appointments/${bookedId}`}
                    className="mt-6 inline-flex"
                  >
                    <Button>
                      Ver mi solicitud <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                </motion.section>
              ) : (
                <section className="mt-8 overflow-hidden rounded-3xl border border-[#e1e9e3] bg-white shadow-[0_18px_55px_-42px_#254d3d]">
                  <div
                    className="grid grid-cols-3 gap-2 border-b border-[#edf1ed] px-6 py-5 sm:px-8"
                    aria-label="Progreso de la reserva"
                  >
                    {steps.map((label, index) => (
                      <div key={label}>
                        <div
                          className={`h-1 rounded-full ${index <= step ? "bg-[#238a69]" : "bg-[#e8eee9]"}`}
                        />
                        <p
                          className={`mt-2 text-xs font-medium ${index === step ? "text-[#18332c]" : "text-[#8b9a92]"}`}
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
                        <p className="mt-1 text-sm text-[#708078]">
                          El precio y duración se muestran antes de reservar.
                        </p>
                        <div className="mt-6 space-y-3">
                          {doctorQuery.isLoading || servicesQuery.isLoading ? (
                            <p className="text-sm text-[#708078]">
                              Cargando servicios…
                            </p>
                          ) : !doctor ||
                            doctorQuery.error ||
                            doctorQuery.data?.error ? (
                            <p
                              className="rounded-xl bg-[#f7f8f6] p-5 text-sm"
                              role="alert"
                            >
                              No encontramos a este doctor. Vuelve al directorio
                              para elegir otro.
                            </p>
                          ) : services.length === 0 ? (
                            <p className="rounded-xl bg-[#f7f8f6] p-5 text-sm">
                              Este doctor todavía no tiene consultas
                              disponibles.
                            </p>
                          ) : (
                            services.map((item) => (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => {
                                  setServiceId(item.id);
                                  setDate("");
                                  setTime("");
                                }}
                                aria-pressed={serviceId === item.id}
                                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.99] ${serviceId === item.id ? "border-[#56a98b] bg-[#f0f9f3]" : "border-[#e5ebe5] hover:border-[#b8d1c1]"}`}
                              >
                                <span>
                                  <strong className="block text-sm">
                                    {item.name}
                                  </strong>
                                  <span className="mt-1 flex items-center gap-1 text-xs text-[#708078]">
                                    <Clock3 className="size-3.5" />{" "}
                                    {item.duration} min
                                  </span>
                                </span>
                                <span className="text-sm font-semibold">
                                  ${Number(item.price).toLocaleString("es-MX")}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                    {step === 1 && (
                      <>
                        <h2 className="text-xl font-semibold">
                          Elige fecha y hora
                        </h2>
                        <p className="mt-1 text-sm text-[#708078]">
                          Horarios del consultorio durante el próximo mes.
                        </p>
                        {slotsQuery.isLoading ? (
                          <p className="mt-6 text-sm">
                            Consultando disponibilidad…
                          </p>
                        ) : slotsQuery.error || slotsQuery.data?.error ? (
                          <p className="mt-6 text-sm text-red-700" role="alert">
                            No pudimos consultar los horarios. Vuelve a
                            intentarlo.
                          </p>
                        ) : dates.length === 0 ? (
                          <p className="mt-6 rounded-xl bg-[#f7f8f6] p-5 text-sm">
                            No hay horarios libres en el próximo mes. Puedes
                            elegir otro doctor.
                          </p>
                        ) : (
                          <>
                            <div
                              className="mt-6 flex gap-2 overflow-x-auto pb-2"
                              aria-label="Fechas disponibles"
                            >
                              {dates.map((item) => (
                                <button
                                  type="button"
                                  key={item}
                                  onClick={() => {
                                    setDate(item);
                                    setTime("");
                                  }}
                                  aria-pressed={date === item}
                                  className={`min-w-28 rounded-2xl border px-4 py-3 text-left text-sm capitalize transition-colors ${date === item ? "border-[#238a69] bg-[#eaf6ee]" : "border-[#e5ebe5] hover:bg-[#f7faf7]"}`}
                                >
                                  {dateLabel(item)}
                                </button>
                              ))}
                            </div>
                            {date && (
                              <>
                                {time && !selectedSlotAvailable && (
                                  <p
                                    className="mt-4 rounded-xl bg-[#fff4e8] p-3 text-sm text-[#8a4c13]"
                                    role="alert"
                                  >
                                    El horario sugerido ya no está libre. Elige
                                    otro de la lista.
                                  </p>
                                )}
                                <p className="mt-6 text-sm font-semibold">
                                  Horarios disponibles
                                </p>
                                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                  {times.map((item) => (
                                    <button
                                      type="button"
                                      key={item}
                                      onClick={() => setTime(item)}
                                      aria-pressed={time === item}
                                      className={`min-h-11 rounded-xl border text-sm font-medium transition-colors ${time === item ? "border-[#238a69] bg-[#238a69] text-white" : "border-[#e5ebe5] hover:border-[#a7cab5]"}`}
                                    >
                                      {item}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}
                    {step === 2 && (
                      <>
                        <h2 className="text-xl font-semibold">
                          Prepara tu consulta
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[#708078]">
                          Tu médico verá estas respuestas en tu expediente.
                          Escribe “Ninguna” si no tienes alergias o medicamentos
                          que reportar.
                        </p>
                        <div className="mt-6 space-y-5">
                          <div className="space-y-2">
                            <Label htmlFor="symptoms">
                              ¿Qué síntomas o motivo te traen? *
                            </Label>
                            <Textarea
                              id="symptoms"
                              value={symptoms}
                              onChange={(event) =>
                                setSymptoms(event.target.value)
                              }
                              maxLength={2000}
                              placeholder="Ej. Dolor de cabeza desde hace tres días"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="allergies">
                              ¿Tienes alergias conocidas?
                            </Label>
                            <Input
                              id="allergies"
                              value={allergies}
                              onChange={(event) =>
                                setAllergies(event.target.value)
                              }
                              maxLength={1000}
                              placeholder="Medicamentos, alimentos u otras"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="medications">
                              ¿Qué medicamentos tomas actualmente?
                            </Label>
                            <Input
                              id="medications"
                              value={medications}
                              onChange={(event) =>
                                setMedications(event.target.value)
                              }
                              maxLength={1000}
                              placeholder="Nombre y dosis, si la conoces"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="context">
                              ¿Algo más que debamos saber?
                            </Label>
                            <Textarea
                              id="context"
                              value={context}
                              onChange={(event) =>
                                setContext(event.target.value)
                              }
                              maxLength={2000}
                              placeholder="Padecimientos, estudios previos o dudas"
                            />
                          </div>
                        </div>
                        <div className="mt-6 flex items-start gap-2 rounded-2xl bg-[#f3f8f4] p-4 text-xs leading-5 text-[#526e60]">
                          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                          Este brief se comparte con el médico de esta cita. Tu
                          historial médico general tiene permisos
                          independientes.
                        </div>
                      </>
                    )}
                  </motion.div>
                  {error && (
                    <p
                      className="mx-6 mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}
                  <div className="flex items-center justify-between border-t border-[#edf1ed] px-6 py-5 sm:px-8">
                    {step > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setError(null);
                          setStep(step - 1);
                        }}
                      >
                        Atrás
                      </Button>
                    ) : (
                      <span className="text-xs text-[#8b9a92]">
                        Sin cargos por explorar horarios
                      </span>
                    )}
                    <Button
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
            <aside className="rounded-3xl border border-[#e1e9e3] bg-white p-6 lg:sticky lg:top-6">
              <p className="text-xs font-semibold tracking-[0.13em] text-[#7d9588] uppercase">
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
                    <p className="text-xs text-[#708078]">{doctor.specialty}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm text-[#708078]">
                  {doctorQuery.isLoading
                    ? "Cargando doctor…"
                    : "Doctor no disponible"}
                </p>
              )}
              <div className="mt-6 border-t border-[#edf1ed] pt-5 text-sm">
                {service && (
                  <p className="font-medium">
                    {service.name} · {service.duration} min
                  </p>
                )}
                {date && (
                  <p className="mt-2 flex items-center gap-2 text-[#62736d] capitalize">
                    <CalendarDays className="size-4" /> {dateLabel(date)}{" "}
                    {time && `· ${time}`}
                  </p>
                )}
              </div>
              <p className="mt-6 text-xs leading-5 text-[#87958d]">
                La solicitud queda pendiente hasta que el consultorio la
                confirme.
              </p>
            </aside>
          </div>
        </div>
      </main>
    </ProductShell>
  );
}
