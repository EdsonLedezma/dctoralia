import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const useDoctor = createTRPCRouter({
  // Listar doctores (público)
  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      const doctors = await ctx.db.doctor.findMany({
        include: {
          user: { select: { id: true, name: true, image: true } },
          services: true,
          reviews: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        status: 200,
        message: "Doctores obtenidos correctamente",
        result: doctors,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al obtener doctores",
        result: null,
        error,
      };
    }
  }),

  // Doctores visibles para el paciente autenticado (para agendar)
  listForPatient: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Mostrar doctores activos con servicios activos y horarios activos
      const doctors = await ctx.db.doctor.findMany({
        where: {
          services: { some: { isActive: true } },
          schedules: { some: { isActive: true } },
        },
        include: {
          user: { select: { id: true, name: true, image: true } },
          services: { where: { isActive: true } },
          schedules: { where: { isActive: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return { status: 200, message: "Doctores disponibles", result: doctors, error: null };
    } catch (error) {
      return { status: 500, message: "Error al listar doctores disponibles", result: null, error };
    }
  }),

  // Buscar doctores por nombre, teléfono o especialidad (público)
  search: publicProcedure
    .input(
      z.object({
        q: z.string().min(1),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const q = input.q;
        const doctors = await ctx.db.doctor.findMany({
          where: {
            OR: [
              { specialty: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              {
                user: {
                  // nombre del usuario doctor
                  is: { name: { contains: q, mode: "insensitive" } },
                },
              },
            ],
          },
          include: {
            user: { select: { id: true, name: true, image: true } },
            services: true,
            reviews: true,
          },
          orderBy: { createdAt: "desc" },
        });
        return {
          status: 200,
          message: "Resultados de búsqueda de doctores",
          result: doctors,
          error: null,
        };
      } catch (error) {
        return {
          status: 500,
          message: "Error al buscar doctores",
          result: null,
          error,
        };
      }
    }),

  // Obtener doctor por ID (público)
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    try {
      const doctor = await ctx.db.doctor.findUnique({
        where: { id: input.id },
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
          services: true,
          schedules: true,
          reviews: {
            include: {
              patient: {
                include: {
                  user: { select: { name: true, image: true } },
                },
              },
            },
          },
        },
      });
      if (!doctor) {
        return {
          status: 404,
          message: "Doctor no encontrado",
          result: null,
          error: new Error("Doctor no encontrado"),
        };
      }
      return {
        status: 200,
        message: "Doctor encontrado",
        result: doctor,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al buscar doctor",
        result: null,
        error,
      };
    }
  }),

  // Obtener perfil de doctor por userId (protegido)
  getByUser: protectedProcedure.query(async ({ ctx }) => {
    try {
      const doctor = await ctx.db.doctor.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
          services: true,
          schedules: true,
        },
      });
      if (!doctor) {
        return {
          status: 404,
          message: "Perfil de doctor no encontrado",
          result: null,
          error: new Error("Perfil de doctor no encontrado"),
        };
      }
      return {
        status: 200,
        message: "Perfil de doctor encontrado",
        result: doctor,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al obtener perfil de doctor",
        result: null,
        error,
      };
    }
  }),

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

  // Actualizar perfil completo del doctor
  updateProfile: protectedProcedure
    .input(
      z.object({
        specialty: z.string().optional(),
        about: z.string().optional(),
        experience: z.number().int().min(0).optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const doctor = await ctx.db.doctor.findFirst({
          where: { userId: ctx.session.user.id },
        });

        if (!doctor) {
          return {
            status: 404,
            message: "Perfil de doctor no encontrado",
            result: null,
            error: new Error("Doctor no encontrado"),
          };
        }

        const updated = await ctx.db.doctor.update({
          where: { id: doctor.id },
          data: {
            specialty: input.specialty,
            about: input.about,
            experience: input.experience,
            phone: input.phone,
          },
          include: {
            user: { select: { id: true, name: true, image: true, email: true } },
            services: true,
            schedules: true,
          },
        });

        return {
          status: 200,
          message: "Perfil actualizado correctamente",
          result: updated,
          error: null,
        };
      } catch (error) {
        return {
          status: 500,
          message: "Error al actualizar perfil",
          result: null,
          error,
        };
      }
    }),

  // Obtener mi perfil completo (doctor autenticado)
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    try {
      const doctor = await ctx.db.doctor.findFirst({
        where: { userId: ctx.session.user.id },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          services: true,
          schedules: true,
          reviews: {
            include: {
              patient: {
                select: { user: { select: { name: true, image: true } } },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          appointments: {
            include: { patient: true, service: true },
            orderBy: { date: "desc" },
            take: 5,
          },
        },
      });

      if (!doctor) {
        return {
          status: 404,
          message: "Perfil de doctor no encontrado",
          result: null,
          error: new Error("Doctor no encontrado"),
        };
      }

      return {
        status: 200,
        message: "Perfil del doctor",
        result: doctor,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al obtener perfil",
        result: null,
        error,
      };
    }
  }),

  // Obtener mis pacientes (doctor autenticado)
  getMyPatients: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const doctor = await ctx.db.doctor.findFirst({
          where: { userId: ctx.session.user.id },
        });

        if (!doctor) {
          return {
            status: 404,
            message: "Doctor no encontrado",
            result: [],
            error: null,
          };
        }

        const patients = await ctx.db.patient.findMany({
          where: {
            AND: [
              {
                appointments: {
                  some: { doctorId: doctor.id },
                },
              },
              input.search
                ? {
                    user: {
                      name: { contains: input.search, mode: "insensitive" },
                    },
                  }
                : {},
            ],
          },
          include: {
            user: { select: { name: true, email: true, image: true } },
            appointments: {
              where: { doctorId: doctor.id },
              include: { service: true },
              orderBy: { date: "desc" },
              take: 5,
            },
            medicalHistory: true,
          },
          orderBy: { createdAt: "desc" },
        });

        return {
          status: 200,
          message: "Mis pacientes",
          result: patients,
          error: null,
        };
      } catch (error) {
        return {
          status: 500,
          message: "Error al obtener pacientes",
          result: [],
          error,
        };
      }
    }),

  // Obtener historial clínico de un paciente (doctor autenticado)
  getPatientHistory: protectedProcedure
    .input(z.object({ patientId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const doctor = await ctx.db.doctor.findFirst({
          where: { userId: ctx.session.user.id },
        });

        if (!doctor) {
          return {
            status: 404,
            message: "No eres doctor",
            result: null,
            error: null,
          };
        }

        const patient = await ctx.db.patient.findUnique({
          where: { id: input.patientId },
          include: {
            user: { select: { name: true, email: true, phone: true, image: true } },
            appointments: {
              where: { doctorId: doctor.id },
              include: {
                service: true,
                doctor: { select: { user: { select: { name: true } } } },
              },
              orderBy: { date: "desc" },
            },
            medicalHistory: true,
          },
        });

        if (!patient) {
          return {
            status: 404,
            message: "Paciente no encontrado",
            result: null,
            error: null,
          };
        }

        return {
          status: 200,
          message: "Historial del paciente",
          result: patient,
          error: null,
        };
      } catch (error) {
        return {
          status: 500,
          message: "Error al obtener historial",
          result: null,
          error,
        };
      }
    }),
});