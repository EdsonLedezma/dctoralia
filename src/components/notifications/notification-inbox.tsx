"use client";

import { useState } from "react";
import Link from "next/link";
import { notificationTarget } from "./notification-target";
import { useInboxPreferences } from "./inbox-preferences";
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

export function NotificationInbox({
  role,
  compact = false,
  onNavigate,
}: {
  role: InboxRole;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { preferences } = useInboxPreferences();
  const utils = api.useUtils();
  const [filterChoice, setFilter] = useState<NotificationFilter | null>(null);
  const filter = filterChoice ?? (preferences.unreadOnly ? "UNREAD" : "ALL");
  const [visibleLimit, setVisibleLimit] = useState(0);
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
  const visibleNotifications =
    filter === "UNREAD"
      ? notifications.filter((notification) => !notification.isRead)
      : notifications;
  const displayedNotifications = visibleNotifications.slice(
    0,
    visibleLimit || preferences.pageSize,
  );

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
    <div
      className={
        compact
          ? "bg-background px-3 py-4"
          : "bg-background px-4 py-5 sm:px-7 sm:py-6"
      }
    >
      <div className="mx-auto max-w-6xl">
        <header className="border-border mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            {!compact && (
              <p className="text-muted-foreground text-xs">Centro de avisos</p>
            )}
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Notificaciones
            </h1>
            {!compact && (
              <p className="text-muted-foreground mt-1 text-sm">
                Cambios importantes de tus citas y actividad de tu cuenta.
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              className="w-full text-xs sm:w-auto"
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
              setVisibleLimit(0);
            }}
            className={`min-h-10 rounded-md px-3 text-sm font-medium transition-colors ${filter === "ALL" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            Todas{" "}
            <span className="ml-1 opacity-70">{notifications.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={filter === "UNREAD"}
            onClick={() => {
              setFilter("UNREAD");
              setVisibleLimit(0);
            }}
            className={`min-h-10 rounded-md px-3 text-sm font-medium transition-colors ${filter === "UNREAD" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            Sin leer <span className="ml-1 opacity-70">{unreadCount}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="material-card border-border bg-card h-24 animate-pulse rounded-2xl border"
              />
            ))}
            <span className="sr-only">Cargando avisos</span>
          </div>
        ) : isError || notificationsRes?.error ? (
          <Card className="border-border bg-card shadow-none">
            <CardContent className="text-destructive p-6 text-sm" role="alert">
              No se pudieron cargar tus avisos. Intenta nuevamente.
            </CardContent>
          </Card>
        ) : visibleNotifications.length === 0 ? (
          <Card className="border-border bg-card shadow-none">
            <CardContent className="py-12 text-center">
              <Bell className="text-muted-foreground mx-auto mb-4 h-10 w-10" />
              <h2 className="mb-2 text-base font-semibold">
                {filter === "UNREAD"
                  ? "Ya estás al día"
                  : "Aún no tienes avisos"}
              </h2>
              <p className="text-muted-foreground mx-auto max-w-sm text-sm">
                {filter === "UNREAD"
                  ? "Los avisos pendientes aparecerán aquí."
                  : role === "DOCTOR"
                    ? "Las solicitudes y cambios de citas aparecerán aquí."
                    : "Las confirmaciones y cambios de tus citas aparecerán aquí."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <MotionList className="notification-list">
            {displayedNotifications.map((notification) => {
              const counterpart =
                role === "DOCTOR"
                  ? notification.patient.user.name
                  : notification.doctor.user.name;
              const actionHref = notificationTarget(role, notification);
              return (
                <Card
                  key={notification.id}
                  className={`notification-row transition-colors ${notification.isRead ? "" : "notification-row-unread"}`}
                >
                  <CardContent className="px-3 py-3 sm:px-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${notification.isRead ? "bg-muted text-muted-foreground" : "bg-muted text-foreground"}`}
                      >
                        <NotificationIcon type={notification.type} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-foreground text-sm font-semibold">
                            {actionHref ? (
                              <Link
                                href={actionHref}
                                onClick={() => {
                                  if (!notification.isRead)
                                    void handleMarkAsRead(notification.id);
                                  onNavigate?.();
                                }}
                                className="underline-offset-4 hover:underline"
                              >
                                {notification.title}
                              </Link>
                            ) : (
                              notification.title
                            )}
                          </h2>
                          {!notification.isRead && (
                            <Badge className="bg-secondary text-foreground">
                              Nuevo
                            </Badge>
                          )}
                        </div>
                        {preferences.showDetails && (
                          <p className="text-muted-foreground mt-1 text-[13px] leading-5">
                            {notification.message}
                          </p>
                        )}
                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span>{formatCreatedAt(notification.createdAt)}</span>
                          {counterpart && (
                            <span>
                              {role === "DOCTOR" ? "Paciente" : "Consultorio"}:{" "}
                              {counterpart}
                            </span>
                          )}

                          {actionHref && (
                            <Link
                              href={actionHref}
                              onClick={() => {
                                if (!notification.isRead)
                                  void handleMarkAsRead(notification.id);
                                onNavigate?.();
                              }}
                              className="text-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
                            className="size-9"
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
                          className="size-9"
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
                onClick={() =>
                  setVisibleLimit(
                    (limit) =>
                      (limit || preferences.pageSize) + preferences.pageSize,
                  )
                }
              >
                Cargar avisos anteriores
              </Button>
            </div>
          )}
      </div>
    </div>
  );
}
