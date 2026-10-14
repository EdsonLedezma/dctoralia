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
  if (priority === "URGENT") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "HIGH") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-[#ebebeb] bg-white text-[#737373]";
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
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "FAILED" || status === "DEAD_LETTER")
    return "border-red-200 bg-red-50 text-red-700";
  if (status === "CANCELLED")
    return "border-[#ebebeb] bg-[#fafafa] text-[#737373]";
  return "border-blue-200 bg-blue-50 text-blue-800";
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
        <main className="min-h-[calc(100dvh-3.5rem)] bg-[#fafafa] px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 font-mono text-[11px] tracking-[0.08em] text-[#888] uppercase">
                  Operación clínica
                </p>
                <h1 className="text-[26px] leading-8 font-semibold tracking-[-0.8px] text-[#171717]">
                  Seguimiento
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#6b6b6b]">
                  Atiende pendientes, revisa resultados y mantén cada plan en
                  movimiento entre consultas.
                </p>
              </div>
              <Link href="/dashboard/patients">
                <Button variant="outline" className="h-9 rounded-md">
                  Abrir pacientes
                  <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </header>

            <section
              aria-label="Resumen operativo de los últimos 30 días"
              className="grid overflow-hidden rounded-lg border border-[#ebebeb] bg-white sm:grid-cols-2 lg:grid-cols-4"
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

            <section className="rounded-lg border border-[#ebebeb] bg-white px-5 py-4">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#171717]">
                    Actividad registrada en el periodo
                  </h2>
                  <p className="mt-1 text-xs text-[#737373]">
                    Cambios de estado capturados desde que se habilitó el
                    registro.
                  </p>
                </div>
                <span className="font-mono text-[10px] text-[#888]">
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
              <p className="mt-4 border-t border-[#ebebeb] pt-3 text-[11px] text-[#737373]">
                Cierre de tareas con vencimiento en el periodo:{" "}
                {summary?.followUps.completionRate == null
                  ? "—"
                  : `${Math.round(summary.followUps.completionRate * 100)}%`}{" "}
                de {summary?.followUps.denominator ?? "—"} tareas no canceladas.
                Se calcula con el estado actual.
              </p>
            </section>

            <section className="overflow-hidden rounded-lg border border-[#ebebeb] bg-white">
              <div className="flex flex-col gap-2 border-b border-[#ebebeb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#171717]">
                    Tareas de seguimiento
                  </h2>
                  <p className="mt-1 text-xs text-[#737373]">
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
                  className="h-8"
                  disabled={isFetching}
                  onClick={() => void refetch()}
                >
                  <RefreshCw
                    className={`mr-1.5 size-3.5 ${isFetching ? "animate-spin motion-reduce:animate-none" : ""}`}
                  />
                  {isFetching ? "Actualizando…" : "Actualizar"}
                </Button>
              </div>

              <div className="flex flex-col gap-2 border-b border-[#ebebeb] px-5 py-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1 sm:max-w-sm">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#a3a3a3]" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar paciente o tarea"
                    aria-label="Buscar paciente o tarea"
                    className="h-9 pl-9 text-sm"
                  />
                </div>
                <Select
                  value={filter}
                  onValueChange={(value) => setFilter(value as typeof filter)}
                >
                  <SelectTrigger className="h-9 w-full sm:w-48">
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
                <div className="p-6 text-sm text-red-700" role="alert">
                  No se pudo cargar el seguimiento. Actualiza la página e
                  inténtalo de nuevo.
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
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#ebebeb] bg-[#fafafa]">
                    <ListTodo className="h-4 w-4 text-[#737373]" />
                  </div>
                  <p className="text-sm font-medium text-[#171717]">
                    {search
                      ? "No encontramos tareas con esa búsqueda."
                      : filter === "OVERDUE"
                        ? "No tienes seguimientos vencidos."
                        : filter === "COMPLETED"
                          ? "Aún no has completado seguimientos."
                          : "No tienes seguimientos pendientes."}
                  </p>
                  <p className="mt-1 text-sm text-[#737373]">
                    {search
                      ? "Prueba con otro nombre de paciente o título."
                      : "Puedes crear el siguiente paso desde la ficha de un paciente."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[#ebebeb]">
                  {visibleTasks.map((task) => {
                    const overdue = isOverdue(task.dueAt, task.status);
                    const active =
                      task.status === "OPEN" || task.status === "IN_PROGRESS";
                    return (
                      <li
                        key={task.id}
                        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/patients/${task.patientId}`}
                              className="truncate text-sm font-medium text-[#171717] hover:underline"
                            >
                              {task.patient.user.name}
                            </Link>
                            <span className="rounded border border-[#ebebeb] px-1.5 py-0.5 font-mono text-[10px] text-[#737373]">
                              {task.status === "IN_PROGRESS"
                                ? "En curso"
                                : task.status === "COMPLETED"
                                  ? "Completada"
                                  : task.status === "CANCELLED"
                                    ? "Cancelada"
                                    : "Pendiente"}
                            </span>
                            {overdue && (
                              <span className="font-mono text-[10px] text-[#b42318]">
                                Vencida
                              </span>
                            )}
                            <span
                              className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${priorityClass(task.priority)}`}
                            >
                              {priorityLabel(task.priority)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-[#404040]">
                            {task.title}
                          </p>
                          {task.details && (
                            <p className="mt-1 line-clamp-2 max-w-3xl text-xs leading-5 text-[#737373]">
                              {task.details}
                            </p>
                          )}
                          <p className="mt-1 font-mono text-[10px] text-[#888]">
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
                                    className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${reminderStatusClass(reminder.status)}`}
                                  >
                                    {reminder.channel === "WHATSAPP"
                                      ? "WhatsApp"
                                      : "SMS"}
                                    : {reminderStatusLabel(reminder.status)}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-[#888]">
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
                                className="h-8"
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
                              className="h-8"
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
                          <span className="shrink-0 text-xs text-[#737373]">
                            Asignada a otro médico
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <p className="text-xs leading-5 text-[#888]">
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
    <div className="flex min-h-28 items-start justify-between border-b border-[#ebebeb] px-4 py-4 sm:border-r sm:last:border-r-0 lg:border-b-0">
      <div>
        <p className="text-xs text-[#737373]">{label}</p>
        <p
          className={`mt-2 font-mono text-2xl font-medium tracking-[-0.06em] ${danger ? "text-[#b42318]" : "text-[#171717]"}`}
        >
          {value === undefined ? "—" : value.toLocaleString("es-MX")}
        </p>
        <p className="mt-1 text-[11px] text-[#888]">{detail}</p>
      </div>
      <Icon className="h-4 w-4 text-[#a3a3a3]" />
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
      <p className="font-mono text-xl font-medium tracking-[-0.05em] text-[#171717]">
        {value === undefined ? "—" : value.toLocaleString("es-MX")}
      </p>
      <p className="mt-1 text-[11px] text-[#737373]">{label}</p>
    </div>
  );
}
