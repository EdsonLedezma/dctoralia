// server/api/routers/appointment.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

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

  // Próximas citas (desde ahora, limit configurable). Devuelve próximas para doctor o paciente según rol actual
  upcoming: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().max(100).optional() }).optional())
    .query(async ({ input, ctx }) => {
      try {
        const limit = input?.limit ?? 10;
        const now = new Date();
        if (ctx.session.user.role === "DOCTOR") {
          const doctor = await ctx.db.doctor.findUnique({ where: { userId: ctx.session.user.id } });
          if (!doctor) return { status: 404, message: "Perfil de doctor no encontrado", result: [], error: null };
          const appointments = await ctx.db.appointment.findMany({
            where: { doctorId: doctor.id, date: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } },
            include: { patient: { include: { user: { select: { name: true, email: true } } } }, service: true },
            orderBy: { date: "asc" },
            take: limit,
          });
          return { status: 200, message: "Próximas citas del doctor", result: appointments, error: null };
        }
        if (ctx.session.user.role === "PATIENT") {
          const patient = await ctx.db.patient.findUnique({ where: { userId: ctx.session.user.id } });
          if (!patient) return { status: 404, message: "Perfil de paciente no encontrado", result: [], error: null };
          const appointments = await ctx.db.appointment.findMany({
            where: { patientId: patient.id, date: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } },
            include: { doctor: { include: { user: { select: { name: true, email: true } } } }, service: true },
            orderBy: { date: "asc" },
            take: limit,
          });
          return { status: 200, message: "Próximas citas del paciente", result: appointments, error: null };
        }
        return { status: 200, message: "Sin rol", result: [], error: null };
      } catch (error) {
        return { status: 500, message: "Error al obtener próximas citas", result: null, error };
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
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
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
            severity: input.severity,
            status: "PENDING",
          },
        });
        // Notificación para el doctor
        await ctx.db.notification.create({
          data: {
            doctorId: doctorIdToUse,
            patientId: patientIdToUse,
            type: "APPOINTMENT_BOOKED",
            title: "Nueva cita agendada",
            message: `Se agendó una cita para ${input.date.toISOString().slice(0, 10)} a las ${input.time}.`,
            appointmentId: newAppointment.id,
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

  // Solicitar reagendar (valida disponibilidad y notifica al doctor)
  reschedule: protectedProcedure
    .input(z.object({ id: z.string(), newDate: z.date(), newTime: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const appt = await ctx.db.appointment.findUnique({ where: { id: input.id } });
        if (!appt) throw new TRPCError({ code: "NOT_FOUND", message: "Cita no encontrada" });

        // Validar disponibilidad del doctor con Schedule activo en el día de la semana
        const dayOfWeek = input.newDate.getDay();
        const schedule = await ctx.db.schedule.findFirst({
          where: { doctorId: appt.doctorId, dayOfWeek, isActive: true },
        });
        if (!schedule) {
          return { status: 400, message: "El doctor no tiene horario disponible ese día", result: null, error: null };
        }
        const within = input.newTime >= schedule.startTime && input.newTime <= schedule.endTime;
        if (!within) {
          return { status: 400, message: "Hora fuera del horario disponible", result: null, error: null };
        }

        // Verificar que no haya otra cita en ese horario (mismo doctor, misma fecha, misma hora)
        const clash = await ctx.db.appointment.findFirst({
          where: { doctorId: appt.doctorId, date: input.newDate, time: input.newTime, status: { in: ["PENDING", "CONFIRMED"] } },
        });
        if (clash && clash.id !== appt.id) {
          return { status: 409, message: "Horario ya ocupado", result: null, error: null };
        }

        const updated = await ctx.db.appointment.update({
          where: { id: input.id },
          data: { date: input.newDate, time: input.newTime, status: "CONFIRMED" },
        });

        await ctx.db.notification.create({
          data: {
            doctorId: appt.doctorId,
            patientId: appt.patientId,
            type: "APPOINTMENT_RESCHEDULED",
            title: "Cita reagendada",
            message: `La cita fue reagendada a ${input.newDate.toISOString().slice(0, 10)} ${input.newTime}.`,
            appointmentId: updated.id,
          },
        });
        return { status: 200, message: "Cita reagendada", result: updated, error: null };
      } catch (error) {
        return { status: 500, message: "Error al reagendar", result: null, error };
      }
    }),

  // Cancelar cita: libera el horario (al estar basado en Schedule, basta con poner estado)
  cancel: protectedProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const appt = await ctx.db.appointment.update({
          where: { id: input.id },
          data: { status: "CANCELLED", reason: input.reason },
        });
        await ctx.db.notification.create({
          data: {
            doctorId: appt.doctorId,
            patientId: appt.patientId,
            type: "APPOINTMENT_CANCELLED",
            title: "Cita cancelada",
            message: `El paciente canceló su cita del ${appt.date.toISOString().slice(0, 10)} ${appt.time}.`,
            appointmentId: appt.id,
          },
        });
        return { status: 200, message: "Cita cancelada", result: appt, error: null };
      } catch (error) {
        return { status: 500, message: "Error al cancelar", result: null, error };
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

  // Rellenar serviceId para citas existentes sin servicio: crea/usa "Consulta General" por doctor
  backfillServiceId: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().max(500).optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      try {
        const limit = input?.limit ?? 200;
        const orphanAppointments = await ctx.db.appointment.findMany({
          where: { serviceId: null },
          select: { id: true, doctorId: true, duration: true },
          take: limit,
        });
        if (orphanAppointments.length === 0) {
          return { status: 200, message: "No hay citas huérfanas", result: 0, error: null };
        }

        const defaultServiceName = "Consulta General";
        let updatedCount = 0;
        for (const appt of orphanAppointments) {
          const existingDefault = await ctx.db.service.findFirst({ where: { doctorId: appt.doctorId, name: defaultServiceName } });
          const defaultService = existingDefault
            ?? (await ctx.db.service.create({
              data: {
                doctorId: appt.doctorId,
                name: defaultServiceName,
                description: "Consulta general creada automáticamente",
                price: 0,
                duration: appt.duration,
              },
            }));
          await ctx.db.appointment.update({ where: { id: appt.id }, data: { serviceId: defaultService.id } });
          updatedCount += 1;
        }
        return { status: 200, message: "Citas actualizadas", result: updatedCount, error: null };
      } catch (error) {
        return { status: 500, message: "Error en backfill de serviceId", result: null, error };
      }
    }),
});
