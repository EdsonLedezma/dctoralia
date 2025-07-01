// server/api/routers/appointment.ts
import { z } from "zod"
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc"
import { prisma } from "~/lib/prisma"

export const appointmentRouter = createTRPCRouter({
  // Obtener todas las citas con relaciones incluidas
  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      const appointments = await ctx.db.appointment.findMany({
        include: { patient: true, doctor: true, service: true },
        orderBy: { date: "asc" },
      });
      return {
        status: 200,
        message: "Citas obtenidas correctamente",
        result: appointments,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al obtener citas",
        result: null,
        error,
      };
    }
  }),

  // Obtener cita por ID
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    try {
      const appointment = await ctx.db.appointment.findUnique({
        where: { id: input.id },
        include: { patient: true, doctor: true, service: true },
      });
      if (!appointment) {
        return {
          status: 404,
          message: "Cita no encontrada",
          result: null,
          error: new Error("Cita no encontrada"),
        };
      }
      return {
        status: 200,
        message: "Cita encontrada",
        result: appointment,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al buscar cita",
        result: null,
        error,
      };
    }
  }),

  // Crear una cita
  create: protectedProcedure.input(z.object({
    patientId: z.string(),
    doctorId: z.string(),
    serviceId: z.string(),
    date: z.date(),
    time: z.string(),
    duration: z.number().int().positive(),
    reason: z.string(),
    notes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    try {
      const newAppointment = await ctx.db.appointment.create({
        data: {
          patientId: input.patientId,
          doctorId: input.doctorId,
          serviceId: input.serviceId,
          date: input.date,
          time: input.time,
          duration: input.duration,
          reason: input.reason,
          notes: input.notes ?? "",
          status: "PENDING",
        },
      });
      return {
        status: 201,
        message: "Cita creada correctamente",
        result: newAppointment,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al crear la cita",
        result: null,
        error,
      };
    }
  }),

  // Actualizar estado de la cita
  updateStatus: protectedProcedure.input(z.object({ id: z.string(), status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]) })).mutation(async ({ input, ctx }) => {
    try {
      const appointment = await ctx.db.appointment.update({ where: { id: input.id }, data: { status: input.status } });
      return {
        status: 200,
        message: "Estado de la cita actualizado correctamente",
        result: appointment.status,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar el estado de la cita",
        result: null,
        error,
      };
    }
  }),

  // Actualizar notas
  updateNotes: protectedProcedure.input(z.object({ id: z.string(), notes: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const appointment = await ctx.db.appointment.update({ where: { id: input.id }, data: { notes: input.notes } });
      return {
        status: 200,
        message: "Notas actualizadas correctamente",
        result: appointment.notes,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar las notas",
        result: null,
        error,
      };
    }
  }),

  // Actualizar motivo
  updateReason: protectedProcedure.input(z.object({ id: z.string(), reason: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const appointment = await ctx.db.appointment.update({ where: { id: input.id }, data: { reason: input.reason } });
      return {
        status: 200,
        message: "Motivo actualizado correctamente",
        result: appointment.reason,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar el motivo",
        result: null,
        error,
      };
    }
  }),

  // Actualizar duración
  updateDuration: protectedProcedure.input(z.object({ id: z.string(), duration: z.number() })).mutation(async ({ input, ctx }) => {
    try {
      const appointment = await ctx.db.appointment.update({ where: { id: input.id }, data: { duration: input.duration } });
      return {
        status: 200,
        message: "Duración actualizada correctamente",
        result: appointment.duration,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar la duración",
        result: null,
        error,
      };
    }
  }),

  // Eliminar cita
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const deleted = await ctx.db.appointment.delete({ where: { id: input.id } });
      return {
        status: 200,
        message: "Cita eliminada correctamente",
        result: deleted,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al eliminar la cita",
        result: null,
        error,
      };
    }
  }),
})
