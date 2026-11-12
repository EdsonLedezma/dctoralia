"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileHeart,
  Pill,
  Plus,
  Stethoscope,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { OperationsShell } from "./operations-shell";
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

export function PatientOverview() {
  const { data: session } = useSession();
  const appointments = api.appointments.listMine.useQuery();
  const profile = api.auth.getProfile.useQuery();
  const patientId = profile.data?.result?.patient?.id;
  const history = api.patients.getMedicalHistory.useQuery(
    { patientId: patientId ?? "" },
    { enabled: Boolean(patientId) },
  );
  const signedRecords = api.clinical.mySignedRecords.useQuery(undefined, {
    enabled: Boolean(patientId),
  });
  const latestPrescription = signedRecords.data?.result?.prescriptions.find(
    (prescription) => !prescription.voidedAt,
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
    () =>
      all
        .filter((item) => item.status === "COMPLETED")
        .sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime() ||
            b.time.localeCompare(a.time),
        )
        .slice(0, 3),
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

  const firstName = session?.user?.name?.split(" ")[0] ?? "";
  return (
    <OperationsShell role="PATIENT">
      <main className="bg-background text-foreground min-h-screen px-4 pt-7 pb-16 sm:px-8 sm:pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
                Tu espacio de salud
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                {greeting()}
                {firstName ? `, ${firstName}` : ""}.
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Todo lo importante para cuidar de ti, en un solo lugar.
              </p>
            </div>
            <Button asChild className="self-start">
              <Link href="/patient/doctors">
                <Plus className="size-4" />
                Agendar consulta
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
            <div className="min-w-0 space-y-6">
              <Panel
                title="Próximas citas"
                eyebrow="Tu agenda"
                href="/patient/appointments"
                linkLabel="Ver todas"
              >
                {appointments.isLoading ? (
                  <LoadingRows />
                ) : appointments.error || appointments.data?.error ? (
                  <ErrorState
                    onRetry={() => {
                      void appointments.refetch();
                      void profile.refetch();
                      if (patientId) {
                        void history.refetch();
                        void signedRecords.refetch();
                      }
                    }}
                  />
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
                {appointments.isLoading || signedRecords.isLoading ? (
                  <LoadingRows />
                ) : appointments.error ||
                  appointments.data?.error ||
                  signedRecords.error ||
                  signedRecords.data?.error ? (
                  <ErrorState
                    onRetry={() => {
                      void appointments.refetch();
                      void profile.refetch();
                      if (patientId) {
                        void history.refetch();
                        void signedRecords.refetch();
                      }
                    }}
                  />
                ) : (signedRecords.data?.result?.encounters.length ?? 0) > 0 ? (
                  <div className="divide-border divide-y">
                    {signedRecords.data?.result?.encounters
                      .slice(0, 3)
                      .map((encounter) => (
                        <div key={encounter.id} className="px-5 py-4">
                          <p className="text-foreground text-sm font-semibold">
                            Consulta médica
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {encounter.doctor.user.name} ·{" "}
                            {dateLabel(encounter.encounterAt)}
                          </p>
                          {encounter.patientSummary && (
                            <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
                              {encounter.patientSummary}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
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
            <div className="min-w-0 space-y-6">
              <Panel
                title="Mis doctores"
                eyebrow="Tu equipo de cuidado"
                href="/patient/doctors"
                linkLabel="Buscar doctores"
              >
                {appointments.isLoading ? (
                  <LoadingRows />
                ) : appointments.isError || appointments.data?.error ? (
                  <ErrorState onRetry={() => void appointments.refetch()} />
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
                      className="border-border hover:bg-accent/50 flex items-center gap-3 border-t px-5 py-4 transition-colors"
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
                        <p className="text-muted-foreground truncate text-xs">
                          {item.doctor?.specialty}
                        </p>
                      </div>
                      <ChevronRight className="text-muted-foreground size-4" />
                    </Link>
                  ))
                )}
              </Panel>
              <Panel
                title="Última receta"
                eyebrow="Indicaciones de tu doctor"
                href="/patient/medical-history"
                linkLabel="Ver recetas"
              >
                {signedRecords.isLoading ? (
                  <LoadingRows />
                ) : signedRecords.error || signedRecords.data?.error ? (
                  <ErrorState
                    onRetry={() => {
                      void appointments.refetch();
                      void profile.refetch();
                      if (patientId) {
                        void history.refetch();
                        void signedRecords.refetch();
                      }
                    }}
                  />
                ) : latestPrescription ? (
                  <div className="space-y-3 p-5">
                    <p className="text-muted-foreground text-xs">
                      {latestPrescription.doctor.user.name} ·{" "}
                      {dateLabel(latestPrescription.issuedAt)}
                    </p>
                    {latestPrescription.medications.map((medication) => (
                      <div
                        key={medication.id}
                        className="bg-muted flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
                      >
                        <Pill className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                        <span>
                          <strong>{medication.name}</strong> · {medication.dose}{" "}
                          · {medication.frequency}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon={Pill}
                    text="Tus recetas emitidas aparecerán aquí."
                  />
                )}
              </Panel>
              <Panel
                title="Medicamentos que reportaste"
                eyebrow="Tu información"
                href="/patient/medical-history"
                linkLabel="Actualizar"
              >
                {history.isLoading || profile.isLoading ? (
                  <LoadingRows />
                ) : profile.error ||
                  profile.data?.error ||
                  history.error ||
                  history.data?.error ? (
                  <ErrorState
                    onRetry={() => {
                      void appointments.refetch();
                      void profile.refetch();
                      if (patientId) {
                        void history.refetch();
                        void signedRecords.refetch();
                      }
                    }}
                  />
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
                        className="bg-muted flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
                      >
                        <Pill className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                    {medications.length > 4 && (
                      <p className="text-muted-foreground text-xs">
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
    </OperationsShell>
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
    <section
      className="glass-panel min-w-0 overflow-hidden rounded-3xl"
      data-patient-card
    >
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 px-5 py-4">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        <Link
          href={href}
          className="text-foreground focus-visible:outline-ring inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2"
        >
          {linkLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="bg-card/95">{children}</div>
    </section>
  );
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  return (
    <Link
      href={`/patient/appointments/${appointment.id}`}
      className="border-border hover:bg-accent/50 flex items-center gap-4 border-t px-5 py-4 transition-colors"
    >
      <div className="bg-muted text-muted-foreground flex size-11 shrink-0 flex-col items-center justify-center rounded-xl">
        <span className="text-base leading-none font-semibold">
          {new Date(appointment.date).getUTCDate()}
        </span>
        <span className="mt-0.5 text-xs font-semibold uppercase">
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
        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 truncate text-xs">
          <Clock3 className="size-3" />
          {appointment.time} · {appointment.service?.name ?? "Consulta"}
        </p>
      </div>
      <span className="border-border bg-muted text-foreground rounded-full border px-2.5 py-1 text-xs">
        {statusLabel[appointment.status]}
      </span>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
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
    <div className="border-border border-t px-5 py-8 text-center">
      <Icon className="text-muted-foreground mx-auto size-6" />
      <p className="text-muted-foreground mt-3 text-sm">{text}</p>
    </div>
  );
}
function LoadingRows() {
  return (
    <div className="border-border space-y-3 border-t p-5" aria-label="Cargando">
      <div className="bg-muted h-12 animate-pulse rounded-xl" />
      <div className="bg-muted h-12 animate-pulse rounded-xl" />
    </div>
  );
}
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="border-border border-t px-5 py-6 text-sm" role="alert">
      <p>No pudimos cargar esta información.</p>
      <Button variant="outline" className="mt-3" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
