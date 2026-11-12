"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Calendar,
  Clock3,
  MapPin,
  Phone,
  Star,
  Stethoscope,
} from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { MotionList } from "~/components/shared/motion-list";
import { PublicHeader } from "~/components/marketing/public-header";
import { directoryReturnHref } from "~/components/doctors/directory-navigation";
import { specialtyLabel } from "~/components/doctors/directory-model";
import { authPageHref } from "~/components/auth/auth-navigation";
import { api, type RouterOutputs } from "~/trpc/react";

type DoctorProfile = Exclude<
  RouterOutputs["doctor"]["getById"]["result"],
  null
>;
type DoctorService = DoctorProfile["services"][number];
type DoctorReview = DoctorProfile["reviews"][number];

const weekdayNames = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function formatDate(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : date.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "America/Mexico_City",
      });
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "DR"
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="text-muted-foreground flex items-center gap-1 text-sm">
      <Star className="text-foreground h-3.5 w-3.5 fill-current" />
      {value > 0 ? value.toFixed(1) : "Sin calificación"}
    </span>
  );
}

export function DoctorProfileView() {
  const { data: session } = useSession();
  const params = useParams<{ id: string }>();
  const doctorId = params?.id;
  const searchParams = useSearchParams();
  const directoryHref = directoryReturnHref(searchParams.get("from"));
  const profileHref = `/doctor/${doctorId}?${new URLSearchParams({ from: directoryHref })}`;
  const homeHref = session?.user
    ? session.user.role === "DOCTOR"
      ? "/dashboard"
      : "/patient/dashboard"
    : "/";

  const {
    data: doctorRes,
    isLoading,
    isError,
    refetch,
  } = api.doctor.getById.useQuery(
    { id: doctorId ?? "" },
    { enabled: Boolean(doctorId) },
  );
  const doctor = doctorRes?.result;

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <PublicHeader
          homeHref={homeHref}
          portalHref={
            session?.user ? homeHref : authPageHref("/login", profileHref)
          }
          portalLabel={session?.user ? "Mi espacio" : "Iniciar sesión"}
        />
        <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
          <div className="border-border bg-card h-44 animate-pulse border-y" />
          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <div className="border-border bg-card h-64 animate-pulse border-y" />
            <div className="border-border bg-card h-48 animate-pulse border-y" />
          </div>
          <span className="sr-only">Cargando perfil del doctor</span>
        </main>
      </div>
    );
  }

  if (isError || !doctor) {
    return (
      <div className="bg-background min-h-screen">
        <PublicHeader
          homeHref={homeHref}
          portalHref={
            session?.user ? homeHref : authPageHref("/login", profileHref)
          }
          portalLabel={session?.user ? "Mi espacio" : "Iniciar sesión"}
        />
        <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4 py-8 sm:px-8">
          <div className="max-w-md text-center">
            <Stethoscope className="text-muted-foreground mx-auto h-8 w-8" />
            <h1 className="mt-4 text-xl font-semibold tracking-tight">
              Perfil no disponible
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              No encontramos este perfil. Regresa al directorio para buscar otro
              profesional.
            </p>
            <Button asChild className="mt-5">
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {(isError ||
                  Boolean(doctorRes?.error && doctorRes.status >= 500)) && (
                  <Button variant="outline" onClick={() => void refetch()}>
                    Reintentar perfil
                  </Button>
                )}
                <Button asChild>
                  <Link
                    href={
                      session?.user?.role === "PATIENT"
                        ? directoryHref
                        : homeHref
                    }
                  >
                    Volver
                  </Link>
                </Button>
              </div>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const name = doctor.user?.name ?? "Doctor";
  const services = doctor.services.filter((service) => service.isActive);
  const reviews = doctor.reviews.slice(0, 5);
  const schedules = [...doctor.schedules].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek,
  );
  const bookHref = `/book-appointment/${doctor.id}?${new URLSearchParams({ from: directoryHref })}`;

  return (
    <div className="bg-background text-foreground min-h-screen">
      <PublicHeader
        homeHref={homeHref}
        portalHref={
          session?.user ? homeHref : authPageHref("/login", profileHref)
        }
        portalLabel={session?.user ? "Mi espacio" : "Iniciar sesión"}
      />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-8 sm:py-10">
        <Link
          href={session?.user?.role === "PATIENT" ? directoryHref : homeHref}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft className="h-4 w-4" />
          {session?.user?.role === "PATIENT"
            ? "Volver al directorio"
            : "Volver al inicio"}
        </Link>

        <MotionList>
          <section className="material-card border-border bg-card rounded-[24px] border px-5 py-6 sm:px-7 sm:py-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                <Avatar className="border-border h-16 w-16 shrink-0 rounded-full border sm:h-20 sm:w-20">
                  <AvatarFallback className="text-muted-foreground text-lg font-medium sm:text-xl">
                    {initials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
                    Perfil profesional
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight break-words sm:text-3xl">
                    {name}
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {specialtyLabel(doctor.specialty) ||
                      "Especialidad no registrada"}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <Rating value={doctor.rating ?? 0} />
                    <span className="text-muted-foreground text-xs">
                      {doctor.totalReviews ?? doctor.reviews.length} reseñas
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {doctor.experience ?? 0} años de experiencia
                    </span>
                  </div>
                </div>
              </div>
              <Button asChild className="w-full shrink-0 sm:w-auto">
                <Link href={bookHref}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Agendar cita
                </Link>
              </Button>
            </div>
          </section>
        </MotionList>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 space-y-8">
            <section>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold">Servicios</h2>
                {services.length > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {services.length} disponibles
                  </span>
                )}
              </div>
              <MotionList className="material-card divide-border border-border bg-card divide-y overflow-hidden rounded-[24px] border">
                {services.length > 0 ? (
                  services.map((service: DoctorService) => (
                    <div
                      key={service.id}
                      className="hover:bg-background flex flex-col gap-3 px-4 py-4 transition-colors duration-150 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{service.name}</p>
                        {service.description && (
                          <p className="text-muted-foreground mt-1 text-sm leading-6">
                            {service.description}
                          </p>
                        )}
                        <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                          <Clock3 className="h-3.5 w-3.5" />
                          {service.duration} minutos
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                        <p className="text-sm font-medium">
                          {service.price > 0
                            ? `$${service.price}`
                            : "Consultar"}
                        </p>
                        <Link
                          href={`${bookHref}&${new URLSearchParams({ serviceId: service.id })}`}
                          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
                        >
                          Reservar
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground px-5 py-8 text-sm">
                    Este doctor aún no ha publicado servicios.
                  </p>
                )}
              </MotionList>
            </section>

            {doctor.about && (
              <section className="border-border border-t pt-6">
                <h2 className="text-base font-semibold">Acerca de {name}</h2>
                <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-7">
                  {doctor.about}
                </p>
              </section>
            )}

            <section>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold">Reseñas</h2>
                <Rating value={doctor.rating ?? 0} />
              </div>
              <MotionList className="material-card divide-border border-border bg-card divide-y overflow-hidden rounded-[24px] border">
                {reviews.length > 0 ? (
                  reviews.map((review: DoctorReview) => (
                    <article key={review.id} className="px-4 py-4 sm:px-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">
                            Opinión de paciente
                          </p>
                          <div className="mt-1 flex items-center gap-1">
                            <Star className="text-foreground h-3 w-3 fill-current" />
                            <span className="text-muted-foreground text-xs">
                              {review.rating}/5
                            </span>
                          </div>
                        </div>
                        <time className="text-muted-foreground text-xs">
                          {formatDate(review.createdAt)}
                        </time>
                      </div>
                      {review.comment && (
                        <p className="text-muted-foreground mt-3 text-sm leading-6">
                          {review.comment}
                        </p>
                      )}
                    </article>
                  ))
                ) : (
                  <p className="text-muted-foreground px-5 py-8 text-sm">
                    Aún no hay reseñas para este perfil.
                  </p>
                )}
              </MotionList>
            </section>
          </div>

          <aside className="space-y-6 self-start lg:sticky lg:top-6">
            <section className="material-card border-border bg-card rounded-[24px] border px-5 py-5">
              <h2 className="text-sm font-semibold">Horarios</h2>
              <div className="divide-border mt-3 divide-y">
                {schedules.length > 0 ? (
                  schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between gap-3 py-2 text-xs"
                    >
                      <span className="text-muted-foreground">
                        {weekdayNames[schedule.dayOfWeek] ??
                          `Día ${schedule.dayOfWeek}`}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {schedule.startTime} – {schedule.endTime}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground py-3 text-xs">
                    Horarios bajo disponibilidad.
                  </p>
                )}
              </div>
            </section>

            <section className="material-card border-border bg-card rounded-[24px] border px-5 py-5">
              <h2 className="text-sm font-semibold">Contacto</h2>
              <div className="text-muted-foreground mt-3 space-y-3 text-xs">
                {doctor.phone && (
                  <a
                    href={`tel:${doctor.phone}`}
                    className="hover:text-foreground flex min-h-11 items-center gap-2 transition-colors"
                  >
                    <Phone className="text-muted-foreground h-3.5 w-3.5" />
                    {doctor.phone}
                  </a>
                )}
                {!doctor.phone && (
                  <p className="text-muted-foreground py-2">
                    Contacto no publicado.
                  </p>
                )}
              </div>
            </section>

            <div className="text-muted-foreground flex items-start gap-2 text-xs leading-5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Consulta la ubicación al reservar tu cita.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
