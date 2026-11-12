"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Check,
  Clock3,
  ListTodo,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { ProductShell } from "~/components/shell/product-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

function formatDate(value: Date | null) {
  if (!value) return "Sin fecha límite";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

function isOverdue(value: Date | null, status: string) {
  return (
    value !== null &&
    new Date(value).getTime() < Date.now() &&
    status !== "COMPLETED" &&
    status !== "CANCELLED"
  );
}

function priorityLabel(priority: string) {
  if (priority === "URGENT") return "Urgente";
  if (priority === "HIGH") return "Alta";
  if (priority === "LOW") return "Baja";
  return "Normal";
}

function priorityClass(priority: string) {
  if (priority === "URGENT")
    return "border-foreground/35 bg-secondary text-foreground";
  if (priority === "HIGH")
    return "border-foreground/25 bg-muted text-foreground";
  return "border-border bg-card text-muted-foreground";
}

function reminderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "En cola",
    PROCESSING: "Procesando",
    SENT: "Aceptado",
    DELIVERED: "Entregado",
    READ: "Leído",
    FAILED: "Reintentando",
    DEAD_LETTER: "Requiere revisión",
    CANCELLED: "Cancelado",
  };
  return labels[status] ?? "Estado desconocido";
}

function reminderStatusClass(status: string) {
  if (status === "DELIVERED" || status === "READ")
    return "border-border bg-secondary text-foreground";
  if (status === "FAILED" || status === "DEAD_LETTER")
    return "border-foreground/40 bg-muted text-foreground";
  if (status === "CANCELLED")
    return "border-border bg-background text-muted-foreground";
  return "border-border bg-card text-muted-foreground";
}

export default function FollowUpsPage() {
  const [filter, setFilter] = useState<
    "ACTIVE" | "OVERDUE" | "COMPLETED" | "ALL"
  >("ACTIVE");
  const [search, setSearch] = useState("");
  const utils = api.useUtils();
  const listInput = useMemo(() => {
    const now = new Date();
    return {
      limit: 100,
      includeClosed: filter === "COMPLETED" || filter === "ALL",
      ...(filter === "COMPLETED" ? { status: "COMPLETED" as const } : {}),
      ...(filter === "OVERDUE" ? { dueBefore: now } : {}),
    };
  }, [filter]);
  const { data, isLoading, isFetching, error, refetch } =
    api.clinical.listFollowUpTasks.useQuery(listInput);
  const from = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const to = useMemo(() => new Date(), []);
  const analytics = api.clinical.operationalAnalytics.useQuery({ from, to });

  const updateStatus = api.clinical.updateFollowUpStatus.useMutation({
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
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const tasks = data?.result ?? [];
  const overdueCount = tasks.filter((task) =>
    isOverdue(task.dueAt, task.status),
  ).length;
  const activeTasks = tasks.filter(
    (task) => task.status === "OPEN" || task.status === "IN_PROGRESS",
  );
  const visibleTasks = tasks.filter((task) => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    return (
      !query ||
      task.title.toLocaleLowerCase("es-MX").includes(query) ||
      task.patient.user.name.toLocaleLowerCase("es-MX").includes(query) ||
      Boolean(task.details?.toLocaleLowerCase("es-MX").includes(query))
    );
  });
  const summary = analytics.data?.result;

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <main className="bg-background text-foreground min-h-[calc(100dvh-3.5rem)] px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-muted-foreground mb-2 text-xs tracking-wide">
                  Operación clínica
                </p>
                <h1 className="text-foreground text-3xl leading-tight font-semibold tracking-[-0.8px]">
                  Seguimiento
                </h1>
                <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
                  Atiende pendientes, revisa resultados y mantén cada plan en
                  movimiento entre consultas.
                </p>
              </div>
              <Link href="/dashboard/patients">
                <Button variant="outline" className="min-h-11">
                  Abrir pacientes
                  <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </header>

            <section
              aria-label="Resumen operativo de los últimos 30 días"
              className="material-card border-border bg-card grid overflow-hidden rounded-2xl border sm:grid-cols-2 lg:grid-cols-4"
            >
              <Metric
                label="Citas en periodo"
                value={summary?.appointments.denominator}
                detail="Según fecha programada"
                icon={Clock3}
              />
              <Metric
                label="Consultas firmadas"
                value={summary?.signedEncounters}
                detail="Con nota clínica cerrada"
                icon={Check}
              />
              <Metric
                label={
                  filter === "COMPLETED"
                    ? "Completadas en lista"
                    : "Seguimientos vencidos"
                }
                value={
                  isLoading
                    ? undefined
                    : filter === "COMPLETED"
                      ? tasks.length
                      : overdueCount
                }
                detail={
                  filter === "COMPLETED"
                    ? "Coinciden con el filtro actual"
                    : "Pendientes a la fecha"
                }
                icon={ListTodo}
                danger={filter !== "COMPLETED" && overdueCount > 0}
              />
              <Metric
                label="Mediciones registradas"
                value={summary?.recordedOutcomeAssessments}
                detail="Resultados capturados"
                icon={Activity}
              />
            </section>

            <section className="material-card border-border bg-card rounded-2xl border px-5 py-5">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-foreground text-base font-semibold">
                    Actividad registrada en el periodo
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Cambios de estado capturados desde que se habilitó el
                    registro.
                  </p>
                </div>
                <span className="text-muted-foreground text-xs">
                  Ventana móvil de 30 días
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4 lg:grid-cols-8">
                <EventMetric
                  label="Citas nuevas"
                  value={summary?.appointments.lifecycleEvents.created}
                />
                <EventMetric
                  label="Reagendadas"
                  value={summary?.appointments.lifecycleEvents.rescheduled}
                />
                <EventMetric
                  label="Completadas"
                  value={summary?.appointments.lifecycleEvents.completed}
                />
                <EventMetric
                  label="Ausencias"
                  value={summary?.appointments.lifecycleEvents.noShow}
                />
                <EventMetric
                  label="Canceladas"
                  value={summary?.appointments.lifecycleEvents.cancelled}
                />
                <EventMetric
                  label="Tareas creadas"
                  value={summary?.followUps.transitionsInPeriod.created}
                />
                <EventMetric
                  label="Tareas resueltas"
                  value={summary?.followUps.transitionsInPeriod.completed}
                />
                <EventMetric label="Tareas vencidas" value={overdueCount} />
              </div>
              <p className="border-border text-muted-foreground mt-4 border-t pt-3 text-xs leading-5">
                Cierre de tareas con vencimiento en el periodo:{" "}
                {summary?.followUps.completionRate == null
                  ? "—"
                  : `${Math.round(summary.followUps.completionRate * 100)}%`}{" "}
                de {summary?.followUps.denominator ?? "—"} tareas no canceladas.
                Se calcula con el estado actual.
              </p>
            </section>

            <section className="material-card border-border bg-card overflow-hidden rounded-2xl border">
              <div className="border-border flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-foreground text-base font-semibold">
                    Tareas de seguimiento
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {isLoading
                      ? "Cargando tareas…"
                      : filter === "COMPLETED"
                        ? `${tasks.length} completadas`
                        : `${activeTasks.length} activas · ${overdueCount} vencidas`}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-11"
                  disabled={isFetching}
                  onClick={() => void refetch()}
                >
                  <RefreshCw
                    className={`mr-1.5 size-3.5 ${isFetching ? "animate-spin motion-reduce:animate-none" : ""}`}
                  />
                  {isFetching ? "Actualizando…" : "Actualizar"}
                </Button>
              </div>

              <div className="border-border flex flex-col gap-2 border-b px-5 py-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1 sm:max-w-sm">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar paciente o tarea"
                    aria-label="Buscar paciente o tarea"
                    className="h-11 pl-9 text-sm"
                  />
                </div>
                <Select
                  value={filter}
                  onValueChange={(value) => setFilter(value as typeof filter)}
                >
                  <SelectTrigger className="h-11 w-full sm:w-48">
                    <SelectValue aria-label="Filtrar tareas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Activas</SelectItem>
                    <SelectItem value="OVERDUE">Vencidas</SelectItem>
                    <SelectItem value="COMPLETED">Completadas</SelectItem>
                    <SelectItem value="ALL">Todas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error || data?.error ? (
                <div className="text-foreground p-6 text-sm" role="alert">
                  No se pudo cargar el seguimiento. Inténtalo de nuevo.
                </div>
              ) : isLoading ? (
                <div
                  className="space-y-3 p-5"
                  aria-label="Cargando seguimientos"
                >
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              ) : visibleTasks.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <div className="border-border bg-background mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border">
                    <ListTodo className="text-muted-foreground h-4 w-4" />
                  </div>
                  <p className="text-foreground text-base font-medium">
                    {search
                      ? "No encontramos tareas con esa búsqueda."
                      : filter === "OVERDUE"
                        ? "No tienes seguimientos vencidos."
                        : filter === "COMPLETED"
                          ? "Aún no has completado seguimientos."
                          : "No tienes seguimientos pendientes."}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {search
                      ? "Prueba con otro nombre de paciente o título."
                      : "Puedes crear el siguiente paso desde la ficha de un paciente."}
                  </p>
                </div>
              ) : (
                <ul className="divide-border divide-y">
                  {visibleTasks.map((task) => {
                    const overdue = isOverdue(task.dueAt, task.status);
                    const active =
                      task.status === "OPEN" || task.status === "IN_PROGRESS";
                    return (
                      <li
                        key={task.id}
                        className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/patients/${task.patientId}`}
                              className="text-foreground truncate text-sm font-semibold hover:underline"
                            >
                              {task.patient.user.name}
                            </Link>
                            <span className="border-border text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-xs">
                              {task.status === "IN_PROGRESS"
                                ? "En curso"
                                : task.status === "COMPLETED"
                                  ? "Completada"
                                  : task.status === "CANCELLED"
                                    ? "Cancelada"
                                    : "Pendiente"}
                            </span>
                            {overdue && (
                              <span className="border-foreground/30 bg-secondary text-foreground rounded border px-1.5 py-0.5 text-xs font-medium">
                                Vencida
                              </span>
                            )}
                            <span
                              className={`rounded border px-1.5 py-0.5 font-mono text-xs ${priorityClass(task.priority)}`}
                            >
                              {priorityLabel(task.priority)}
                            </span>
                          </div>
                          <p className="text-foreground mt-1 text-sm font-medium">
                            {task.title}
                          </p>
                          {task.details && (
                            <p className="text-muted-foreground mt-1 line-clamp-2 max-w-3xl text-xs leading-5">
                              {task.details}
                            </p>
                          )}
                          <p className="text-muted-foreground mt-2 text-xs">
                            {formatDate(task.dueAt)} ·{" "}
                            {task.type
                              .replaceAll("_", " ")
                              .toLocaleLowerCase("es-MX")}
                          </p>
                          {task.dueAt && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {task.reminderStatuses.length ? (
                                task.reminderStatuses.map((reminder) => (
                                  <span
                                    key={reminder.channel}
                                    className={`rounded border px-1.5 py-0.5 font-mono text-xs ${reminderStatusClass(reminder.status)}`}
                                  >
                                    {reminder.channel === "WHATSAPP"
                                      ? "WhatsApp"
                                      : "SMS"}
                                    : {reminderStatusLabel(reminder.status)}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  Sin mensaje programado
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {active && task.canUpdate && (
                          <div className="flex shrink-0 gap-2">
                            {task.status === "OPEN" && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="min-h-11"
                                disabled={updateStatus.isPending}
                                onClick={() =>
                                  updateStatus.mutate({
                                    taskId: task.id,
                                    status: "IN_PROGRESS",
                                  })
                                }
                              >
                                Iniciar
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              className="min-h-11"
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                updateStatus.mutate({
                                  taskId: task.id,
                                  status: "COMPLETED",
                                })
                              }
                            >
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                              Resolver
                            </Button>
                          </div>
                        )}
                        {active && !task.canUpdate && (
                          <span className="text-muted-foreground shrink-0 text-xs">
                            Asignada a otro médico
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <p className="text-muted-foreground text-xs leading-5">
              El resumen muestra estados actuales de citas programadas y tareas
              del periodo. Las mediciones se presentan por instrumento y
              versión; un cambio numérico no significa por sí mismo mejoría.
            </p>
          </div>
        </main>
      </ProductShell>
    </DashboardWrapper>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: number | undefined;
  detail: string;
  icon: typeof Activity;
  danger?: boolean;
}) {
  return (
    <div className="border-border flex min-h-28 items-start justify-between border-b px-5 py-5 sm:border-r sm:last:border-r-0 lg:border-b-0">
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p
          className={`mt-2 font-mono text-2xl font-medium tracking-[-0.06em] ${danger ? "text-foreground" : "text-foreground"}`}
        >
          {value === undefined ? "—" : value.toLocaleString("es-MX")}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
      </div>
      <Icon className="text-muted-foreground h-4 w-4" />
    </div>
  );
}

function EventMetric({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <div>
      <p className="text-foreground font-mono text-2xl font-medium tracking-[-0.05em]">
        {value === undefined ? "—" : value.toLocaleString("es-MX")}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{label}</p>
    </div>
  );
}
