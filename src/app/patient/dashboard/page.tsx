"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  Phone,
} from "lucide-react";
import { ProductShell } from "~/components/shell/product-shell";
import { MotionList } from "~/components/shared/motion-list";
import { Button } from "~/components/ui/button";
import { api, type RouterOutputs } from "~/trpc/react";

type Appointment = Exclude<
  RouterOutputs["appointments"]["listMine"]["result"],
  null
>[number];

const statusLabels: Record<string, string> = {
  confirmed: "Confirmada",
  pending: "Pendiente",
  completed: "Completada",
};

function formatDate(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : date.toLocaleDateString("es-MX", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
}

export default function PatientDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "PATIENT") router.push("/login");
  }, [session, status, router]);

  const {
    data: upcomingRes,
    isLoading: upcomingLoading,
    isError: upcomingError,
  } = api.appointments.upcoming.useQuery({ limit: 5 });
  const {
    data: allAppointmentsRes,
    isLoading: historyLoading,
    isError: historyError,
  } = api.appointments.listMine.useQuery();

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (!session || session.user.role !== "PATIENT") return null;

  const upcomingAppointments = upcomingRes?.result ?? [];
  const recentAppointments = (allAppointmentsRes?.result ?? [])
    .filter((appointment) => appointment.status === "COMPLETED")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <ProductShell role="PATIENT">
      <div className="min-h-screen bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="flex flex-col gap-4 border-b border-[#ebebeb] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.08em] text-[#737373] uppercase">
                Agenda personal
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                Tus próximas citas
              </h1>
            </div>
            <Link href="/patient/appointments/book">
              <Button className="w-full sm:w-auto">Buscar doctor</Button>
            </Link>
          </div>

          {upcomingError ? (
            <InlineError message="No pudimos cargar tus próximas citas." />
          ) : upcomingLoading ? (
            <AppointmentListSkeleton label="Cargando próximas citas" />
          ) : upcomingAppointments.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No tienes citas programadas"
              description="Busca un doctor y agenda tu próxima consulta cuando lo necesites."
              action={{
                href: "/patient/appointments/book",
                label: "Buscar doctor",
              }}
            />
          ) : (
            <MotionList className="divide-y divide-[#ebebeb] border-y border-[#ebebeb] bg-white">
              {upcomingAppointments.map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </MotionList>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold">Consultas recientes</h2>
              <Link
                href="/patient/medical-history"
                className="text-xs font-medium text-[#525252] underline-offset-4 hover:text-[#171717] hover:underline"
              >
                Ver historial
              </Link>
            </div>
            {historyError ? (
              <InlineError message="No pudimos cargar tu historial reciente." />
            ) : historyLoading ? (
              <AppointmentListSkeleton label="Cargando historial" />
            ) : recentAppointments.length === 0 ? (
              <div className="border-y border-[#ebebeb] bg-white px-5 py-8 text-sm text-[#737373]">
                Aún no tienes consultas completadas.
              </div>
            ) : (
              <MotionList className="divide-y divide-[#ebebeb] border-y border-[#ebebeb] bg-white">
                {recentAppointments.map((appointment) => (
                  <Link
                    key={appointment.id}
                    href={`/patient/appointments/${appointment.id}`}
                    className="flex min-h-16 items-center gap-4 px-4 py-4 transition-colors hover:bg-[#fafafa] focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:outline-none focus-visible:ring-inset sm:px-5"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-[#737373]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {appointment.doctor?.user?.name ?? "Doctor"}
                      </p>
                      <p className="mt-1 truncate text-xs text-[#737373]">
                        {appointment.service?.name ??
                          appointment.reason ??
                          "Consulta"}{" "}
                        · {formatDate(appointment.date)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#a3a3a3]" />
                  </Link>
                ))}
              </MotionList>
            )}
          </section>
        </div>
      </div>
    </ProductShell>
  );
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const status = appointment.status.toLowerCase();
  return (
    <div className="flex flex-col gap-4 px-4 py-5 transition-colors hover:bg-[#fafafa] sm:flex-row sm:items-center sm:px-5">
      <div className="flex items-center gap-3 sm:w-44 sm:shrink-0">
        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md border border-[#e5e5e5] bg-[#fafafa] text-center">
          <CalendarDays className="h-3.5 w-3.5 text-[#737373]" />
          <span className="mt-0.5 text-[10px] font-medium text-[#525252]">
            {new Date(appointment.date).getDate()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#525252]">
            {formatDate(appointment.date)}
          </p>
          <p className="mt-1 flex items-center gap-1 font-mono text-xs text-[#737373]">
            <Clock3 className="h-3.5 w-3.5" />
            {appointment.time}
          </p>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {appointment.doctor?.user?.name ?? "Doctor"}
        </p>
        <p className="mt-1 truncate text-xs text-[#737373]">
          {appointment.service?.name ?? appointment.reason ?? "Consulta"}
          {appointment.doctor?.specialty
            ? ` · ${appointment.doctor.specialty}`
            : ""}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="text-xs text-[#525252]">
          {statusLabels[status] ?? status}
        </span>
        <Link
          href={`/patient/appointments/${appointment.id}`}
          className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-[#525252] hover:text-[#171717]"
        >
          Detalles
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {appointment.doctor?.phone && (
        <a
          href={`tel:${appointment.doctor.phone}`}
          aria-label={`Llamar a ${appointment.doctor.user?.name ?? "doctor"}`}
          className="hidden min-h-11 min-w-11 items-center justify-center rounded-md text-[#737373] hover:bg-[#f0f0f0] hover:text-[#171717] sm:inline-flex"
        >
          <Phone className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof CalendarDays;
  title: string;
  description: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="border-y border-[#ebebeb] bg-white px-5 py-12 text-center">
      <Icon className="mx-auto h-7 w-7 text-[#737373]" />
      <p className="mt-4 text-sm font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#737373]">
        {description}
      </p>
      <Link href={action.href} className="mt-5 inline-flex">
        <Button variant="outline">{action.label}</Button>
      </Link>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div
      className="border-y border-[#e5e5e5] bg-white px-5 py-5 text-sm text-[#525252]"
      role="alert"
    >
      {message}
    </div>
  );
}

function AppointmentListSkeleton({ label }: { label: string }) {
  return (
    <div
      className="divide-y divide-[#ebebeb] border-y border-[#ebebeb] bg-white"
      aria-label={label}
    >
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-20 animate-pulse bg-white" />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
      <span className="text-sm text-[#737373]">Cargando tu agenda…</span>
    </div>
  );
}
