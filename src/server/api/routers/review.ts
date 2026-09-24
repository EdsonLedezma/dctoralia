import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

async function refreshDoctorRating(db: PrismaClient, doctorId: string) {
  const allReviews = await db.review.findMany({
    where: { doctorId },
    select: { rating: true },
  });

  const avgRating =
    allReviews.length > 0
      ? allReviews.reduce((sum, review) => sum + review.rating, 0) /
        allReviews.length
      : 0;

  await db.doctor.update({
    where: { id: doctorId },
    data: {
      rating: avgRating,
      totalReviews: allReviews.length,
    },
  });
}

export const reviewRouter = createTRPCRouter({
  // Crear reseña (paciente al doctor tras completar cita)
  create: protectedProcedure
    .input(
      z.object({
        doctorId: z.string(),
        appointmentId: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Obtener paciente del usuario autenticado
        const patient = await ctx.db.patient.findFirst({
          where: { userId: ctx.session.user.id },
        });

        if (!patient) {
          return trpcFailure(
            "FORBIDDEN",
            "No eres un paciente registrado",
            403,
          );
        }

        // Verificar que la cita existe y está COMPLETED
        const appointment = await ctx.db.appointment.findUnique({
          where: { id: input.appointmentId },
        });

        if (!appointment) {
          return trpcFailure(
            "APPOINTMENT_NOT_FOUND",
            "Cita no encontrada",
            404,
          );
        }

        if (appointment.status !== "COMPLETED") {
          return trpcFailure(
            "APPOINTMENT_NOT_COMPLETED",
            "Solo puedes dejar reseña en citas completadas",
            400,
          );
        }

        if (appointment.patientId !== patient.id) {
          return trpcFailure("FORBIDDEN", "No tienes acceso a esta cita", 403);
        }

        if (appointment.doctorId !== input.doctorId) {
          return trpcFailure(
            "DOCTOR_MISMATCH",
            "La cita no pertenece a este doctor",
            400,
          );
        }

        // Crear o actualizar reseña
        const review = await ctx.db.review.upsert({
          where: {
            doctorId_patientId: {
              doctorId: input.doctorId,
              patientId: patient.id,
            },
          },
          update: {
            rating: input.rating,
            comment: input.comment,
            updatedAt: new Date(),
          },
          create: {
            doctorId: input.doctorId,
            patientId: patient.id,
            rating: input.rating,
            comment: input.comment,
          },
          include: {
            doctor: { select: { id: true, user: { select: { name: true } } } },
            patient: { select: { user: { select: { name: true } } } },
          },
        });

        // Actualizar promedio del doctor
        const allReviews = await ctx.db.review.findMany({
          where: { doctorId: input.doctorId },
        });

        const avgRating =
          allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) /
              allReviews.length
            : 0;

        await ctx.db.doctor.update({
          where: { id: input.doctorId },
          data: {
            rating: avgRating,
            totalReviews: allReviews.length,
          },
        });

        return trpcSuccess(review, "Reseña creada correctamente", 201);
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al crear reseña", 500);
      }
    }),

  // Obtener reseña de un paciente (si existe)
  getMyReview: protectedProcedure
    .input(z.object({ doctorId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const patient = await ctx.db.patient.findFirst({
          where: { userId: ctx.session.user.id },
        });

        if (!patient) {
          return trpcFailure("PATIENT_NOT_FOUND", "No eres paciente", 404);
        }

        const review = await ctx.db.review.findUnique({
          where: {
            doctorId_patientId: {
              doctorId: input.doctorId,
              patientId: patient.id,
            },
          },
        });

        if (!review) {
          return trpcFailure(
            "REVIEW_NOT_FOUND",
            "No has dejado reseña para este doctor",
            404,
          );
        }

        return trpcSuccess(review, "Tu reseña");
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al obtener tu reseña", 500);
      }
    }),

  // Obtener todas las reseñas de un doctor (público)
  getByDoctor: publicProcedure
    .input(z.object({ doctorId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const reviews = await ctx.db.review.findMany({
          where: { doctorId: input.doctorId },
          include: {
            patient: {
              select: {
                user: { select: { name: true, image: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        return trpcSuccess(reviews, "Reseñas del doctor");
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al obtener reseñas", 500);
      }
    }),

  // Actualizar mi reseña
  update: protectedProcedure
    .input(
      z.object({
        doctorId: z.string(),
        rating: z.number().min(1).max(5).optional(),
        comment: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const patient = await ctx.db.patient.findFirst({
          where: { userId: ctx.session.user.id },
        });

        if (!patient) {
          return trpcFailure("FORBIDDEN", "No eres paciente", 403);
        }

        const review = await ctx.db.review.findUnique({
          where: {
            doctorId_patientId: {
              doctorId: input.doctorId,
              patientId: patient.id,
            },
          },
        });

        if (!review) {
          return trpcFailure("REVIEW_NOT_FOUND", "Reseña no encontrada", 404);
        }

        const updated = await ctx.db.review.update({
          where: {
            doctorId_patientId: {
              doctorId: input.doctorId,
              patientId: patient.id,
            },
          },
          data: {
            rating: input.rating,
            comment: input.comment,
            updatedAt: new Date(),
          },
          include: {
            patient: { select: { user: { select: { name: true } } } },
          },
        });

        // Recalcular promedio
        await refreshDoctorRating(ctx.db, input.doctorId);

        return trpcSuccess(updated, "Reseña actualizada");
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al actualizar reseña", 500);
      }
    }),

  // Eliminar reseña
  delete: protectedProcedure
    .input(z.object({ doctorId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const patient = await ctx.db.patient.findFirst({
          where: { userId: ctx.session.user.id },
        });

        if (!patient) {
          return trpcFailure("FORBIDDEN", "No eres paciente", 403);
        }

        const existingReview = await ctx.db.review.findUnique({
          where: {
            doctorId_patientId: {
              doctorId: input.doctorId,
              patientId: patient.id,
            },
          },
        });

        if (!existingReview) {
          return trpcFailure("REVIEW_NOT_FOUND", "Reseña no encontrada", 404);
        }

        await ctx.db.review.delete({ where: { id: existingReview.id } });

        // Recalcular promedio
        await refreshDoctorRating(ctx.db, input.doctorId);

        return trpcSuccess(null, "Reseña eliminada");
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al eliminar reseña", 500);
      }
    }),
});
