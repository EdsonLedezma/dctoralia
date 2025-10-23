"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Bell, Calendar, Check, Clock, X } from "lucide-react"
import { api } from "~/trpc/react"
import { toast } from "sonner"

export default function NotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const utils = api.useUtils()

  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "DOCTOR") {
      router.push("/login")
    }
  }, [session, status, router])

  const { data: notificationsRes, isLoading } = api.notifications.getMyNotifications.useQuery()
  const markAsReadMutation = api.notifications.markAsRead.useMutation({
    onSuccess: () => {
      void utils.notifications.getMyNotifications.invalidate()
      toast.success("Notificación marcada como leída")
    },
  })
  const markAllAsReadMutation = api.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      void utils.notifications.getMyNotifications.invalidate()
      toast.success("Todas las notificaciones marcadas como leídas")
    },
  })
  const deleteNotificationMutation = api.notifications.delete.useMutation({
    onSuccess: () => {
      void utils.notifications.getMyNotifications.invalidate()
      toast.success("Notificación eliminada")
    },
  })

  const notifications = notificationsRes?.result ?? []
  const unreadCount = notifications.filter((n: any) => !n.isRead).length

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate({ id })
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  const handleDelete = (id: string) => {
    deleteNotificationMutation.mutate({ id })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "APPOINTMENT_BOOKED":
        return <Calendar className="w-5 h-5 text-green-600" />
      case "APPOINTMENT_RESCHEDULED":
        return <Clock className="w-5 h-5 text-blue-600" />
      case "APPOINTMENT_CANCELLED":
        return <X className="w-5 h-5 text-red-600" />
      default:
        return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "APPOINTMENT_BOOKED":
        return "bg-green-50 border-green-200"
      case "APPOINTMENT_RESCHEDULED":
        return "bg-blue-50 border-blue-200"
      case "APPOINTMENT_CANCELLED":
        return "bg-red-50 border-red-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando notificaciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notificaciones</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? `Tienes ${unreadCount} notificaciones sin leer` : "Todas las notificaciones están al día"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            <Check className="w-4 h-4 mr-2" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay notificaciones</h3>
              <p className="text-gray-600">
                Cuando tengas nuevas citas o cambios, aparecerán aquí
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification: any) => (
            <Card 
              key={notification.id} 
              className={`${getNotificationColor(notification.type)} ${
                notification.isRead ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <Badge variant="default" className="ml-2">
                          Nueva
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        {new Date(notification.createdAt).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {notification.patient && (
                        <span>
                          Paciente: {notification.patient.user?.name ?? "Sin nombre"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!notification.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(notification.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
