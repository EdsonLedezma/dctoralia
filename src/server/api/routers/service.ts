import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const useService = createTRPCRouter({
  // Servicios por doctor (público)
  publicGetByDoctor: publicProcedure.input(z.object({ doctorId: z.string() })).query(async ({ input, ctx }) => {
    try {
      const services = await ctx.db.service.findMany({ where: { doctorId: input.doctorId, isActive: true } });
      return {
        status: 200,
        message: "Servicios obtenidos correctamente",
        result: services,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al obtener servicios",
        result: null,
        error,
      };
    }
  }),
  // Crear servicio
  create: protectedProcedure.input(z.object({
    doctorId: z.string(),
    name: z.string(),
    description: z.string(),
    price: z.number(),
    duration: z.number(),
  })).mutation(async ({ input, ctx }) => {
    try {
      const newService = await ctx.db.service.create({
        data: {
          doctorId: input.doctorId,
          name: input.name,
          description: input.description,
          price: input.price,
          duration: input.duration,
        },
      });
      return {
        status: 201,
        message: "Servicio creado correctamente",
        result: newService,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al crear servicio",
        result: null,
        error,
      };
    }
  }),

  // Obtener servicio por ID
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    try {
      const service = await ctx.db.service.findUnique({ where: { id: input.id } });
      if (!service) {
        return {
          status: 404,
          message: "Servicio no encontrado",
          result: null,
          error: new Error("Servicio no encontrado"),
        };
      }
      return {
        status: 200,
        message: "Servicio encontrado",
        result: service,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al buscar servicio",
        result: null,
        error,
      };
    }
  }),

  // Obtener todos los servicios de un doctor
  getByDoctor: protectedProcedure.input(z.object({ doctorId: z.string() })).query(async ({ input, ctx }) => {
    try {
      const services = await ctx.db.service.findMany({ where: { doctorId: input.doctorId } });
      return {
        status: 200,
        message: "Servicios obtenidos correctamente",
        result: services,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al obtener servicios",
        result: null,
        error,
      };
    }
  }),

  // Actualizar nombre
  updateName: protectedProcedure.input(z.object({ id: z.string(), name: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const service = await ctx.db.service.update({ where: { id: input.id }, data: { name: input.name } });
      return {
        status: 200,
        message: "Nombre actualizado correctamente",
        result: service.name,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar el nombre",
        result: null,
        error,
      };
    }
  }),

  // Actualizar descripción
  updateDescription: protectedProcedure.input(z.object({ id: z.string(), description: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const service = await ctx.db.service.update({ where: { id: input.id }, data: { description: input.description } });
      return {
        status: 200,
        message: "Descripción actualizada correctamente",
        result: service.description,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar la descripción",
        result: null,
        error,
      };
    }
  }),

  // Actualizar precio
  updatePrice: protectedProcedure.input(z.object({ id: z.string(), price: z.number() })).mutation(async ({ input, ctx }) => {
    try {
      const service = await ctx.db.service.update({ where: { id: input.id }, data: { price: input.price } });
      return {
        status: 200,
        message: "Precio actualizado correctamente",
        result: service.price,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar el precio",
        result: null,
        error,
      };
    }
  }),

  // Actualizar duración
  updateDuration: protectedProcedure.input(z.object({ id: z.string(), duration: z.number() })).mutation(async ({ input, ctx }) => {
    try {
      const service = await ctx.db.service.update({ where: { id: input.id }, data: { duration: input.duration } });
      return {
        status: 200,
        message: "Duración actualizada correctamente",
        result: service.duration,
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

  // Actualizar estado activo
  updateIsActive: protectedProcedure.input(z.object({ id: z.string(), isActive: z.boolean() })).mutation(async ({ input, ctx }) => {
    try {
      const service = await ctx.db.service.update({ where: { id: input.id }, data: { isActive: input.isActive } });
      return {
        status: 200,
        message: "Estado actualizado correctamente",
        result: service.isActive,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar el estado",
        result: null,
        error,
      };
    }
  }),

  // Eliminar servicio
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const deleted = await ctx.db.service.delete({ where: { id: input.id } });
      return {
        status: 200,
        message: "Servicio eliminado correctamente",
        result: deleted,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al eliminar servicio",
        result: null,
        error,
      };
    }
  }),
}); 