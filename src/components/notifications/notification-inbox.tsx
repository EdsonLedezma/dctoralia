"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  ExternalLink,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { MotionList } from "~/components/shared/motion-list";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

type InboxRole = "DOCTOR" | "PATIENT";
type NotificationFilter = "ALL" | "UNREAD";

function NotificationIcon({ type }: { type: string }) {
  if (
    type === "APPOINTMENT_RESCHEDULED" ||
    type === "APPOINTMENT_RESCHEDULE_REQUEST"
  ) {
    return <Clock3 className="h-5 w-5" />;
  }
  if (type === "FOLLOW_UP_TASK_ASSIGNED" || type === "FOLLOW_UP_TASK_DUE") {
    return <ClipboardList className="h-5 w-5" />;
  }
  if (type.startsWith("APPOINTMENT_")) {
    return <CalendarDays className="h-5 w-5" />;
  }
  return <Bell className="h-5 w-5" />;
}

function formatCreatedAt(value: Date | string) {
  return new Date(value).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationInbox({ role }: { role: InboxRole }) {
  const utils = api.useUtils();
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const [visibleLimit, setVisibleLimit] = useState(8);
  const {
    data: notificationsRes,
    isLoading,
    isError,
  } = api.notifications.getMyNotifications.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const markAsReadMutation = api.notifications.markAsRead.useMutation();
  const markAllAsReadMutation = api.notifications.markAllAsRead.useMutation();
  const deleteNotificationMutation = api.notifications.delete.useMutation();
  const notifications = notificationsRes?.result ?? [];
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const visibleNotifications = useMemo(
    () =>
      filter === "UNREAD"
        ? notifications.filter((notification) => !notification.isRead)
        : notifications,
    [filter, notifications],
  );
  const displayedNotifications = visibleNotifications.slice(0, visibleLimit);

  const refreshInbox = async () => {
    await Promise.all([
      utils.notifications.getMyNotifications.invalidate(),
      utils.notifications.unreadCount.invalidate(),
    ]);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      unwrapTrpcResult(await markAsReadMutation.mutateAsync({ id }));
      await refreshInbox();
      toast.success("Aviso marcado como leído");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el aviso",
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      unwrapTrpcResult(await markAllAsReadMutation.mutateAsync());
      await refreshInbox();
      toast.success("Tu bandeja está al día");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron actualizar los avisos",
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      unwrapTrpcResult(await deleteNotificationMutation.mutateAsync({ id }));
      await refreshInbox();
      toast.success("Aviso eliminado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar el aviso",
      );
    }
  };

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-5 flex flex-col gap-4 border-b border-[#ebebeb] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.08em] text-[#737373] uppercase">
              Centro de avisos
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Notificaciones
            </h1>
            <p className="mt-1 text-sm text-[#737373]">
              Cambios importantes de tus citas y actividad de tu cuenta.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => void handleMarkAllAsRead()}
              disabled={markAllAsReadMutation.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              Marcar todas como leídas
            </Button>
          )}
        </header>

        <div
          className="mb-4 flex items-center gap-2"
          aria-label="Filtrar notificaciones"
        >
          <button
            type="button"
            aria-pressed={filter === "ALL"}
            onClick={() => {
              setFilter("ALL");
              setVisibleLimit(8);
            }}
            className={`min-h-10 rounded-md px-3 text-sm font-medium transition-colors ${filter === "ALL" ? "bg-[#171717] text-white" : "text-[#525252] hover:bg-[#f0f0f0]"}`}
          >
            Todas{" "}
            <span className="ml-1 opacity-70">{notifications.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={filter === "UNREAD"}
            onClick={() => {
              setFilter("UNREAD");
              setVisibleLimit(8);
            }}
            className={`min-h-10 rounded-md px-3 text-sm font-medium transition-colors ${filter === "UNREAD" ? "bg-[#171717] text-white" : "text-[#525252] hover:bg-[#f0f0f0]"}`}
          >
            Sin leer <span className="ml-1 opacity-70">{unreadCount}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-lg border border-[#ebebeb] bg-white"
              />
            ))}
            <span className="sr-only">Cargando avisos</span>
          </div>
        ) : isError || notificationsRes?.error ? (
          <Card className="border-[#ebebeb] bg-white shadow-none">
            <CardContent className="p-6 text-sm text-red-700" role="alert">
              No se pudieron cargar tus avisos. Intenta nuevamente.
            </CardContent>
          </Card>
        ) : visibleNotifications.length === 0 ? (
          <Card className="border-[#ebebeb] bg-white shadow-none">
            <CardContent className="py-12 text-center">
              <Bell className="mx-auto mb-4 h-10 w-10 text-[#a3a3a3]" />
              <h2 className="mb-2 text-base font-semibold">
                {filter === "UNREAD"
                  ? "Ya estás al día"
                  : "Aún no tienes avisos"}
              </h2>
              <p className="mx-auto max-w-sm text-sm text-[#737373]">
                {filter === "UNREAD"
                  ? "Los avisos pendientes aparecerán aquí."
                  : role === "DOCTOR"
                    ? "Las solicitudes y cambios de citas aparecerán aquí."
                    : "Las confirmaciones y cambios de tus citas aparecerán aquí."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <MotionList className="space-y-3">
            {displayedNotifications.map((notification) => {
              const counterpart =
                role === "DOCTOR"
                  ? notification.patient.user.name
                  : notification.doctor.user.name;
              const actionHref = notification.followUpTaskId
                ? "/dashboard/follow-ups"
                : notification.appointmentId
                  ? role === "DOCTOR"
                    ? "/dashboard/appointments"
                    : `/patient/appointments/${notification.appointmentId}`
                  : null;
              return (
                <Card
                  key={notification.id}
                  className={`border-[#ebebeb] bg-white shadow-none transition-[opacity,box-shadow] duration-200 ${notification.isRead ? "opacity-70" : "border-l-2 border-l-[#171717]"}`}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${notification.isRead ? "bg-[#f5f5f5] text-[#737373]" : "bg-[#f1f1f1] text-[#171717]"}`}
                      >
                        <NotificationIcon type={notification.type} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold text-[#171717]">
                            {notification.title}
                          </h2>
                          {!notification.isRead && (
                            <Badge className="bg-[#171717] text-white">
                              Nuevo
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1.5 text-sm leading-5 text-[#525252]">
                          {notification.message}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#737373]">
                          <span>{formatCreatedAt(notification.createdAt)}</span>
                          {counterpart && (
                            <span>
                              {role === "DOCTOR" ? "Paciente" : "Consultorio"}:{" "}
                              {counterpart}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {actionHref && (
                            <Link
                              href={actionHref}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[#404040] transition-colors hover:bg-[#f5f5f5] hover:text-black focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:outline-none"
                            >
                              {notification.followUpTaskId
                                ? "Ver seguimiento"
                                : "Ver cita"}{" "}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {!notification.isRead && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="min-h-10 min-w-10"
                            aria-label="Marcar como leído"
                            disabled={markAsReadMutation.isPending}
                            onClick={() =>
                              void handleMarkAsRead(notification.id)
                            }
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="min-h-10 min-w-10"
                          aria-label="Eliminar aviso"
                          disabled={deleteNotificationMutation.isPending}
                          onClick={() => void handleDelete(notification.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </MotionList>
        )}
        {!isLoading &&
          !isError &&
          visibleNotifications.length > displayedNotifications.length && (
            <div className="pt-4 text-center">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                onClick={() => setVisibleLimit((limit) => limit + 8)}
              >
                Cargar avisos anteriores
              </Button>
            </div>
          )}
      </div>
    </div>
  );
}
