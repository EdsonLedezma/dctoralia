"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "motion/react";
import gsap from "gsap";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileHeart,
  HeartPulse,
  Pill,
  Plus,
  Stethoscope,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { ProductShell } from "~/components/shell/product-shell";
import { avatarUrl } from "~/lib/avatar-url";
import { api, type RouterOutputs } from "~/trpc/react";

type Appointment = Exclude<
  RouterOutputs["appointments"]["listMine"]["result"],
  null
>[number];

const dateLabel = (value: Date | string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(value));
const greeting = () => {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "America/Mexico_City",
    }).format(new Date()),
  );
  return hour < 12
    ? "Buenos días"
    : hour < 19
      ? "Buenas tardes"
      : "Buenas noches";
};
const statusLabel: Record<string, string> = {
  PENDING: "Por confirmar",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

export function DashboardView() {
  const { data: session } = useSession();
  const reduceMotion = useReducedMotion();
  const lineRef = useRef<HTMLDivElement>(null);
  const appointments = api.appointments.listMine.useQuery();
  const profile = api.auth.getProfile.useQuery();
  const patientId = profile.data?.result?.patient?.id;
  const history = api.patients.getMedicalHistory.useQuery(
    { patientId: patientId ?? "" },
    { enabled: Boolean(patientId) },
  );
  const all = useMemo(
    () => appointments.data?.result ?? [],
    [appointments.data?.result],
  );
  const upcoming = useMemo(() => {
    const now = new Date();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const currentTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Mexico_City",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(now);

    return all
      .filter((item) => {
        if (!["PENDING", "CONFIRMED"].includes(item.status)) return false;
        const day = new Date(item.date).toISOString().slice(0, 10);
        return day > today || (day === today && item.time > currentTime);
      })
      .sort(
        (a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime() ||
          a.time.localeCompare(b.time),
      );
  }, [all]);
  const recent = useMemo(
    () => all.filter((item) => item.status === "COMPLETED").slice(0, 3),
    [all],
  );
  const doctors = useMemo(() => {
    const seen = new Set<string>();
    return all
      .filter((item) => {
        if (seen.has(item.doctorId)) return false;
        seen.add(item.doctorId);
        return true;
      })
      .slice(0, 3);
  }, [all]);
  const medications = history.data?.result?.medications ?? [];

  useEffect(() => {
    if (!lineRef.current || reduceMotion) return;
    const animation = gsap.fromTo(
      lineRef.current,
      { scaleX: 0 },
      { scaleX: 1, duration: 0.65, ease: "power3.out" },
    );
    return () => {
      animation.kill();
    };
  }, [reduceMotion]);

  const firstName = session?.user?.name?.split(" ")[0] ?? "";
  return (
    <ProductShell role="PATIENT">
      <main className="min-h-screen bg-[#f7f8f6] px-4 pt-7 pb-16 text-[#18332c] sm:px-8 sm:pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#61917f] uppercase">
                Tu espacio de salud
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                {greeting()}
                {firstName ? `, ${firstName}` : ""}.
              </h1>
              <p className="mt-2 text-sm text-[#708078]">
                Todo lo importante para cuidar de ti, en un solo lugar.
              </p>
            </div>
            <Link href="/patient/doctors">
              <Button className="h-11 rounded-xl bg-[#237f63] px-5 hover:bg-[#17684f]">
                <Plus className="mr-2 size-4" /> Agendar consulta
              </Button>
            </Link>
          </div>

          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="relative mt-8 overflow-hidden rounded-[28px] bg-[#173c32] p-6 text-white shadow-[0_18px_45px_-30px_#173c32] sm:p-8"
          >
            <div className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -top-3 -right-4 size-44 rounded-full border border-white/10" />
            <div
              ref={lineRef}
              className="absolute inset-x-0 top-0 h-1 origin-left bg-[#8bd5ad]"
            />
            <div className="relative max-w-xl">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[#a7d5bb] uppercase">
                <HeartPulse className="size-4" /> Lo que sigue
              </p>
              {upcoming[0] ? (
                <>
                  <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Tu próxima consulta está en camino.
                  </h2>
                  <p className="mt-2 text-sm text-[#c4d9ce]">
                    {upcoming[0].doctor?.user?.name ?? "Tu doctor"} ·{" "}
                    {dateLabel(upcoming[0].date)} a las {upcoming[0].time}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link href={`/patient/appointments/${upcoming[0].id}`}>
                      <Button
                        variant="secondary"
                        className="rounded-xl bg-white text-[#173c32] hover:bg-[#e9f3ed]"
                      >
                        Ver detalles <ArrowRight className="ml-2 size-4" />
                      </Button>
                    </Link>
                    <span className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-[#d1e6d9]">
                      {statusLabel[upcoming[0].status]}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Tu cuidado comienza aquí.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#c4d9ce]">
                    Encuentra al especialista adecuado y agenda tu primera
                    consulta en unos pasos.
                  </p>
                  <Link href="/patient/doctors" className="mt-6 inline-flex">
                    <Button
                      variant="secondary"
                      className="rounded-xl bg-white text-[#173c32] hover:bg-[#e9f3ed]"
                    >
                      Explorar doctores <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.section>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
            <div className="space-y-6">
              <Panel
                title="Próximas citas"
                eyebrow="Tu agenda"
                href="/patient/appointments"
                linkLabel="Ver todas"
              >
                {appointments.isLoading ? (
                  <LoadingRows />
                ) : appointments.error || appointments.data?.error ? (
                  <ErrorState />
                ) : upcoming.length === 0 ? (
                  <Empty
                    icon={CalendarDays}
                    text="Aún no tienes citas programadas."
                  />
                ) : (
                  upcoming
                    .slice(0, 3)
                    .map((item) => (
                      <AppointmentRow key={item.id} appointment={item} />
                    ))
                )}
              </Panel>
              <Panel
                title="Consultas recientes"
                eyebrow="Tu historial"
                href="/patient/medical-history"
                linkLabel="Ver historial"
              >
                {appointments.isLoading ? (
                  <LoadingRows />
                ) : appointments.error || appointments.data?.error ? (
                  <ErrorState />
                ) : recent.length === 0 ? (
                  <Empty
                    icon={FileHeart}
                    text="Tus consultas aparecerán aquí después de tu primera visita."
                  />
                ) : (
                  recent.map((item) => (
                    <AppointmentRow key={item.id} appointment={item} />
                  ))
                )}
              </Panel>
            </div>
            <div className="space-y-6">
              <Panel
                title="Mis doctores"
                eyebrow="Tu equipo de cuidado"
                href="/patient/doctors"
                linkLabel="Buscar doctores"
              >
                {appointments.isLoading ? (
                  <LoadingRows />
                ) : doctors.length === 0 ? (
                  <Empty
                    icon={Stethoscope}
                    text="Cuando agendes una cita, verás a tu doctor aquí."
                  />
                ) : (
                  doctors.map((item) => (
                    <Link
                      href={`/doctor/${item.doctorId}`}
                      key={item.doctorId}
                      className="flex items-center gap-3 border-t border-[#edf1ed] px-5 py-4 transition-colors hover:bg-[#f8faf8]"
                    >
                      <Avatar className="size-10">
                        <AvatarImage
                          src={avatarUrl(
                            item.doctor?.user?.image,
                            item.doctor?.user?.id ?? "",
                          )}
                          alt=""
                        />
                        <AvatarFallback>
                          {item.doctor?.user?.name?.charAt(0) ?? "D"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.doctor?.user?.name ?? "Doctor"}
                        </p>
                        <p className="truncate text-xs text-[#7b8d82]">
                          {item.doctor?.specialty}
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-[#9aaca1]" />
                    </Link>
                  ))
                )}
              </Panel>
              <Panel
                title="Medicación actual"
                eyebrow="Tu salud hoy"
                href="/patient/medical-history"
                linkLabel="Actualizar"
              >
                {history.isLoading || profile.isLoading ? (
                  <LoadingRows />
                ) : profile.error ||
                  profile.data?.error ||
                  history.error ||
                  history.data?.error ? (
                  <ErrorState />
                ) : medications.length === 0 ? (
                  <Empty
                    icon={Pill}
                    text="No tienes medicamentos registrados en tu historial."
                  />
                ) : (
                  <div className="space-y-2 p-5">
                    {medications.slice(0, 4).map((item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className="flex items-start gap-3 rounded-xl bg-[#f3f7f3] px-4 py-3 text-sm"
                      >
                        <Pill className="mt-0.5 size-4 shrink-0 text-[#438565]" />
                        <span>{item}</span>
                      </div>
                    ))}
                    {medications.length > 4 && (
                      <p className="text-xs text-[#7b8d82]">
                        Y {medications.length - 4} más en tu historial
                      </p>
                    )}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </div>
      </main>
    </ProductShell>
  );
}

function Panel({
  title,
  eyebrow,
  href,
  linkLabel,
  children,
}: {
  title: string;
  eyebrow: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[#e1e9e3] bg-white shadow-[0_12px_30px_-28px_#254d3d]">
      <div className="flex items-end justify-between gap-3 px-5 py-5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[#7d9887] uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#2a8866] hover:underline"
        >
          {linkLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  return (
    <Link
      href={`/patient/appointments/${appointment.id}`}
      className="flex items-center gap-4 border-t border-[#edf1ed] px-5 py-4 transition-colors hover:bg-[#f8faf8]"
    >
      <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[#edf6ef] text-[#287a5d]">
        <span className="text-base leading-none font-semibold">
          {new Date(appointment.date).getUTCDate()}
        </span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase">
          {new Intl.DateTimeFormat("es-MX", {
            month: "short",
            timeZone: "UTC",
          }).format(new Date(appointment.date))}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {appointment.doctor?.user?.name ?? "Doctor"}
        </p>
        <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-[#7b8d82]">
          <Clock3 className="size-3" />
          {appointment.time} · {appointment.service?.name ?? "Consulta"}
        </p>
      </div>
      <span className="hidden rounded-full bg-[#f3f7f3] px-2.5 py-1 text-[10px] text-[#54816a] sm:block">
        {statusLabel[appointment.status]}
      </span>
      <ChevronRight className="size-4 shrink-0 text-[#9aaca1]" />
    </Link>
  );
}

function Empty({
  icon: Icon,
  text,
}: {
  icon: typeof CalendarDays;
  text: string;
}) {
  return (
    <div className="border-t border-[#edf1ed] px-5 py-8 text-center">
      <Icon className="mx-auto size-6 text-[#91ac9b]" />
      <p className="mt-3 text-sm text-[#718279]">{text}</p>
    </div>
  );
}
function LoadingRows() {
  return (
    <div
      className="space-y-3 border-t border-[#edf1ed] p-5"
      aria-label="Cargando"
    >
      <div className="h-12 animate-pulse rounded-xl bg-[#edf1ed]" />
      <div className="h-12 animate-pulse rounded-xl bg-[#edf1ed]" />
    </div>
  );
}
function ErrorState() {
  return (
    <p
      className="border-t border-[#edf1ed] px-5 py-6 text-sm text-[#9c5446]"
      role="alert"
    >
      No pudimos cargar esta información. Intenta recargar la página.
    </p>
  );
}
