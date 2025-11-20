"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { api } from "~/trpc/react"
import { Button } from "~/components/ui/button"
import { Textarea } from "~/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Star } from "lucide-react"
import { toast } from "sonner"

export default function LeaveReviewPage() {
  const router = useRouter()
  const params = useParams()
  const doctorId = params.doctorId as string

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [selectedAppointment, setSelectedAppointment] = useState("")

  // Obtener citas completadas
  const { data: appointmentsRes } = api.appointments.listMine.useQuery()
  const completedAppointments =
    appointmentsRes?.result
      ?.filter(
        (apt: any) =>
          apt.status === "COMPLETED" && apt.doctorId === doctorId
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      ) || []

  // Obtener mi reseña si existe
  const { data: myReviewRes } = api.review.getMyReview.useQuery({
    doctorId,
  })
  const myReview = myReviewRes?.result

  // Obtener datos del doctor
  const { data: doctorRes } = api.doctor.getById.useQuery({ id: doctorId })
  const doctor = doctorRes?.result

  const createReview = api.review.create.useMutation({
    onSuccess: () => {
      toast.success("¡Reseña guardada exitosamente!")
      router.push(`/doctor/${doctorId}`)
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al guardar reseña")
    },
  })

  const updateReview = api.review.update.useMutation({
    onSuccess: () => {
      toast.success("¡Reseña actualizada exitosamente!")
      router.push(`/doctor/${doctorId}`)
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar reseña")
    },
  })

  const handleSubmit = () => {
    if (!selectedAppointment && !myReview) {
      toast.error("Por favor selecciona una cita")
      return
    }

    if (rating === 0) {
      toast.error("Por favor selecciona una calificación")
      return
    }

    if (myReview) {
      updateReview.mutate({
        doctorId,
        rating,
        comment,
      })
    } else {
      createReview.mutate({
        doctorId,
        appointmentId: selectedAppointment,
        rating,
        comment,
      })
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              {myReview ? "Editar tu reseña" : "Dejar una reseña"}
            </CardTitle>
            <CardDescription>
              {doctor && (
                <span>para <strong>{doctor.user.name}</strong> - {doctor.specialty}</span>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Seleccionar cita */}
            {!myReview && completedAppointments.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-3">
                  Selecciona la cita que deseas reseñar
                </label>
                <div className="space-y-2">
                  {completedAppointments.map((apt: any) => (
                    <label
                      key={apt.id}
                      className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="appointment"
                        value={apt.id}
                        checked={selectedAppointment === apt.id}
                        onChange={(e) => setSelectedAppointment(e.target.value)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium">
                          {new Date(apt.date).toLocaleDateString("es-ES", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                          {" a las "} {apt.time}
                        </p>
                        <p className="text-sm text-gray-600">{apt.service?.name}</p>
                      </div>
                      <Badge variant="outline">Completada</Badge>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!myReview && completedAppointments.length === 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  No tienes citas completadas con este doctor aún. Cuando completes una cita, podrás dejar una reseña.
                </p>
              </div>
            )}

            {myReview && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900">
                  Ya has dejado una reseña para este doctor. Puedes editarla a continuación.
                </p>
              </div>
            )}

            {/* Calificación */}
            <div>
              <label className="block text-sm font-medium mb-3">
                ¿Cómo fue tu experiencia?
              </label>
              <div className="flex gap-3 justify-center py-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      size={40}
                      className={
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center text-sm text-gray-600">
                  {rating === 1 && "Muy insatisfecho"}
                  {rating === 2 && "Insatisfecho"}
                  {rating === 3 && "Neutral"}
                  {rating === 4 && "Satisfecho"}
                  {rating === 5 && "Muy satisfecho"}
                </p>
              )}
            </div>

            {/* Comentario */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Cuéntanos tu experiencia (opcional)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comparte los detalles de tu consulta, lo que te gustó, y si tienes sugerencias..."
                rows={6}
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {comment.length}/1000 caracteres
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={
                  createReview.isPending ||
                  updateReview.isPending ||
                  rating === 0 ||
                  (!myReview && !selectedAppointment)
                }
                className="flex-1"
              >
                {createReview.isPending || updateReview.isPending
                  ? "Guardando..."
                  : myReview
                    ? "Actualizar reseña"
                    : "Publicar reseña"}
              </Button>
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
