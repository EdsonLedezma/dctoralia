import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { z } from "zod";
import type { PrismaClient, Role } from "@prisma/client";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

async function getManagedDoctorId(
  ctx: { db: PrismaClient; session: { user: { id: string; role: Role } } },
  requestedId: string,
): Promise<string | null> {
  if (ctx.session.user.role === "ADMIN") {
    const doctor = await ctx.db.doctor.findUnique({
      where: { id: requestedId },
      select: { id: true },
    });
    return doctor?.id ?? null;
  }

  if (ctx.session.user.role !== "DOCTOR") return null;

  const doctor = await ctx.db.doctor.findUnique({
    where: { userId: ctx.session.user.id },
    select: { id: true },
  });
  return doctor?.id === requestedId ? doctor.id : null;
}

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
      return trpcSuccess(doctors, "Doctores obtenidos correctamente");
    } catch {
      return trpcFailure("INTERNAL_ERROR", "Error al obtener doctores", 500);
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
      return trpcSuccess(doctors, "Doctores disponibles");
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "Error al listar doctores disponibles",
        500,
      );
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
        return trpcSuccess(doctors, "Resultados de búsqueda de doctores");
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al buscar doctores", 500);
      }
    }),

  // Obtener doctor por ID (público)
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const doctor = await ctx.db.doctor.findUnique({
          where: { id: input.id },
          include: {
            user: {
              select: { id: true, name: true, image: true, email: true },
            },
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
          return trpcFailure("DOCTOR_NOT_FOUND", "Doctor no encontrado", 404);
        }
        return trpcSuccess(doctor, "Doctor encontrado");
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al buscar doctor", 500);
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
        return trpcFailure(
          "DOCTOR_NOT_FOUND",
          "Perfil de doctor no encontrado",
          404,
        );
      }
      return trpcSuccess(doctor, "Perfil de doctor encontrado");
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "Error al obtener perfil de doctor",
        500,
      );
    }
  }),

  // Actualizar especialidad
  updateSpecialty: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        specialty: z.string().trim().min(1).max(120),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const doctorId = await getManagedDoctorId(ctx, input.id);
      if (!doctorId) {
        return trpcFailure("FORBIDDEN", "No tienes acceso a este perfil", 403);
      }
      try {
        const doctor = await ctx.db.doctor.update({
          where: { id: doctorId },
          data: { specialty: input.specialty },
        });
        return trpcSuccess(
          doctor.specialty,
          "Especialidad actualizada correctamente",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar la especialidad",
          500,
        );
      }
    }),

  // Actualizar cédula
  updateLicense: protectedProcedure
    .input(
      z.object({ id: z.string(), license: z.string().trim().min(1).max(80) }),
    )
    .mutation(async ({ input, ctx }) => {
      const doctorId = await getManagedDoctorId(ctx, input.id);
      if (!doctorId) {
        return trpcFailure("FORBIDDEN", "No tienes acceso a este perfil", 403);
      }
      try {
        const doctor = await ctx.db.doctor.update({
          where: { id: doctorId },
          data: { license: input.license },
        });
        return trpcSuccess(
          doctor.license,
          "Cédula profesional actualizada correctamente",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar la cédula profesional",
          500,
        );
      }
    }),

  // Actualizar teléfono
  updatePhone: protectedProcedure
    .input(
      z.object({ id: z.string(), phone: z.string().trim().min(1).max(30) }),
    )
    .mutation(async ({ input, ctx }) => {
      const doctorId = await getManagedDoctorId(ctx, input.id);
      if (!doctorId) {
        return trpcFailure("FORBIDDEN", "No tienes acceso a este perfil", 403);
      }
      try {
        const doctor = await ctx.db.doctor.update({
          where: { id: doctorId },
          data: { phone: input.phone },
        });
        return trpcSuccess(doctor.phone, "Teléfono actualizado correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar el teléfono",
          500,
        );
      }
    }),

  // Actualizar descripción
  updateAbout: protectedProcedure
    .input(
      z.object({ id: z.string(), about: z.string().trim().min(1).max(2000) }),
    )
    .mutation(async ({ input, ctx }) => {
      const doctorId = await getManagedDoctorId(ctx, input.id);
      if (!doctorId) {
        return trpcFailure("FORBIDDEN", "No tienes acceso a este perfil", 403);
      }
      try {
        const doctor = await ctx.db.doctor.update({
          where: { id: doctorId },
          data: { about: input.about },
        });
        return trpcSuccess(
          doctor.about,
          "Descripción actualizada correctamente",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar la descripción",
          500,
        );
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
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const doctor = await ctx.db.doctor.findFirst({
          where: { userId: ctx.session.user.id },
        });

        if (!doctor) {
          return trpcFailure(
            "DOCTOR_NOT_FOUND",
            "Perfil de doctor no encontrado",
            404,
          );
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
            user: {
              select: { id: true, name: true, image: true, email: true },
            },
            services: true,
            schedules: true,
          },
        });

        return trpcSuccess(updated, "Perfil actualizado correctamente");
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al actualizar perfil", 500);
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
        return trpcFailure(
          "DOCTOR_NOT_FOUND",
          "Perfil de doctor no encontrado",
          404,
        );
      }

      return trpcSuccess(doctor, "Perfil del doctor");
    } catch {
      return trpcFailure("INTERNAL_ERROR", "Error al obtener perfil", 500);
    }
  }),

  // Obtener mis pacientes (doctor autenticado)
  getMyPatients: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const doctor = await ctx.db.doctor.findFirst({
          where: { userId: ctx.session.user.id },
        });

        if (!doctor) {
          return trpcFailure("DOCTOR_NOT_FOUND", "Doctor no encontrado", 404);
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

        return trpcSuccess(patients, "Mis pacientes");
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al obtener pacientes", 500);
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
          return trpcFailure("DOCTOR_PROFILE_NOT_FOUND", "No eres doctor", 404);
        }

        const patient = await ctx.db.patient.findFirst({
          where: {
            id: input.patientId,
            appointments: { some: { doctorId: doctor.id } },
          },
          include: {
            user: {
              select: { name: true, email: true, phone: true, image: true },
            },
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
          return trpcFailure(
            "PATIENT_NOT_FOUND",
            "Paciente no encontrado",
            404,
          );
        }

        return trpcSuccess(patient, "Historial del paciente");
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al obtener historial", 500);
      }
    }),
});
