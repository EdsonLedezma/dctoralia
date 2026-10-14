import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { z } from "zod";
import type { PrismaClient, Role } from "@prisma/client";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";
import { recordClinicalRead } from "~/server/domain/clinical/audit";
import {
  patientClinicalScope,
  resolveClinicalActor,
} from "~/server/domain/clinical/access";

function hideLegacyVercelBlobImages<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(hideLegacyVercelBlobImages) as T;
  }
  if (!value || typeof value !== "object" || value instanceof Date)
    return value;

  const sanitized = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (
        key === "image" &&
        typeof entry === "string" &&
        /\.(?:public|private)\.blob\.vercel-storage\.com(?:\/|$)/i.test(entry)
      ) {
        return [key, null];
      }
      return [key, hideLegacyVercelBlobImages(entry)];
    }),
  );
  return sanitized as T;
}

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
        select: {
          id: true,
          userId: true,
          specialty: true,
          license: true,
          phone: true,
          about: true,
          experience: true,
          rating: true,
          totalReviews: true,
          address: true,
          city: true,
          state: true,
          googleMapsUrl: true,
          latitude: true,
          longitude: true,
          createdAt: true,
          user: { select: { id: true, name: true, image: true } },
          services: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              duration: true,
              isActive: true,
            },
          },
          // Directory cards need aggregate ratings, never review text or patient IDs.
          reviews: { select: { rating: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return trpcSuccess(
        hideLegacyVercelBlobImages(doctors),
        "Doctores obtenidos correctamente",
      );
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
      return trpcSuccess(
        hideLegacyVercelBlobImages(doctors),
        "Doctores disponibles",
      );
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
        q: z.string().trim().min(1).max(80),
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
          select: {
            id: true,
            userId: true,
            specialty: true,
            license: true,
            phone: true,
            about: true,
            experience: true,
            rating: true,
            totalReviews: true,
            address: true,
            city: true,
            state: true,
            googleMapsUrl: true,
            latitude: true,
            longitude: true,
            createdAt: true,
            user: { select: { id: true, name: true, image: true } },
            services: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                duration: true,
                isActive: true,
              },
            },
            reviews: { select: { rating: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        return trpcSuccess(
          hideLegacyVercelBlobImages(doctors),
          "Resultados de búsqueda de doctores",
        );
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al buscar doctores", 500);
      }
    }),

  // Obtener doctor por ID (público)
  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      try {
        const doctor = await ctx.db.doctor.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            specialty: true,
            license: true,
            phone: true,
            about: true,
            experience: true,
            rating: true,
            totalReviews: true,
            address: true,
            city: true,
            state: true,
            googleMapsUrl: true,
            latitude: true,
            longitude: true,
            createdAt: true,
            user: { select: { name: true } },
            services: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                duration: true,
                isActive: true,
              },
            },
            schedules: {
              where: { isActive: true },
              select: {
                id: true,
                dayOfWeek: true,
                startTime: true,
                endTime: true,
                isActive: true,
              },
            },
            reviews: {
              select: { id: true, rating: true, comment: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 100,
            },
          },
        });
        if (!doctor) {
          return trpcFailure("DOCTOR_NOT_FOUND", "Doctor no encontrado", 404);
        }
        return trpcSuccess(
          hideLegacyVercelBlobImages(doctor),
          "Doctor encontrado",
        );
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
      return trpcSuccess(
        hideLegacyVercelBlobImages(doctor),
        "Perfil de doctor encontrado",
      );
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
      z
        .object({
          specialty: z.string().optional(),
          license: z.string().min(1).optional(),
          about: z.string().optional(),
          experience: z.number().int().min(0).optional(),
          phone: z.string().optional(),
          address: z.string().trim().max(240).nullable().optional(),
          city: z.string().trim().max(100).nullable().optional(),
          state: z.string().trim().max(100).nullable().optional(),
          googleMapsUrl: z
            .string()
            .trim()
            .url()
            .max(500)
            .refine((value) => {
              try {
                const host = new URL(value).hostname.toLowerCase();
                return (
                  host === "google.com" ||
                  host === "www.google.com" ||
                  host === "maps.google.com" ||
                  host === "google.com.mx" ||
                  host === "www.google.com.mx" ||
                  host === "maps.app.goo.gl" ||
                  host === "goo.gl" ||
                  host.endsWith(".google.com") ||
                  host.endsWith(".google.com.mx")
                );
              } catch {
                return false;
              }
            }, "Usa un enlace válido de Google Maps")
            .nullable()
            .optional(),
          latitude: z.number().min(14).max(33.5).nullable().optional(),
          longitude: z.number().min(-118).max(-86).nullable().optional(),
        })
        .superRefine((input, refinementContext) => {
          if ((input.latitude == null) !== (input.longitude == null)) {
            refinementContext.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "Agrega latitud y longitud juntas para mostrar el punto en el mapa",
              path: [input.latitude == null ? "latitude" : "longitude"],
            });
          }
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
            license: input.license,
            about: input.about,
            experience: input.experience,
            phone: input.phone,
            address: input.address,
            city: input.city,
            state: input.state,
            googleMapsUrl: input.googleMapsUrl,
            latitude: input.latitude,
            longitude: input.longitude,
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

      return trpcSuccess(
        hideLegacyVercelBlobImages(doctor),
        "Perfil del doctor",
      );
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
        const workspace = await ctx.getWorkspace();
        const actor = await resolveClinicalActor({
          db: ctx.db,
          userId: ctx.session.user.id,
          role: ctx.session.user.role,
          workspace,
        });
        if (!actor) {
          return trpcFailure(
            "CLINICAL_ACCESS_REQUIRED",
            "Acceso clínico al consultorio requerido",
            403,
          );
        }

        const patients = await ctx.db.patient.findMany({
          where: {
            AND: [
              patientClinicalScope(actor),
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
              where: {
                doctorId: actor.doctorId,
                clinicId: actor.clinicId,
              },
              include: { service: true },
              orderBy: { date: "desc" },
              take: 5,
            },
          },
          orderBy: { createdAt: "desc" },
        });

        await recordClinicalRead(ctx.db, actor, {
          resourceType: "PATIENT_DIRECTORY",
          resourceId: actor.clinicId,
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
        const workspace = await ctx.getWorkspace();
        const actor = await resolveClinicalActor({
          db: ctx.db,
          userId: ctx.session.user.id,
          role: ctx.session.user.role,
          workspace,
        });
        if (!actor) {
          return trpcFailure(
            "CLINICAL_ACCESS_REQUIRED",
            "Acceso clínico al consultorio requerido",
            403,
          );
        }

        const patient = await ctx.db.patient.findFirst({
          where: {
            id: input.patientId,
            ...patientClinicalScope(actor),
          },
          include: {
            user: {
              select: { name: true, email: true, phone: true, image: true },
            },
            appointments: {
              where: {
                doctorId: actor.doctorId,
                clinicId: actor.clinicId,
              },
              include: {
                service: true,
                doctor: { select: { user: { select: { name: true } } } },
              },
              orderBy: { date: "desc" },
            },
          },
        });

        if (!patient) {
          return trpcFailure(
            "PATIENT_NOT_FOUND",
            "Paciente no encontrado",
            404,
          );
        }

        const consent = await ctx.db.medicalHistoryConsent.findUnique({
          where: {
            patientId_clinicId: {
              patientId: patient.id,
              clinicId: actor.clinicId,
            },
          },
          select: { status: true },
        });
        const medicalHistory =
          consent?.status === "GRANTED"
            ? await ctx.db.medicalHistory.findUnique({
                where: { patientId: patient.id },
                select: {
                  bloodType: true,
                  allergies: true,
                  medications: true,
                  chronicDiseases: true,
                  lastUpdated: true,
                },
              })
            : null;
        await recordClinicalRead(ctx.db, actor, {
          resourceType: "PATIENT_HISTORY",
          resourceId: patient.id,
          patientId: patient.id,
        });
        if (medicalHistory) {
          await recordClinicalRead(ctx.db, actor, {
            resourceType: "MEDICAL_HISTORY",
            resourceId: patient.id,
            patientId: patient.id,
            action: "MEDICAL_HISTORY_READ",
          });
        }

        return trpcSuccess(
          { ...patient, medicalHistory },
          "Historial del paciente",
        );
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al obtener historial", 500);
      }
    }),
});
