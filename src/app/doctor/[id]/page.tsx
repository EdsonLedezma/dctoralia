"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Calendar,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Star,
  Stethoscope,
} from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { MotionList } from "~/components/shared/motion-list";
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
    <span className="flex items-center gap-1 text-sm text-[#525252]">
      <Star className="h-3.5 w-3.5 fill-current text-[#171717]" />
      {value > 0 ? value.toFixed(1) : "Sin calificación"}
    </span>
  );
}

export default function DoctorProfilePage() {
  const { data: session } = useSession();
  const params = useParams<{ id: string }>();
  const doctorId = params?.id;
  const homeHref = session?.user
    ? session.user.role === "DOCTOR"
      ? "/dashboard"
      : "/patient/dashboard"
    : "/";

  const {
    data: doctorRes,
    isLoading,
    isError,
  } = api.doctor.getById.useQuery(
    { id: doctorId ?? "" },
    { enabled: Boolean(doctorId) },
  );
  const doctor = doctorRes?.result;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <PublicHeader homeHref={homeHref} />
        <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
          <div className="h-44 animate-pulse border-y border-[#ebebeb] bg-white" />
          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <div className="h-64 animate-pulse border-y border-[#ebebeb] bg-white" />
            <div className="h-48 animate-pulse border-y border-[#ebebeb] bg-white" />
          </div>
          <span className="sr-only">Cargando perfil del doctor</span>
        </main>
      </div>
    );
  }

  if (isError || !doctor) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <PublicHeader homeHref={homeHref} />
        <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4 py-8 sm:px-8">
          <div className="max-w-md text-center">
            <Stethoscope className="mx-auto h-8 w-8 text-[#737373]" />
            <h1 className="mt-4 text-xl font-semibold tracking-tight">
              Perfil no disponible
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#737373]">
              No encontramos este perfil. Regresa al directorio para buscar otro
              profesional.
            </p>
            <Link href="/patient/doctors" className="mt-5 inline-flex">
              <Button>Buscar doctores</Button>
            </Link>
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
  const bookHref = `/book-appointment/${doctor.id}`;

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#171717]">
      <PublicHeader homeHref={homeHref} />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-8 sm:py-10">
        <Link
          href="/patient/doctors"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-[#525252] transition-colors hover:text-[#171717] focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:outline-none"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al directorio
        </Link>

        <MotionList>
          <section className="border-y border-[#ebebeb] bg-white px-5 py-6 sm:px-7 sm:py-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                <Avatar className="h-16 w-16 shrink-0 rounded-full border border-[#ebebeb] sm:h-20 sm:w-20">
                  <AvatarFallback className="text-lg font-medium text-[#525252] sm:text-xl">
                    {initials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-[0.08em] text-[#737373] uppercase">
                    Perfil profesional
                  </p>
                  <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                    {name}
                  </h1>
                  <p className="mt-1 text-sm text-[#525252]">
                    {doctor.specialty || "Especialidad no registrada"}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <Rating value={doctor.rating ?? 0} />
                    <span className="text-xs text-[#737373]">
                      {doctor.totalReviews ?? doctor.reviews.length} reseñas
                    </span>
                    <span className="text-xs text-[#737373]">
                      {doctor.experience ?? 0} años de experiencia
                    </span>
                  </div>
                </div>
              </div>
              <Link href={bookHref} className="shrink-0">
                <Button className="w-full sm:w-auto">
                  <Calendar className="mr-2 h-4 w-4" />
                  Agendar cita
                </Button>
              </Link>
            </div>
          </section>
        </MotionList>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 space-y-8">
            <section>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold">Servicios</h2>
                {services.length > 0 && (
                  <span className="text-xs text-[#737373]">
                    {services.length} disponibles
                  </span>
                )}
              </div>
              <MotionList className="divide-y divide-[#ebebeb] border-y border-[#ebebeb] bg-white">
                {services.length > 0 ? (
                  services.map((service: DoctorService) => (
                    <div
                      key={service.id}
                      className="flex flex-col gap-3 px-4 py-4 transition-colors duration-150 hover:bg-[#fafafa] sm:flex-row sm:items-center sm:justify-between sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{service.name}</p>
                        {service.description && (
                          <p className="mt-1 text-sm leading-6 text-[#737373]">
                            {service.description}
                          </p>
                        )}
                        <p className="mt-1 flex items-center gap-1 text-xs text-[#737373]">
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
                          href={bookHref}
                          className="text-xs font-medium text-[#525252] underline-offset-4 hover:text-[#171717] hover:underline"
                        >
                          Reservar
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="px-5 py-8 text-sm text-[#737373]">
                    Este doctor aún no ha publicado servicios.
                  </p>
                )}
              </MotionList>
            </section>

            {doctor.about && (
              <section className="border-t border-[#ebebeb] pt-6">
                <h2 className="text-base font-semibold">Acerca de {name}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#525252]">
                  {doctor.about}
                </p>
              </section>
            )}

            <section>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold">Reseñas</h2>
                <Rating value={doctor.rating ?? 0} />
              </div>
              <MotionList className="divide-y divide-[#ebebeb] border-y border-[#ebebeb] bg-white">
                {reviews.length > 0 ? (
                  reviews.map((review: DoctorReview) => (
                    <article key={review.id} className="px-4 py-4 sm:px-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">
                            {review.patient?.user?.name ?? "Paciente"}
                          </p>
                          <div className="mt-1 flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current text-[#171717]" />
                            <span className="text-xs text-[#525252]">
                              {review.rating}/5
                            </span>
                          </div>
                        </div>
                        <time className="text-xs text-[#737373]">
                          {formatDate(review.createdAt)}
                        </time>
                      </div>
                      {review.comment && (
                        <p className="mt-3 text-sm leading-6 text-[#525252]">
                          {review.comment}
                        </p>
                      )}
                    </article>
                  ))
                ) : (
                  <p className="px-5 py-8 text-sm text-[#737373]">
                    Aún no hay reseñas para este perfil.
                  </p>
                )}
              </MotionList>
            </section>
          </div>

          <aside className="space-y-8">
            <section className="border-y border-[#ebebeb] bg-white px-4 py-4">
              <h2 className="text-sm font-semibold">Horarios</h2>
              <div className="mt-3 divide-y divide-[#f0f0f0]">
                {schedules.length > 0 ? (
                  schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between gap-3 py-2 text-xs"
                    >
                      <span className="text-[#525252]">
                        {weekdayNames[schedule.dayOfWeek] ??
                          `Día ${schedule.dayOfWeek}`}
                      </span>
                      <span className="font-mono text-[#737373]">
                        {schedule.startTime} – {schedule.endTime}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-3 text-xs text-[#737373]">
                    Horarios bajo disponibilidad.
                  </p>
                )}
              </div>
            </section>

            <section className="border-y border-[#ebebeb] bg-white px-4 py-4">
              <h2 className="text-sm font-semibold">Contacto</h2>
              <div className="mt-3 space-y-3 text-xs text-[#525252]">
                {doctor.phone && (
                  <a
                    href={`tel:${doctor.phone}`}
                    className="flex min-h-11 items-center gap-2 transition-colors hover:text-[#171717]"
                  >
                    <Phone className="h-3.5 w-3.5 text-[#737373]" />
                    {doctor.phone}
                  </a>
                )}
                {doctor.user?.email && (
                  <a
                    href={`mailto:${doctor.user.email}`}
                    className="flex min-h-11 items-center gap-2 break-all transition-colors hover:text-[#171717]"
                  >
                    <Mail className="h-3.5 w-3.5 text-[#737373]" />
                    {doctor.user.email}
                  </a>
                )}
                {!doctor.phone && !doctor.user?.email && (
                  <p className="py-2 text-[#737373]">Contacto no publicado.</p>
                )}
              </div>
            </section>

            <div className="flex items-start gap-2 text-xs leading-5 text-[#737373]">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Consulta la ubicación al reservar tu cita.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function PublicHeader({ homeHref }: { homeHref: string }) {
  return (
    <header className="border-b border-[#ebebeb] bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-8">
        <Link
          href={homeHref}
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#171717] text-white">
            <Stethoscope className="h-4 w-4" />
          </span>
          Dctoralia
        </Link>
        <Link
          href="/login"
          className="text-sm text-[#525252] transition-colors hover:text-[#171717]"
        >
          Portal médico
        </Link>
      </div>
    </header>
  );
}
