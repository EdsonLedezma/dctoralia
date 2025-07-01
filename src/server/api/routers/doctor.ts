import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const useDoctor = createTRPCRouter({
  // Actualizar especialidad
  updateSpecialty: protectedProcedure.input(z.object({ id: z.string(), specialty: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const doctor = await ctx.db.doctor.update({ where: { id: input.id }, data: { specialty: input.specialty } });
      return {
        status: 200,
        message: "Especialidad actualizada correctamente",
        result: doctor.specialty,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar la especialidad",
        result: null,
        error,
      };
    }
  }),

  // Actualizar cédula
  updateLicense: protectedProcedure.input(z.object({ id: z.string(), license: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const doctor = await ctx.db.doctor.update({ where: { id: input.id }, data: { license: input.license } });
      return {
        status: 200,
        message: "Cédula profesional actualizada correctamente",
        result: doctor.license,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar la cédula profesional",
        result: null,
        error,
      };
    }
  }),

  // Actualizar teléfono
  updatePhone: protectedProcedure.input(z.object({ id: z.string(), phone: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const doctor = await ctx.db.doctor.update({ where: { id: input.id }, data: { phone: input.phone } });
      return {
        status: 200,
        message: "Teléfono actualizado correctamente",
        result: doctor.phone,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar el teléfono",
        result: null,
        error,
      };
    }
  }),

  // Actualizar descripción
  updateAbout: protectedProcedure.input(z.object({ id: z.string(), about: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const doctor = await ctx.db.doctor.update({ where: { id: input.id }, data: { about: input.about } });
      return {
        status: 200,
        message: "Descripción actualizada correctamente",
        result: doctor.about,
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

  // Actualizar años de experiencia
  updateExperience: protectedProcedure.input(z.object({ id: z.string(), experience: z.number() })).mutation(async ({ input, ctx }) => {
    try {
      const doctor = await ctx.db.doctor.update({ where: { id: input.id }, data: { experience: input.experience } });
      return {
        status: 200,
        message: "Años de experiencia actualizados correctamente",
        result: doctor.experience,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar los años de experiencia",
        result: null,
        error,
      };
    }
  }),
}); 