// server/api/routers/appointment.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const useAppointment = createTRPCRouter({
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

  // Citas del usuario autenticado (médico o paciente)
  listMine: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.session.user.role === "DOCTOR") {
        const doctor = await ctx.db.doctor.findUnique({ where: { userId: ctx.session.user.id } });
        if (!doctor) {
          return { status: 404, message: "Perfil de doctor no encontrado", result: [], error: null };
        }
        const appointments = await ctx.db.appointment.findMany({
          where: { doctorId: doctor.id },
          include: { patient: { include: { user: { select: { name: true, email: true } } } }, service: true },
          orderBy: { date: "desc" },
        });
        return { status: 200, message: "Citas del doctor", result: appointments, error: null };
      }

      if (ctx.session.user.role === "PATIENT") {
        const patient = await ctx.db.patient.findUnique({ where: { userId: ctx.session.user.id } });
        if (!patient) {
          return { status: 404, message: "Perfil de paciente no encontrado", result: [], error: null };
        }
        const appointments = await ctx.db.appointment.findMany({
          where: { patientId: patient.id },
          include: { doctor: { include: { user: { select: { name: true, email: true } } } }, service: true },
          orderBy: { date: "desc" },
        });
        return { status: 200, message: "Citas del paciente", result: appointments, error: null };
      }

      return { status: 200, message: "Sin rol", result: [], error: null };
    } catch (error) {
      return { status: 500, message: "Error al obtener citas", result: null, error };
    }
  }),

  // Obtener cita por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
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
  create: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        doctorId: z.string().optional(),
        serviceId: z.string().optional(),
        date: z.date(),
        time: z.string(),
        duration: z.number().int().positive(),
        reason: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Si no envían doctorId y el usuario es doctor, usar su perfil
        let doctorIdToUse = input.doctorId;
        if (!doctorIdToUse && ctx.session.user.role === "DOCTOR") {
          const doctor = await ctx.db.doctor.findUnique({ where: { userId: ctx.session.user.id } });
          doctorIdToUse = doctor?.id;
        }

        if (!doctorIdToUse) {
          return {
            status: 400,
            message: "doctorId es requerido",
            result: null,
            error: new Error("doctorId es requerido"),
          };
        }

        // Resolver patientId: puede venir como Patient.id o como User.id
        let patientIdToUse = input.patientId;
        const existingPatientById = await ctx.db.patient.findUnique({ where: { id: patientIdToUse } });
        if (!existingPatientById) {
          const patientByUser = await ctx.db.patient.findUnique({ where: { userId: patientIdToUse } });
          if (patientByUser) {
            patientIdToUse = patientByUser.id;
          } else {
            return {
              status: 400,
              message: "Paciente no encontrado",
              result: null,
              error: new Error("Paciente no encontrado"),
            };
          }
        }

        // Asegurar serviceId: si no se envía, usar/crear un servicio por defecto
        let serviceIdToUse = input.serviceId ?? null;
        if (!serviceIdToUse) {
          const defaultServiceName = "Consulta General";
          const existingDefault = await ctx.db.service.findFirst({
            where: { doctorId: doctorIdToUse, name: defaultServiceName },
          });
          if (existingDefault) {
            serviceIdToUse = existingDefault.id;
          } else {
            const createdDefault = await ctx.db.service.create({
              data: {
                doctorId: doctorIdToUse,
                name: defaultServiceName,
                description: "Consulta general creada automáticamente",
                price: 0,
                duration: input.duration,
              },
            });
            serviceIdToUse = createdDefault.id;
          }
        }
        const newAppointment = await ctx.db.appointment.create({
          data: {
            patientId: patientIdToUse,
            doctorId: doctorIdToUse,
            serviceId: serviceIdToUse,
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
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          "PENDING",
          "CONFIRMED",
          "COMPLETED",
          "CANCELLED",
          "NO_SHOW",
        ]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const appointment = await ctx.db.appointment.update({
          where: { id: input.id },
          data: { status: input.status },
        });
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
  updateNotes: protectedProcedure
    .input(z.object({ id: z.string(), notes: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const appointment = await ctx.db.appointment.update({
          where: { id: input.id },
          data: { notes: input.notes },
        });
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
  updateReason: protectedProcedure
    .input(z.object({ id: z.string(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const appointment = await ctx.db.appointment.update({
          where: { id: input.id },
          data: { reason: input.reason },
        });
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
  updateDuration: protectedProcedure
    .input(z.object({ id: z.string(), duration: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const appointment = await ctx.db.appointment.update({
          where: { id: input.id },
          data: { duration: input.duration },
        });
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
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const deleted = await ctx.db.appointment.delete({
          where: { id: input.id },
        });
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
});
