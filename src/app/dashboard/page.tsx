"use client";

import { useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ClipboardList,
  ListTodo,
  Plus,
  UsersRound,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { api } from "~/trpc/react";
import { ProductShell } from "~/components/shell/product-shell";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { avatarUrl } from "~/lib/avatar-url";
import { toast } from "sonner";

const easeOut = [0.23, 1, 0.32, 1] as const;

function dateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function formatDate(value: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-MX", options).format(value);
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const analyticsPeriod = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 30);
    return { from, to };
  }, []);
  const {
    data: appointmentsData,
    isLoading,
    isError,
    refetch,
  } = api.appointments.listMine.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const {
    data: analyticsData,
    isLoading: isAnalyticsLoading,
    isError: isAnalyticsError,
    refetch: refetchAnalytics,
  } = api.clinical.operationalAnalytics.useQuery(analyticsPeriod, {
    enabled: status === "authenticated" && session?.user?.role === "DOCTOR",
  });
  const utils = api.useUtils();
  const { data: followUpsData, isLoading: areFollowUpsLoading } =
    api.clinical.listFollowUpTasks.useQuery(
      { limit: 5 },
      {
        enabled: status === "authenticated" && session?.user?.role === "DOCTOR",
      },
    );
  const updateFollowUpStatus = api.clinical.updateFollowUpStatus.useMutation({
    onSuccess: async (result) => {
      if (result.error) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      await Promise.all([
        utils.clinical.listFollowUpTasks.invalidate(),
        utils.clinical.operationalAnalytics.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
    } else if (session.user.role === "PATIENT") {
      router.replace("/patient/dashboard");
    } else if (session.user.role !== "DOCTOR") {
      router.replace("/login");
    }
  }, [session, status, router]);

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <ProductShell role="DOCTOR">
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-8">
          <Skeleton className="h-16 w-2/3" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </main>
      </ProductShell>
    );
  }

  if (!session || session.user.role !== "DOCTOR") return null;

  const allAppointments = appointmentsData?.result ?? [];
  const analytics = analyticsData?.result;
  const followUpTasks = followUpsData?.result ?? [];
  const now = new Date();
  const today = dateKey(now);
  const todayAppointments = allAppointments
    .filter(
      (appointment) =>
        new Date(appointment.date).toISOString().slice(0, 10) === today &&
        (appointment.status === "PENDING" ||
          appointment.status === "CONFIRMED"),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  const upcomingAppointments = allAppointments
    .filter((appointment) => {
      const appointmentDay = new Date(appointment.date)
        .toISOString()
        .slice(0, 10);
      return (
        (appointmentDay > today ||
          (appointmentDay === today &&
            appointment.time >=
              formatDate(now, {
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
                timeZone: "America/Mexico_City",
              }))) &&
        (appointment.status === "PENDING" || appointment.status === "CONFIRMED")
      );
    })
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        a.time.localeCompare(b.time),
    )
    .slice(0, 5);
  const pendingCount = allAppointments.filter(
    (appointment) => appointment.status === "PENDING",
  ).length;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedThisMonth = allAppointments.filter(
    (appointment) =>
      appointment.status === "COMPLETED" &&
      new Date(appointment.date) >= monthStart,
  ).length;
  const activePatients = new Set(
    allAppointments
      .filter((appointment) => appointment.status !== "CANCELLED")
      .map((appointment) => appointment.patientId),
  ).size;

  const stats = [
    {
      label: "Citas de hoy",
      value: todayAppointments.length,
      detail: todayAppointments.length
        ? `${todayAppointments[0]?.time} es tu próxima cita`
        : "Tu agenda está libre por hoy",
      icon: CalendarClock,
      href: "/dashboard/appointments",
    },
    {
      label: "Por confirmar",
      value: pendingCount,
      detail: pendingCount
        ? "Revisa las solicitudes pendientes"
        : "Todo al día",
      icon: Clock3,
      href: "/dashboard/appointments",
    },
    {
      label: "Atendidos este mes",
      value: completedThisMonth,
      detail: formatDate(now, { month: "long", year: "numeric" }),
      icon: CheckCircle2,
      href: "/dashboard/appointments",
    },
    {
      label: "Pacientes",
      value: activePatients,
      detail: "Con citas registradas",
      icon: UsersRound,
      href: "/dashboard/patients",
    },
  ];

  const entrance = reducedMotion
    ? { initial: false as const, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <ProductShell role="DOCTOR">
      <main className="min-h-[100dvh] bg-[#fafafa] px-4 py-7 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <motion.header
            {...entrance}
            transition={{ duration: 0.24, ease: easeOut }}
            className="mb-8 flex flex-col gap-5 border-b border-[#ebebeb] pb-6 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <p className="text-xs font-medium tracking-[0.08em] text-[#737373] uppercase">
                Resumen de consulta
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717] sm:text-3xl">
                Buenos días, {session.user.name?.split(" ")[0] ?? "doctora"}
              </h1>
              <p className="mt-2 text-sm text-[#737373]">
                {formatDate(now, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                . Aquí tienes el estado de tu operación.
              </p>
            </div>
            <Button
              asChild
              className="h-10 w-full bg-[#171717] px-4 text-white hover:bg-[#333] sm:w-auto"
            >
              <Link href="/dashboard/appointments/new">
                <Plus className="mr-2 size-4" />
                Nueva cita
              </Link>
            </Button>
          </motion.header>

          {isError && (
            <div
              role="alert"
              className="mb-6 flex items-center justify-between rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-red-700"
            >
              <span>No pudimos cargar la agenda.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
              >
                Reintentar
              </Button>
            </div>
          )}

          <section
            aria-label="Indicadores de la consulta"
            className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  {...entrance}
                  transition={{
                    duration: 0.26,
                    delay: reducedMotion ? 0 : 0.04 * index,
                    ease: easeOut,
                  }}
                >
                  <Link
                    href={stat.href}
                    className="group block rounded-xl border border-[#ebebeb] bg-white p-5 transition-colors duration-150 hover:border-[#c9c9c9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0070f3]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[#737373]">
                        {stat.label}
                      </span>
                      <Icon
                        className="size-4 text-[#737373] transition-transform duration-150 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#171717] tabular-nums">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-[#737373]">{stat.detail}</p>
                  </Link>
                </motion.div>
              );
            })}
          </section>

          <motion.section
            {...entrance}
            transition={{
              duration: 0.25,
              delay: reducedMotion ? 0 : 0.08,
              ease: easeOut,
            }}
            aria-labelledby="operations-title"
            className="mb-8 overflow-hidden rounded-xl border border-[#ebebeb] bg-white"
          >
            <div className="flex flex-col gap-2 border-b border-[#ebebeb] px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
              <div>
                <p className="font-mono text-[10px] tracking-[0.08em] text-[#888] uppercase">
                  Últimos 30 días
                </p>
                <h2
                  id="operations-title"
                  className="mt-1 text-sm font-semibold text-[#171717]"
                >
                  Actividad de la consulta
                </h2>
              </div>
              <Link
                href="/dashboard/follow-ups"
                className="inline-flex min-h-9 items-center gap-1 self-start rounded-md px-2 text-sm font-medium text-[#525252] transition-colors hover:bg-[#f5f5f5] hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-[#0070f3] sm:self-auto"
              >
                Ver análisis <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {isAnalyticsError ? (
              <div
                role="alert"
                className="flex flex-col gap-3 px-5 py-5 text-sm text-[#737373] sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <p>No pudimos actualizar la actividad de tu consulta.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetchAnalytics()}
                >
                  Reintentar
                </Button>
              </div>
            ) : analyticsData?.error ? (
              <div className="px-5 py-5 text-sm text-[#737373] sm:px-6">
                <p>
                  Para ver actividad y seguimiento, selecciona un consultorio
                  con acceso clínico.
                </p>
                <Link
                  href="/dashboard/workspace"
                  className="mt-2 inline-flex min-h-8 items-center text-sm font-medium text-[#171717] underline underline-offset-4"
                >
                  Revisar consultorio
                </Link>
              </div>
            ) : (
              <>
                <div className="grid divide-y divide-[#ebebeb] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3 lg:divide-x xl:grid-cols-6">
                  {[
                    {
                      label: "Ocupación próximos 7 días",
                      href: "/dashboard/appointments",
                      value:
                        analytics?.upcomingCapacity.occupancyRate == null
                          ? "—"
                          : `${Math.round(analytics.upcomingCapacity.occupancyRate * 100)}%`,
                      detail: analytics?.upcomingCapacity.availableMinutes
                        ? `${analytics.upcomingCapacity.bookedMinutes} de ${analytics.upcomingCapacity.availableMinutes} min reservados`
                        : "Sin horarios activos",
                    },
                    {
                      label: "Citas programadas",
                      href: "/dashboard/appointments",
                      value: analytics?.appointments.denominator,
                      detail: "Por fecha de agenda",
                    },
                    {
                      label: "Cancelaciones",
                      href: "/dashboard/appointments",
                      value: analytics?.appointments.lifecycleEvents.cancelled,
                      detail: "Cambios registrados en el periodo",
                    },
                    {
                      label: "Ausencias",
                      href: "/dashboard/appointments",
                      value: analytics?.appointments.lifecycleEvents.noShow,
                      detail: "Cambios registrados en el periodo",
                    },
                    {
                      label: "Seguimientos cerrados",
                      href: "/dashboard/follow-ups",
                      value:
                        analytics?.followUps.completionRate == null
                          ? "—"
                          : `${Math.round(analytics.followUps.completionRate * 100)}%`,
                      detail:
                        analytics?.followUps.denominator === undefined
                          ? "Tareas con vencimiento en periodo"
                          : `De ${analytics.followUps.denominator} tareas no canceladas`,
                    },
                    {
                      label: "Espera mediana",
                      href: "/dashboard/appointments",
                      value:
                        analytics?.waitingTime.medianMinutes == null
                          ? "—"
                          : `${analytics.waitingTime.medianMinutes} min`,
                      detail: analytics?.waitingTime.pairedAppointments
                        ? `De ${analytics.waitingTime.pairedAppointments} consultas con llegada e inicio registrados`
                        : "Se calcula al registrar llegada e inicio",
                    },
                  ].map((metric, index) => (
                    <motion.div
                      key={metric.label}
                      initial={reducedMotion ? false : { opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: reducedMotion ? 0 : index * 0.025,
                        ease: easeOut,
                      }}
                      className=""
                    >
                      <Link
                        href={metric.href}
                        className="group focus-visible:outline-inset block min-h-full px-5 py-4 transition-colors hover:bg-[#fafafa] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#0070f3] sm:px-6"
                      >
                        <p className="text-xs text-[#737373] group-hover:text-[#525252]">
                          {metric.label}
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717] tabular-nums">
                          {isAnalyticsLoading ? "—" : (metric.value ?? 0)}
                        </p>
                        <p className="mt-1 text-[11px] text-[#888]">
                          {metric.detail}
                        </p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
                <p className="border-t border-[#ebebeb] px-5 py-3 text-[11px] leading-5 text-[#737373] sm:px-6">
                  Las cancelaciones y ausencias cuentan transiciones auditadas
                  desde que se habilitó el registro; el historial previo no se
                  reconstruye. La ocupación usa el horario recurrente actual, no
                  contempla excepciones y cuenta citas pendientes o confirmadas.
                  Zona: {analytics?.period.clinicTimezone ?? "—"}.
                </p>
              </>
            )}
          </motion.section>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
            <motion.section
              {...entrance}
              transition={{
                duration: 0.28,
                delay: reducedMotion ? 0 : 0.1,
                ease: easeOut,
              }}
              aria-labelledby="today-title"
              className="overflow-hidden rounded-xl border border-[#ebebeb] bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] px-5 py-4 sm:px-6">
                <div>
                  <h2
                    id="today-title"
                    className="text-base font-semibold text-[#171717]"
                  >
                    Agenda de hoy
                  </h2>
                  <p className="mt-1 text-xs text-[#737373]">
                    {todayAppointments.length} citas confirmadas o pendientes
                  </p>
                </div>
                <Link
                  href="/dashboard/appointments"
                  className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm font-medium text-[#525252] transition-colors hover:bg-[#f5f5f5] hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-[#0070f3]"
                >
                  Ver agenda <ArrowRight className="size-3.5" />
                </Link>
              </div>
              {todayAppointments.length > 0 ? (
                <ul className="divide-y divide-[#ebebeb]">
                  {todayAppointments.slice(0, 6).map((appointment, index) => {
                    const patient = appointment.patient;
                    const patientName = patient?.user?.name ?? "Paciente";
                    return (
                      <motion.li
                        key={appointment.id}
                        initial={reducedMotion ? false : { opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: reducedMotion ? 0 : 0.025 * index,
                          ease: easeOut,
                        }}
                      >
                        <Link
                          href={`/dashboard/patients/${appointment.patientId}`}
                          className="group focus-visible:outline-inset flex min-h-[76px] items-center gap-4 px-5 py-3 transition-colors duration-150 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-[#0070f3] sm:px-6"
                        >
                          <time className="w-14 shrink-0 font-mono text-sm text-[#525252] tabular-nums">
                            {appointment.time}
                          </time>
                          <Avatar className="size-9 shrink-0">
                            {patient?.user?.image && (
                              <AvatarImage
                                src={avatarUrl(
                                  patient.user.image,
                                  patient.user.id,
                                )}
                                alt=""
                              />
                            )}
                            <AvatarFallback className="bg-[#f5f5f5] text-xs text-[#525252]">
                              {patientName
                                .split(" ")
                                .map((part) => part[0])
                                .slice(0, 2)
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#171717]">
                              {patientName}
                            </p>
                            <p className="mt-1 truncate text-xs text-[#737373]">
                              {appointment.service?.name ??
                                appointment.reason ??
                                "Consulta"}{" "}
                              · {appointment.duration} min
                            </p>
                          </div>
                          <span
                            className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${appointment.status === "CONFIRMED" ? "bg-[#e8f8f2] text-[#16794c]" : "bg-[#fff4df] text-[#895a00]"}`}
                          >
                            {appointment.status === "CONFIRMED"
                              ? "Confirmada"
                              : "Por confirmar"}
                          </span>
                          <ChevronRight
                            className="size-4 shrink-0 text-[#a3a3a3] transition-transform duration-150 group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-[#f5f5f5] text-[#525252]">
                    <CalendarClock className="size-5" />
                  </div>
                  <p className="text-sm font-medium text-[#171717]">
                    Tu agenda está libre por hoy
                  </p>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-[#737373]">
                    Cuando se agende una cita aparecerá aquí con el paciente, el
                    servicio y la hora.
                  </p>
                  <Button asChild variant="outline" className="mt-5">
                    <Link href="/dashboard/appointments">
                      <CalendarPlus className="mr-2 size-4" />
                      Abrir agenda
                    </Link>
                  </Button>
                </div>
              )}
            </motion.section>

            <div className="grid gap-6">
              <motion.section
                {...entrance}
                transition={{
                  duration: 0.28,
                  delay: reducedMotion ? 0 : 0.14,
                  ease: easeOut,
                }}
                aria-labelledby="follow-up-priority-title"
                className="overflow-hidden rounded-xl border border-[#ebebeb] bg-white"
              >
                <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] px-5 py-4">
                  <div>
                    <h2
                      id="follow-up-priority-title"
                      className="text-sm font-semibold text-[#171717]"
                    >
                      Seguimientos prioritarios
                    </h2>
                    <p className="mt-1 text-xs text-[#737373]">
                      Pendientes asignados a ti o creados por ti
                    </p>
                  </div>
                  <ListTodo
                    className="size-4 text-[#737373]"
                    aria-hidden="true"
                  />
                </div>
                {areFollowUpsLoading ? (
                  <div
                    className="space-y-3 p-5"
                    aria-label="Cargando seguimientos"
                  >
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : followUpsData?.error ? (
                  <p role="status" className="px-5 py-6 text-sm text-[#737373]">
                    No se pudo cargar la lista de seguimiento.
                  </p>
                ) : followUpTasks.length ? (
                  <ul className="divide-y divide-[#ebebeb]">
                    {followUpTasks.map((task, index) => {
                      const overdue =
                        task.dueAt !== null &&
                        new Date(task.dueAt).getTime() < now.getTime();
                      const active =
                        task.status === "OPEN" || task.status === "IN_PROGRESS";
                      return (
                        <motion.li
                          key={task.id}
                          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.18,
                            delay: reducedMotion ? 0 : index * 0.025,
                            ease: easeOut,
                          }}
                          className="flex items-center gap-3 px-5 py-3"
                        >
                          <Link
                            href={`/dashboard/patients/${task.patientId}`}
                            className="min-w-0 flex-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0070f3]"
                          >
                            <p className="truncate text-sm font-medium text-[#171717]">
                              {task.title}
                            </p>
                            <p className="mt-1 truncate text-xs text-[#737373]">
                              {task.patient.user.name ?? "Paciente"} ·{" "}
                              {task.dueAt
                                ? formatDate(new Date(task.dueAt), {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: "America/Mexico_City",
                                  })
                                : "Sin fecha límite"}
                            </p>
                          </Link>
                          {overdue && active && (
                            <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700">
                              Vencida
                            </span>
                          )}
                          {active && task.canUpdate && (
                            <Button
                              type="button"
                              variant={
                                task.status === "OPEN" ? "outline" : "default"
                              }
                              size="icon"
                              className="size-8 shrink-0"
                              aria-label={
                                task.status === "OPEN"
                                  ? `Iniciar seguimiento: ${task.title}`
                                  : `Resolver seguimiento: ${task.title}`
                              }
                              disabled={updateFollowUpStatus.isPending}
                              onClick={() =>
                                updateFollowUpStatus.mutate({
                                  taskId: task.id,
                                  status:
                                    task.status === "OPEN"
                                      ? "IN_PROGRESS"
                                      : "COMPLETED",
                                })
                              }
                            >
                              <Check className="size-4" />
                            </Button>
                          )}
                        </motion.li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="px-5 py-7">
                    <p className="text-sm font-medium text-[#171717]">
                      No hay seguimientos pendientes.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#737373]">
                      Las tareas clínicas aparecerán aquí por fecha límite.
                    </p>
                  </div>
                )}
                <div className="border-t border-[#ebebeb] px-5 py-2">
                  <Link
                    href="/dashboard/follow-ups"
                    className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-[#525252] hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-[#0070f3]"
                  >
                    Abrir todos los seguimientos{" "}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </motion.section>

              <motion.section
                {...entrance}
                transition={{
                  duration: 0.28,
                  delay: reducedMotion ? 0 : 0.14,
                  ease: easeOut,
                }}
                aria-labelledby="upcoming-title"
                className="overflow-hidden rounded-xl border border-[#ebebeb] bg-white"
              >
                <div className="flex items-center justify-between border-b border-[#ebebeb] px-5 py-4">
                  <div>
                    <h2
                      id="upcoming-title"
                      className="text-sm font-semibold text-[#171717]"
                    >
                      Próximas citas
                    </h2>
                    <p className="mt-1 text-xs text-[#737373]">
                      Siguientes en tu agenda
                    </p>
                  </div>
                  <ClipboardList
                    className="size-4 text-[#737373]"
                    aria-hidden="true"
                  />
                </div>
                {upcomingAppointments.length ? (
                  <ul className="divide-y divide-[#ebebeb]">
                    {upcomingAppointments.slice(0, 4).map((appointment) => (
                      <li key={appointment.id}>
                        <Link
                          href={`/dashboard/patients/${appointment.patientId}`}
                          className="flex min-h-16 items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-[#fafafa]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#171717]">
                              {appointment.patient?.user?.name ?? "Paciente"}
                            </p>
                            <p className="mt-1 text-xs text-[#737373]">
                              {formatDate(new Date(appointment.date), {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                timeZone: "UTC",
                              })}{" "}
                              · {appointment.time}
                            </p>
                          </div>
                          <ChevronRight
                            className="size-4 shrink-0 text-[#a3a3a3]"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 py-8 text-sm text-[#737373]">
                    No hay citas futuras registradas.
                  </p>
                )}
              </motion.section>

              <motion.section
                {...entrance}
                transition={{
                  duration: 0.28,
                  delay: reducedMotion ? 0 : 0.18,
                  ease: easeOut,
                }}
                aria-labelledby="shortcuts-title"
                className="rounded-xl border border-[#ebebeb] bg-white p-5"
              >
                <h2
                  id="shortcuts-title"
                  className="text-sm font-semibold text-[#171717]"
                >
                  Accesos rápidos
                </h2>
                <div className="mt-3 divide-y divide-[#ebebeb]">
                  <Link
                    href="/dashboard/patients/new"
                    className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm text-[#525252] transition-colors hover:text-[#171717]"
                  >
                    Registrar paciente{" "}
                    <ArrowRight className="size-4 text-[#a3a3a3]" />
                  </Link>
                  <Link
                    href="/dashboard/services"
                    className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm text-[#525252] transition-colors hover:text-[#171717]"
                  >
                    Administrar servicios{" "}
                    <ArrowRight className="size-4 text-[#a3a3a3]" />
                  </Link>
                  <Link
                    href="/dashboard/schedule"
                    className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm text-[#525252] transition-colors hover:text-[#171717]"
                  >
                    Configurar horarios{" "}
                    <ArrowRight className="size-4 text-[#a3a3a3]" />
                  </Link>
                </div>
              </motion.section>
            </div>
          </div>
        </div>
      </main>
    </ProductShell>
  );
}
