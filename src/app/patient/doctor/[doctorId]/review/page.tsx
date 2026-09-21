"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, type RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { ProductShell } from "~/components/shell/product-shell";

type Appointment = Exclude<
  RouterOutputs["appointments"]["listMine"]["result"],
  null
>[number];

export default function LeaveReviewPage() {
  const router = useRouter();
  const params = useParams();
  const doctorId = params.doctorId as string;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState("");

  // Obtener citas completadas
  const { data: appointmentsRes } = api.appointments.listMine.useQuery();
  const completedAppointments =
    appointmentsRes?.result
      ?.filter(
        (apt: Appointment) =>
          apt.status === "COMPLETED" && apt.doctorId === doctorId,
      )
      .sort(
        (a: Appointment, b: Appointment) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      ) ?? [];

  // Obtener mi reseña si existe
  const { data: myReviewRes } = api.review.getMyReview.useQuery({
    doctorId,
  });
  const myReview = myReviewRes?.result;

  // Obtener datos del doctor
  const { data: doctorRes } = api.doctor.getById.useQuery({ id: doctorId });
  const doctor = doctorRes?.result;

  const createReview = api.review.create.useMutation({
    onSuccess: () => {
      toast.success("¡Reseña guardada exitosamente!");
      router.push(`/doctor/${doctorId}`);
    },
    onError: (error) => {
      toast.error(error.message ?? "Error al guardar reseña");
    },
  });

  const updateReview = api.review.update.useMutation({
    onSuccess: () => {
      toast.success("¡Reseña actualizada exitosamente!");
      router.push(`/doctor/${doctorId}`);
    },
    onError: (error) => {
      toast.error(error.message ?? "Error al actualizar reseña");
    },
  });

  const handleSubmit = () => {
    if (!selectedAppointment && !myReview) {
      toast.error("Por favor selecciona una cita");
      return;
    }

    if (rating === 0) {
      toast.error("Por favor selecciona una calificación");
      return;
    }

    if (myReview) {
      updateReview.mutate({
        doctorId,
        rating,
        comment,
      });
    } else {
      createReview.mutate({
        doctorId,
        appointmentId: selectedAppointment,
        rating,
        comment,
      });
    }
  };

  return (
    <ProductShell role="PATIENT">
      <div className="min-h-screen bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-2xl">
          <Card className="border-[#ebebeb] bg-white shadow-none">
            <CardHeader className="border-b border-[#ebebeb]">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span>
                  {myReview ? "Editar tu reseña" : "Dejar una reseña"}
                  {doctor?.user.name ? ` · ${doctor.user.name}` : ""}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Seleccionar cita */}
              {!myReview && completedAppointments.length > 0 && (
                <div>
                  <label className="mb-3 block text-sm font-medium">
                    Selecciona la cita que deseas reseñar
                  </label>
                  <div className="space-y-2">
                    {completedAppointments.map((apt: Appointment) => (
                      <label
                        key={apt.id}
                        className="flex cursor-pointer items-center rounded-md border border-[#ebebeb] p-3 transition-colors hover:bg-[#fafafa]"
                      >
                        <input
                          type="radio"
                          name="appointment"
                          value={apt.id}
                          checked={selectedAppointment === apt.id}
                          onChange={(e) =>
                            setSelectedAppointment(e.target.value)
                          }
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
                          <p className="text-sm text-[#6b6b6b]">
                            {apt.service?.name}
                          </p>
                        </div>
                        <Badge variant="outline">Completada</Badge>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {!myReview && completedAppointments.length === 0 && (
                <div className="rounded-md border border-[#ebebeb] bg-[#fafafa] p-4">
                  <p className="text-sm text-[#6b6b6b]">
                    No tienes citas completadas con este doctor aún. Cuando
                    completes una cita, podrás dejar una reseña.
                  </p>
                </div>
              )}

              {myReview && (
                <div className="rounded-md border border-[#ebebeb] bg-[#fafafa] p-4">
                  <p className="text-sm text-[#6b6b6b]">
                    Ya has dejado una reseña para este doctor. Puedes editarla a
                    continuación.
                  </p>
                </div>
              )}

              {/* Calificación */}
              <div>
                <label className="mb-3 block text-sm font-medium">
                  ¿Cómo fue tu experiencia?
                </label>
                <div className="flex justify-center gap-3 py-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110 focus:outline-none"
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
                  <p className="text-center text-sm text-[#6b6b6b]">
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
                <label className="mb-2 block text-sm font-medium">
                  Cuéntanos tu experiencia (opcional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comparte los detalles de tu consulta, lo que te gustó, y si tienes sugerencias..."
                  rows={6}
                  maxLength={1000}
                />
                <p className="mt-1 text-xs text-[#6b6b6b]">
                  {comment.length}/1000 caracteres
                </p>
              </div>

              {/* Botones */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={handleSubmit}
                  disabled={
                    createReview.isPending ||
                    updateReview.isPending ||
                    rating === 0 ||
                    (!myReview && !selectedAppointment)
                  }
                  className="w-full flex-1 sm:w-auto"
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
                  className="w-full flex-1 sm:w-auto"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProductShell>
  );
}
