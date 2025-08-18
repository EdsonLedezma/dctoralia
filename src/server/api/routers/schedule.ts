import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const useSchedule = createTRPCRouter({
  // Obtener horarios por doctor (público)
  publicGetByDoctor: publicProcedure.input(z.object({ doctorId: z.string() })).query(async ({ input, ctx }) => {
    try {
      const schedules = await ctx.db.schedule.findMany({ where: { doctorId: input.doctorId } });
      return {
        status: 200,
        message: "Horarios obtenidos correctamente",
        result: schedules,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al obtener horarios",
        result: null,
        error,
      };
    }
  }),
  // Crear horario para un doctor
  create: protectedProcedure.input(z.object({
    doctorId: z.string(),
    dayOfWeek: z.number().min(0).max(6), // 0=Domingo, 6=Sábado
    startTime: z.string(),
    endTime: z.string(),
  })).mutation(async ({ input, ctx }) => {
    try {
      const schedule = await ctx.db.schedule.create({
        data: {
          doctorId: input.doctorId,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
        },
      });
      return {
        status: 201,
        message: "Horario creado correctamente",
        result: schedule,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al crear horario (puede que ya exista para ese día)",
        result: null,
        error,
      };
    }
  }),

  // Obtener todos los horarios de un doctor
  getByDoctor: protectedProcedure.input(z.object({ doctorId: z.string() })).query(async ({ input, ctx }) => {
    try {
      const schedules = await ctx.db.schedule.findMany({ where: { doctorId: input.doctorId } });
      return {
        status: 200,
        message: "Horarios obtenidos correctamente",
        result: schedules,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al obtener horarios",
        result: null,
        error,
      };
    }
  }),

  // Actualizar horario de un día específico
  update: protectedProcedure.input(z.object({
    id: z.string(),
    startTime: z.string(),
    endTime: z.string(),
  })).mutation(async ({ input, ctx }) => {
    try {
      const schedule = await ctx.db.schedule.update({
        where: { id: input.id },
        data: {
          startTime: input.startTime,
          endTime: input.endTime,
        },
      });
      return {
        status: 200,
        message: "Horario actualizado correctamente",
        result: schedule,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar horario",
        result: null,
        error,
      };
    }
  }),

  // Eliminar horario de un día específico
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const deleted = await ctx.db.schedule.delete({ where: { id: input.id } });
      return {
        status: 200,
        message: "Horario eliminado correctamente",
        result: deleted,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al eliminar horario",
        result: null,
        error,
      };
    }
  }),
});
