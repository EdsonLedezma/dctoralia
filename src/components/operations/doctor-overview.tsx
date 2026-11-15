"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronRight,
  ClipboardList,
  ListTodo,
  Plus,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { api } from "~/trpc/react";
import { getDoctorWorkday } from "~/server/domain/appointments/doctor-workday";
import { OperationsShell } from "./operations-shell";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { MetricStrip } from "~/components/shared/metric-strip";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { avatarUrl } from "~/lib/avatar-url";
import { toast } from "sonner";

const easeOut = [0.23, 1, 0.32, 1] as const;

function formatDate(value: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-MX", options).format(value);
}

export function DoctorOverview() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const analyticsPeriod = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 30);
    return { from, to };
  }, []);
  const {
    data: appointmentsData,
    isLoading,
    isError: isAppointmentsError,
    refetch,
  } = api.appointments.listMine.useQuery(undefined, {
    enabled: status === "authenticated",
    refetchOnWindowFocus: true,
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
  const {
    data: followUpsData,
    isLoading: areFollowUpsLoading,
    isError: isFollowUpsError,
    refetch: refetchFollowUps,
  } = api.clinical.listFollowUpTasks.useQuery(
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
      <OperationsShell>
        <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-8">
          <Skeleton className="h-16 w-2/3" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </OperationsShell>
    );
  }

  if (!session || session.user.role !== "DOCTOR") return null;

  const isError = isAppointmentsError || Boolean(appointmentsData?.error);
  const allAppointments = appointmentsData?.result ?? [];
  const analytics = analyticsData?.result;
  const followUpTasks = followUpsData?.result ?? [];
  const timezone = analytics?.period.clinicTimezone ?? "America/Mexico_City";
  const {
    todayAppointments,
    upcomingAppointments,
    nextToday,
    pendingCount,
    completedThisMonth,
    activePatients,
  } = getDoctorWorkday(allAppointments, now, timezone);
  const stats = [
    {
      label: "Por atender hoy",
      value: todayAppointments.length,
      href: "/dashboard/appointments",
    },
    {
      label: "Por confirmar",
      value: pendingCount,
      href: "/dashboard/appointments",
    },
    {
      label: "Atendidos este mes",
      value: completedThisMonth,
      href: "/dashboard/appointments",
    },
    {
      label: "Pacientes con citas",
      value: activePatients,
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
    <OperationsShell>
      <div className="px-4 py-6 sm:px-7 sm:py-7">
        <div className="mx-auto max-w-6xl">
          <motion.header
            {...entrance}
            transition={{ duration: 0.24, ease: easeOut }}
            className="border-border mb-8 flex flex-col gap-5 border-b pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
          >
            <div>
              <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                Tu agenda de hoy
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {formatDate(now, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: timezone,
                })}
                · {session.user.name?.split(" ")[0] ?? "Doctor"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <Button
                asChild
                variant="outline"
                className="h-9 min-w-0 px-3 font-medium"
              >
                <Link href="/dashboard/patients">Buscar paciente</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-9 min-w-0 px-3 font-medium"
              >
                <Link href="/dashboard/patients/new">Registrar paciente</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="col-span-2 h-9 px-3 font-medium sm:w-auto"
              >
                <Link href="/dashboard/appointments/new">
                  <Plus className="size-4" />
                  Nueva cita
                </Link>
              </Button>
            </div>
          </motion.header>

          <MetricStrip
            label="Indicadores de la consulta"
            items={stats.map((stat) => ({
              ...stat,
              value: isError ? "—" : stat.value,
            }))}
          />
          {isError && (
            <div
              role="alert"
              className="material-card border-border bg-card text-foreground mb-6 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm"
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

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
            <motion.section
              {...entrance}
              transition={{
                duration: 0.28,
                delay: reducedMotion ? 0 : 0.1,
                ease: easeOut,
              }}
              aria-labelledby="today-title"
              className="material-card border-border bg-card overflow-hidden rounded-3xl border"
            >
              <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
                <div>
                  <h2
                    id="today-title"
                    className="text-foreground text-base font-semibold"
                  >
                    Pacientes de hoy
                  </h2>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {nextToday
                      ? `Siguiente horario: ${nextToday.time}`
                      : `${todayAppointments.length} citas por revisar`}
                  </p>
                </div>
                <Link
                  href="/dashboard/appointments"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-2"
                >
                  Ver agenda <ArrowRight className="size-3.5" />
                </Link>
              </div>
              {isError ? (
                <p className="text-muted-foreground p-6 text-sm">
                  La agenda está pendiente de actualizar. Reintenta la carga
                  para consultar tus citas.
                </p>
              ) : todayAppointments.length > 0 ? (
                <ul className="divide-border divide-y md:max-h-[36rem] md:overflow-y-auto md:overscroll-contain">
                  {todayAppointments.map((appointment, index) => {
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
                          aria-label={`Abrir expediente de ${patientName}, cita a las ${appointment.time}`}
                          className={`group focus-visible:outline-inset hover:bg-muted/40 focus-visible:outline-ring flex min-h-[84px] items-center gap-3 px-4 py-3 transition-colors duration-150 focus-visible:outline-2 sm:gap-4 sm:px-6 ${appointment.id === nextToday?.id ? "bg-muted/35" : ""}`}
                        >
                          <time className="text-muted-foreground w-14 shrink-0 font-mono text-sm tabular-nums">
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
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {patientName
                                .split(" ")
                                .map((part) => part[0])
                                .slice(0, 2)
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground truncate text-sm font-medium">
                              {patientName}
                            </p>
                            <p className="text-muted-foreground mt-1 truncate text-xs">
                              {appointment.service?.name ??
                                appointment.reason ??
                                "Consulta"}{" "}
                              · {appointment.duration} min
                            </p>
                          </div>
                          <span
                            className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${appointment.status === "CONFIRMED" ? "bg-accent text-foreground" : "bg-muted text-foreground"}`}
                          >
                            {appointment.status === "CONFIRMED"
                              ? "Confirmada"
                              : "Por confirmar"}
                          </span>
                          <span className="text-foreground hidden shrink-0 text-xs font-medium 2xl:inline">
                            Abrir expediente
                          </span>
                          <ChevronRight
                            className="text-muted-foreground size-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <div className="bg-muted text-muted-foreground mb-4 flex size-11 items-center justify-center rounded-full">
                    <CalendarClock className="size-5" />
                  </div>
                  <p className="text-foreground text-sm font-medium">
                    Tu agenda está libre por hoy
                  </p>
                  <p className="text-muted-foreground mt-1 max-w-sm text-sm leading-6">
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
                className="material-card border-border bg-card overflow-hidden rounded-3xl border"
              >
                <div className="border-border flex items-center justify-between gap-3 border-b px-5 py-4">
                  <div>
                    <h2
                      id="follow-up-priority-title"
                      className="text-foreground text-sm font-semibold"
                    >
                      Seguimientos prioritarios
                    </h2>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Pendientes asignados a ti o creados por ti
                    </p>
                  </div>
                  <ListTodo
                    className="text-muted-foreground size-4"
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
                ) : isFollowUpsError || followUpsData?.error ? (
                  <div role="alert" className="space-y-3 px-5 py-6 text-sm">
                    <p>No se pudo cargar la lista de seguimiento.</p>
                    <Button
                      variant="outline"
                      onClick={() => void refetchFollowUps()}
                    >
                      Reintentar seguimientos
                    </Button>
                  </div>
                ) : followUpTasks.length ? (
                  <ul className="divide-border divide-y">
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
                            className="focus-visible:outline-ring min-w-0 flex-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                          >
                            <p className="text-foreground truncate text-sm font-medium">
                              {task.title}
                            </p>
                            <p className="text-muted-foreground mt-1 truncate text-xs">
                              {task.patient.user.name ?? "Paciente"} ·{" "}
                              {task.dueAt
                                ? formatDate(new Date(task.dueAt), {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: timezone,
                                  })
                                : "Sin fecha límite"}
                            </p>
                          </Link>
                          {overdue && active && (
                            <span className="bg-muted text-foreground shrink-0 rounded-full px-2 py-1 text-[10px] font-medium">
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
                              className="size-11 shrink-0"
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
                    <p className="text-foreground text-sm font-medium">
                      No hay seguimientos pendientes.
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      Las tareas clínicas aparecerán aquí por fecha límite.
                    </p>
                  </div>
                )}
                <div className="border-border border-t px-5 py-2">
                  <Link
                    href="/dashboard/follow-ups"
                    className="text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex min-h-11 items-center gap-1 text-xs font-medium focus-visible:outline-2"
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
                className="material-card border-border bg-card overflow-hidden rounded-3xl border"
              >
                <div className="border-border flex items-center justify-between border-b px-5 py-4">
                  <div>
                    <h2
                      id="upcoming-title"
                      className="text-foreground text-sm font-semibold"
                    >
                      Próximos días
                    </h2>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Citas posteriores a hoy
                    </p>
                  </div>
                  <ClipboardList
                    className="text-muted-foreground size-4"
                    aria-hidden="true"
                  />
                </div>
                {isError ? (
                  <p className="text-muted-foreground px-5 py-6 text-sm">
                    Las próximas citas no están disponibles. Reintenta la carga
                    de la agenda.
                  </p>
                ) : upcomingAppointments.length ? (
                  <ul className="divide-border divide-y">
                    {upcomingAppointments.map((appointment) => (
                      <li key={appointment.id}>
                        <Link
                          href={`/dashboard/patients/${appointment.patientId}`}
                          className="hover:bg-background flex min-h-16 items-center justify-between gap-3 px-5 py-3 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-foreground truncate text-sm font-medium">
                              {appointment.patient?.user?.name ?? "Paciente"}
                            </p>
                            <p className="text-muted-foreground mt-1 text-xs">
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
                            className="text-muted-foreground size-4 shrink-0"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground px-5 py-8 text-sm">
                    No hay citas futuras registradas.
                  </p>
                )}
              </motion.section>
            </div>
          </div>
          <div className="mt-8 space-y-6">
            <details>
              <summary className="text-muted-foreground hover:text-foreground focus-visible:outline-ring mb-3 min-h-11 cursor-pointer rounded-lg py-3 text-sm font-medium focus-visible:outline-2">
                Actividad de la consulta · últimos 30 días
              </summary>
              <motion.section
                {...entrance}
                transition={{
                  duration: 0.25,
                  delay: reducedMotion ? 0 : 0.08,
                  ease: easeOut,
                }}
                aria-labelledby="operations-title"
                className="material-card border-border bg-card mb-8 overflow-hidden rounded-3xl border"
              >
                <div className="border-border flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:px-6">
                  <div>
                    <p className="text-muted-foreground text-xs tracking-[0.08em] uppercase">
                      Últimos 30 días
                    </p>
                    <h2
                      id="operations-title"
                      className="text-foreground mt-1 text-sm font-semibold"
                    >
                      Actividad de la consulta
                    </h2>
                  </div>
                  <Link
                    href="/dashboard/follow-ups"
                    className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring inline-flex min-h-11 items-center gap-1 self-start rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-2 sm:self-auto"
                  >
                    Ver análisis <ArrowRight className="size-3.5" />
                  </Link>
                </div>
                {isAnalyticsError ? (
                  <div
                    role="alert"
                    className="text-muted-foreground flex flex-col gap-3 px-5 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"
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
                  <div className="text-muted-foreground px-5 py-5 text-sm sm:px-6">
                    <p>
                      Para ver actividad y seguimiento, selecciona un
                      consultorio con acceso clínico.
                    </p>
                    <Link
                      href="/dashboard/workspace"
                      className="text-foreground mt-2 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
                    >
                      Revisar consultorio
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="divide-border grid divide-y sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3 lg:divide-x xl:grid-cols-6">
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
                          value:
                            analytics?.appointments.lifecycleEvents.cancelled,
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
                            className="group focus-visible:outline-inset hover:bg-background focus-visible:outline-ring block min-h-full px-5 py-4 transition-colors focus-visible:z-10 focus-visible:outline-2 sm:px-6"
                          >
                            <p className="text-muted-foreground group-hover:text-muted-foreground text-xs">
                              {metric.label}
                            </p>
                            <p className="text-foreground mt-1 text-lg font-semibold tracking-tight tabular-nums">
                              {isAnalyticsLoading ? "—" : (metric.value ?? 0)}
                            </p>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {metric.detail}
                            </p>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                    <p className="border-border text-muted-foreground border-t px-5 py-3 text-xs leading-5 sm:px-6">
                      Las cancelaciones y ausencias cuentan transiciones
                      auditadas desde que se habilitó el registro; el historial
                      previo no se reconstruye. La ocupación usa el horario
                      recurrente actual, no contempla excepciones y cuenta citas
                      pendientes o confirmadas. Zona:{" "}
                      {analytics?.period.clinicTimezone ?? "—"}.
                    </p>
                  </>
                )}
              </motion.section>
            </details>
          </div>
        </div>
      </div>
    </OperationsShell>
  );
}
