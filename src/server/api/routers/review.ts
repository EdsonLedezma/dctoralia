import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const reviewRouter = createTRPCRouter({
  // Crear reseña
  create: protectedProcedure.input(z.object({
    doctorId: z.string(),
    patientId: z.string(),
    rating: z.number().min(1).max(5),
    comment: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    try {
      const review = await ctx.db.review.create({
        data: {
          doctorId: input.doctorId,
          patientId: input.patientId,
          rating: input.rating,
          comment: input.comment,
        },
      });
      return {
        status: 201,
        message: "Reseña creada correctamente",
        result: review,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al crear reseña",
        result: null,
        error,
      };
    }
  }),

  // Obtener reseña por doctor y paciente
  getByDoctorPatient: protectedProcedure.input(z.object({ doctorId: z.string(), patientId: z.string() })).query(async ({ input, ctx }) => {
    try {
      const review = await ctx.db.review.findUnique({ where: { doctorId_patientId: { doctorId: input.doctorId, patientId: input.patientId } } });
      if (!review) {
        return {
          status: 404,
          message: "Reseña no encontrada",
          result: null,
          error: new Error("Reseña no encontrada"),
        };
      }
      return {
        status: 200,
        message: "Reseña encontrada",
        result: review,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al buscar reseña",
        result: null,
        error,
      };
    }
  }),

  // Obtener todas las reseñas de un doctor
  getByDoctor: protectedProcedure.input(z.object({ doctorId: z.string() })).query(async ({ input, ctx }) => {
    try {
      const reviews = await ctx.db.review.findMany({ where: { doctorId: input.doctorId } });
      return {
        status: 200,
        message: "Reseñas obtenidas correctamente",
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

  // Actualizar rating
  updateRating: protectedProcedure.input(z.object({ doctorId: z.string(), patientId: z.string(), rating: z.number().min(1).max(5) })).mutation(async ({ input, ctx }) => {
    try {
      const review = await ctx.db.review.update({ where: { doctorId_patientId: { doctorId: input.doctorId, patientId: input.patientId } }, data: { rating: input.rating } });
      return {
        status: 200,
        message: "Calificación actualizada correctamente",
        result: review.rating,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar la calificación",
        result: null,
        error,
      };
    }
  }),

  // Actualizar comentario
  updateComment: protectedProcedure.input(z.object({ doctorId: z.string(), patientId: z.string(), comment: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const review = await ctx.db.review.update({ where: { doctorId_patientId: { doctorId: input.doctorId, patientId: input.patientId } }, data: { comment: input.comment } });
      return {
        status: 200,
        message: "Comentario actualizado correctamente",
        result: review.comment,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar el comentario",
        result: null,
        error,
      };
    }
  }),

  // Eliminar reseña
  delete: protectedProcedure.input(z.object({ doctorId: z.string(), patientId: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const deleted = await ctx.db.review.delete({ where: { doctorId_patientId: { doctorId: input.doctorId, patientId: input.patientId } } });
      return {
        status: 200,
        message: "Reseña eliminada correctamente",
        result: deleted,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al eliminar reseña",
        result: null,
        error,
      };
    }
  }),
}); 