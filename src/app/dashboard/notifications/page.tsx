"use client";

import { Bell, Calendar, Check, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { MotionList } from "~/components/shared/motion-list";
import { ProductShell } from "~/components/shell/product-shell";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

type NotificationType =
  | "APPOINTMENT_BOOKED"
  | "APPOINTMENT_RESCHEDULE_REQUEST"
  | "APPOINTMENT_RESCHEDULED"
  | "APPOINTMENT_CANCELLED";

function NotificationIcon({ type }: { type: NotificationType }) {
  if (type === "APPOINTMENT_BOOKED") {
    return <Calendar className="h-5 w-5 text-[#6b6b6b]" />;
  }
  if (
    type === "APPOINTMENT_RESCHEDULED" ||
    type === "APPOINTMENT_RESCHEDULE_REQUEST"
  ) {
    return <Clock className="h-5 w-5 text-[#6b6b6b]" />;
  }
  if (type === "APPOINTMENT_CANCELLED") {
    return <X className="h-5 w-5 text-[#6b6b6b]" />;
  }
  return <Bell className="h-5 w-5 text-[#6b6b6b]" />;
}

function notificationColor(type: NotificationType) {
  switch (type) {
    case "APPOINTMENT_BOOKED":
      return "border-l-2 border-l-emerald-500";
    case "APPOINTMENT_RESCHEDULED":
    case "APPOINTMENT_RESCHEDULE_REQUEST":
      return "border-l-2 border-l-amber-500";
    case "APPOINTMENT_CANCELLED":
      return "border-l-2 border-l-rose-500";
    default:
      return "border-l-2 border-l-[#ebebeb]";
  }
}

export default function NotificationsPage() {
  const utils = api.useUtils();
  const {
    data: notificationsRes,
    isLoading,
    isError,
  } = api.notifications.getMyNotifications.useQuery();
  const markAsReadMutation = api.notifications.markAsRead.useMutation();
  const markAllAsReadMutation = api.notifications.markAllAsRead.useMutation();
  const deleteNotificationMutation = api.notifications.delete.useMutation();

  const notifications = notificationsRes?.result ?? [];
  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      unwrapTrpcResult(await markAsReadMutation.mutateAsync({ id }));
      await utils.notifications.getMyNotifications.invalidate();
      toast.success("Notificación marcada como leída");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la notificación",
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      unwrapTrpcResult(await markAllAsReadMutation.mutateAsync());
      await utils.notifications.getMyNotifications.invalidate();
      toast.success("Todas las notificaciones están al día");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron actualizar las notificaciones",
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      unwrapTrpcResult(await deleteNotificationMutation.mutateAsync({ id }));
      await utils.notifications.getMyNotifications.invalidate();
      toast.success("Notificación eliminada");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la notificación",
      );
    }
  };

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <div className="min-h-screen bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-5 flex justify-end">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  onClick={() => void handleMarkAllAsRead()}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Marcar todas como leídas
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-4" aria-busy="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-lg border border-[#ebebeb] bg-white"
                  />
                ))}
                <span className="sr-only">Cargando notificaciones</span>
              </div>
            ) : isError || notificationsRes?.error ? (
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardContent className="p-6 text-sm text-red-700" role="alert">
                  No se pudieron cargar las notificaciones. Intenta nuevamente.
                </CardContent>
              </Card>
            ) : notifications.length === 0 ? (
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardContent className="py-12 text-center">
                  <Bell className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h2 className="mb-2 text-lg font-semibold">
                    No hay notificaciones
                  </h2>
                  <p className="text-gray-600">
                    Los cambios de citas aparecerán aquí.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <MotionList className="space-y-4">
                {notifications.map((notification) => {
                  const type = notification.type as NotificationType;
                  return (
                    <Card
                      key={notification.id}
                      className={`border-[#ebebeb] bg-white shadow-none transition-[opacity,box-shadow] duration-200 ${notificationColor(type)} ${notification.isRead ? "opacity-60" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="mt-1 shrink-0">
                            <NotificationIcon type={type} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <h2 className="text-sm font-semibold text-gray-900">
                                {notification.title}
                              </h2>
                              {!notification.isRead && <Badge>Nueva</Badge>}
                            </div>
                            <p className="mb-2 text-sm text-gray-700">
                              {notification.message}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                              <span>
                                {new Date(
                                  notification.createdAt,
                                ).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span>
                                Paciente:{" "}
                                {notification.patient.user.name ?? "Sin nombre"}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {!notification.isRead && (
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label="Marcar como leída"
                                disabled={markAsReadMutation.isPending}
                                onClick={() =>
                                  void handleMarkAsRead(notification.id)
                                }
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Eliminar notificación"
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
          </div>
        </div>
      </ProductShell>
    </DashboardWrapper>
  );
}
