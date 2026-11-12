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
import { OperationsShell } from "./operations-shell";
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

export function DoctorOverview() {
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
    isError: isAppointmentsError,
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
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-8">
          <Skeleton className="h-16 w-2/3" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </main>
      </OperationsShell>
    );
  }

  if (!session || session.user.role !== "DOCTOR") return null;

  const isError = isAppointmentsError || Boolean(appointmentsData?.error);
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
        ? `Primera cita a las ${todayAppointments[0]?.time}`
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
      detail: formatDate(now, {
        month: "long",
        year: "numeric",
        timeZone: "America/Mexico_City",
      }),
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
    <OperationsShell>
      <main className="bg-background min-h-[100dvh] px-4 py-7 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <motion.header
            {...entrance}
            transition={{ duration: 0.24, ease: easeOut }}
            className="border-border mb-8 flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
                Resumen de consulta
              </p>
              <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                Hola, {session.user.name?.split(" ")[0] ?? "doctor"}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {formatDate(now, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "America/Mexico_City",
                })}
                . Aquí tienes el estado de tu operación.
              </p>
            </div>
            <Button asChild className="h-11 w-full px-4 sm:w-auto">
              <Link href="/dashboard/appointments/new">
                <Plus className="mr-2 size-4" />
                Nueva cita
              </Link>
            </Button>
          </motion.header>

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
                    Agenda de hoy
                  </h2>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {todayAppointments.length} citas confirmadas o pendientes
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
                <ul className="divide-border divide-y">
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
                          className="group focus-visible:outline-inset hover:bg-background focus-visible:outline-ring flex min-h-[76px] items-center gap-4 px-5 py-3 transition-colors duration-150 focus-visible:outline-2 sm:px-6"
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
                            className={`hidden inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${appointment.status === "CONFIRMED" ? "bg-accent text-foreground" : "bg-muted text-foreground"}`}
                          >
                            {appointment.status === "CONFIRMED"
                              ? "Confirmada"
                              : "Por confirmar"}
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
                                    timeZone: "America/Mexico_City",
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
                      Próximas citas
                    </h2>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Siguientes en tu agenda
                    </p>
                  </div>
                  <ClipboardList
                    className="text-muted-foreground size-4"
                    aria-hidden="true"
                  />
                </div>
                {upcomingAppointments.length ? (
                  <ul className="divide-border divide-y">
                    {upcomingAppointments.slice(0, 4).map((appointment) => (
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

              <motion.section
                {...entrance}
                transition={{
                  duration: 0.28,
                  delay: reducedMotion ? 0 : 0.18,
                  ease: easeOut,
                }}
                aria-labelledby="shortcuts-title"
                className="material-card border-border bg-card rounded-3xl border p-5"
              >
                <h2
                  id="shortcuts-title"
                  className="text-foreground text-sm font-semibold"
                >
                  Accesos rápidos
                </h2>
                <div className="divide-border mt-3 divide-y">
                  <Link
                    href="/dashboard/patients/new"
                    className="text-muted-foreground hover:text-foreground flex min-h-12 items-center justify-between gap-3 py-2 text-sm transition-colors"
                  >
                    Registrar paciente{" "}
                    <ArrowRight className="text-muted-foreground size-4" />
                  </Link>
                  <Link
                    href="/dashboard/services"
                    className="text-muted-foreground hover:text-foreground flex min-h-12 items-center justify-between gap-3 py-2 text-sm transition-colors"
                  >
                    Administrar servicios{" "}
                    <ArrowRight className="text-muted-foreground size-4" />
                  </Link>
                  <Link
                    href="/dashboard/schedule"
                    className="text-muted-foreground hover:text-foreground flex min-h-12 items-center justify-between gap-3 py-2 text-sm transition-colors"
                  >
                    Configurar horarios{" "}
                    <ArrowRight className="text-muted-foreground size-4" />
                  </Link>
                </div>
              </motion.section>
            </div>
          </div>
          <div className="mt-8 space-y-6">
            {" "}
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
                      className="group material-card border-border bg-card hover:border-foreground/30 focus-visible:outline-ring block rounded-3xl border p-5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground text-sm">
                          {stat.label}
                        </span>
                        <Icon
                          className="text-muted-foreground size-4 transition-transform duration-150 group-hover:-translate-y-0.5"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="text-foreground mt-5 text-3xl font-semibold tracking-[-0.04em] tabular-nums">
                        {stat.value}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {stat.detail}
                      </p>
                    </Link>
                  </motion.div>
                );
              })}
            </section>{" "}
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
              <div className="border-border flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
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
                    Para ver actividad y seguimiento, selecciona un consultorio
                    con acceso clínico.
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
                          <p className="text-foreground mt-2 text-2xl font-semibold tracking-[-0.04em] tabular-nums">
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
                    Las cancelaciones y ausencias cuentan transiciones auditadas
                    desde que se habilitó el registro; el historial previo no se
                    reconstruye. La ocupación usa el horario recurrente actual,
                    no contempla excepciones y cuenta citas pendientes o
                    confirmadas. Zona: {analytics?.period.clinicTimezone ?? "—"}
                    .
                  </p>
                </>
              )}
            </motion.section>
          </div>
        </div>
      </main>
    </OperationsShell>
  );
}
