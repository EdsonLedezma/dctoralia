import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const reviewRouter = createTRPCRouter({
  // Crear reseña (paciente al doctor tras completar cita)
  create: protectedProcedure
    .input(
      z.object({
        doctorId: z.string(),
        appointmentId: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Obtener paciente del usuario autenticado
        const patient = await ctx.db.patient.findFirst({
          where: { userId: ctx.session.user.id },
        });

        if (!patient) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No eres un paciente registrado",
          });
        }

        // Verificar que la cita existe y está COMPLETED
        const appointment = await ctx.db.appointment.findUnique({
          where: { id: input.appointmentId },
        });

        if (!appointment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cita no encontrada",
          });
        }

        if (appointment.status !== "COMPLETED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Solo puedes dejar reseña en citas completadas",
          });
        }

        if (appointment.patientId !== patient.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes acceso a esta cita",
          });
        }

        if (appointment.doctorId !== input.doctorId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "La cita no pertenece a este doctor",
          });
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
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
            : 0;

        await ctx.db.doctor.update({
          where: { id: input.doctorId },
          data: {
            rating: avgRating,
            totalReviews: allReviews.length,
          },
        });

        return {
          status: 201,
          message: "Reseña creada correctamente",
          result: review,
          error: null,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return {
          status: 500,
          message: "Error al crear reseña",
          result: null,
          error,
        };
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
          return {
            status: 404,
            message: "No eres paciente",
            result: null,
            error: null,
          };
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
          return {
            status: 404,
            message: "No has dejado reseña para este doctor",
            result: null,
            error: null,
          };
        }

        return {
          status: 200,
          message: "Tu reseña",
          result: review,
          error: null,
        };
      } catch (error) {
        return {
          status: 500,
          message: "Error al obtener tu reseña",
          result: null,
          error,
        };
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

        return {
          status: 200,
          message: "Reseñas del doctor",
          result: reviews,
          error: null,
        };
      } catch (error) {
        return {
          status: 500,
          message: "Error al obtener reseñas",
          result: null,
          error,
        };
      }
    }),

  // Actualizar mi reseña
  update: protectedProcedure
    .input(
      z.object({
        doctorId: z.string(),
        rating: z.number().min(1).max(5).optional(),
        comment: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const patient = await ctx.db.patient.findFirst({
          where: { userId: ctx.session.user.id },
        });

        if (!patient) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No eres paciente",
          });
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Reseña no encontrada",
          });
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
        const allReviews = await ctx.db.review.findMany({
          where: { doctorId: input.doctorId },
        });

        const avgRating =
          allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        await ctx.db.doctor.update({
          where: { id: input.doctorId },
          data: {
            rating: avgRating,
            totalReviews: allReviews.length,
          },
        });

        return {
          status: 200,
          message: "Reseña actualizada",
          result: updated,
          error: null,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return {
          status: 500,
          message: "Error al actualizar reseña",
          result: null,
          error,
        };
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
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No eres paciente",
          });
        }

        await ctx.db.review.delete({
          where: {
            doctorId_patientId: {
              doctorId: input.doctorId,
              patientId: patient.id,
            },
          },
        });

        // Recalcular promedio
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

        return {
          status: 200,
          message: "Reseña eliminada",
          result: null,
          error: null,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return {
          status: 500,
          message: "Error al eliminar reseña",
          result: null,
          error,
        };
      }
    }),
}); 