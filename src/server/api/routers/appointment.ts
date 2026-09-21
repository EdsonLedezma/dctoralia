import { Prisma, type AppointmentStatus } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  appointmentScopeForActor,
  canManageAllAppointments,
  type AuthenticatedActor,
} from "~/server/domain/authorization/access-policy";
import {
  getUtcDayBounds,
  hasTimeConflict,
  isSlotInsideSchedule,
  isTodayOrFuture,
} from "~/server/domain/appointments/appointment-time";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "La hora debe usar el formato HH:mm");

const appointmentInclude = {
  patient: {
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  },
  doctor: {
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  },
  service: true,
} satisfies Prisma.AppointmentInclude;

const activeAppointmentStatuses = ["PENDING", "CONFIRMED"] as const;
const finalAppointmentStatuses = new Set<AppointmentStatus>([
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

function getActor(sessionUser: {
  id: string;
  role: AuthenticatedActor["role"];
}): AuthenticatedActor {
  return { id: sessionUser.id, role: sessionUser.role };
}

function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export const useAppointment = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const actor = getActor(ctx.session.user);

    try {
      const appointments = await ctx.db.appointment.findMany({
        where: appointmentScopeForActor(actor),
        include: appointmentInclude,
        orderBy: [{ date: "asc" }, { time: "asc" }],
      });

      return trpcSuccess(appointments, "Citas obtenidas correctamente");
    } catch (error) {
      console.error("Unable to list appointments", error);
      return trpcFailure(
        "INTERNAL_ERROR",
        "No fue posible obtener las citas",
        500,
      );
    }
  }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    const actor = getActor(ctx.session.user);

    try {
      const appointments = await ctx.db.appointment.findMany({
        where: appointmentScopeForActor(actor),
        include: appointmentInclude,
        orderBy: [{ date: "desc" }, { time: "desc" }],
      });

      return trpcSuccess(appointments, "Citas obtenidas correctamente");
    } catch (error) {
      console.error("Unable to list actor appointments", error);
      return trpcFailure(
        "INTERNAL_ERROR",
        "No fue posible obtener tus citas",
        500,
      );
    }
  }),

  upcoming: protectedProcedure
    .input(
      z
        .object({ limit: z.number().int().positive().max(100).optional() })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const actor = getActor(ctx.session.user);
      const today = getUtcDayBounds(new Date()).start;

      try {
        const appointments = await ctx.db.appointment.findMany({
          where: {
            AND: [
              appointmentScopeForActor(actor),
              {
                date: { gte: today },
                status: { in: [...activeAppointmentStatuses] },
              },
            ],
          },
          include: appointmentInclude,
          orderBy: [{ date: "asc" }, { time: "asc" }],
          take: input?.limit ?? 10,
        });

        return trpcSuccess(
          appointments,
          "Próximas citas obtenidas correctamente",
        );
      } catch (error) {
        console.error("Unable to list upcoming appointments", error);
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible obtener las próximas citas",
          500,
        );
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      const actor = getActor(ctx.session.user);

      try {
        const appointment = await ctx.db.appointment.findFirst({
          where: {
            AND: [{ id: input.id }, appointmentScopeForActor(actor)],
          },
          include: appointmentInclude,
        });

        if (!appointment) {
          return trpcFailure(
            "APPOINTMENT_NOT_FOUND",
            "Cita no encontrada",
            404,
          );
        }

        return trpcSuccess(appointment, "Cita obtenida correctamente");
      } catch (error) {
        console.error("Unable to get appointment", error);
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible obtener la cita",
          500,
        );
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        patientId: z.string().min(1),
        doctorId: z.string().min(1).optional(),
        serviceId: z.string().min(1).optional(),
        date: z.date(),
        time: timeSchema,
        duration: z.number().int().positive().max(480).optional(),
        reason: z.string().trim().min(1).max(500),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const actor = getActor(ctx.session.user);

      if (!isTodayOrFuture(input.date)) {
        return trpcFailure(
          "INVALID_DATE",
          "La cita debe programarse para hoy o una fecha futura",
          400,
        );
      }

      try {
        const doctor =
          actor.role === "DOCTOR"
            ? await ctx.db.doctor.findUnique({ where: { userId: actor.id } })
            : input.doctorId
              ? await ctx.db.doctor.findUnique({
                  where: { id: input.doctorId },
                })
              : null;

        if (!doctor) {
          return trpcFailure(
            "DOCTOR_NOT_FOUND",
            actor.role === "DOCTOR"
              ? "No encontramos tu perfil de médico"
              : "Selecciona un médico válido",
            404,
          );
        }

        const patient =
          actor.role === "PATIENT"
            ? await ctx.db.patient.findUnique({ where: { userId: actor.id } })
            : await ctx.db.patient.findFirst({
                where: {
                  OR: [{ id: input.patientId }, { userId: input.patientId }],
                },
              });

        if (!patient) {
          return trpcFailure(
            "PATIENT_NOT_FOUND",
            actor.role === "PATIENT"
              ? "No encontramos tu perfil de paciente"
              : "Selecciona un paciente válido",
            404,
          );
        }

        const service = input.serviceId
          ? await ctx.db.service.findFirst({
              where: {
                id: input.serviceId,
                doctorId: doctor.id,
                isActive: true,
              },
            })
          : await ctx.db.service.findFirst({
              where: { doctorId: doctor.id, isActive: true },
              orderBy: { createdAt: "asc" },
            });

        if (!service) {
          return trpcFailure(
            "SERVICE_REQUIRED",
            "El médico debe tener un servicio activo para agendar la cita",
            400,
          );
        }

        const { start: appointmentDate, end: nextDay } = getUtcDayBounds(
          input.date,
        );
        const appointment = await ctx.db.$transaction(
          async (tx) => {
            const schedule = await tx.schedule.findFirst({
              where: {
                doctorId: doctor.id,
                dayOfWeek: appointmentDate.getUTCDay(),
                isActive: true,
              },
            });

            if (
              !schedule ||
              !isSlotInsideSchedule(
                input.time,
                service.duration,
                schedule.startTime,
                schedule.endTime,
              )
            ) {
              return null;
            }

            const existingAppointments = await tx.appointment.findMany({
              where: {
                doctorId: doctor.id,
                date: { gte: appointmentDate, lt: nextDay },
                status: { in: [...activeAppointmentStatuses] },
              },
              select: { time: true, duration: true },
            });

            if (
              hasTimeConflict(
                input.time,
                service.duration,
                existingAppointments,
              )
            ) {
              return false;
            }

            const created = await tx.appointment.create({
              data: {
                patientId: patient.id,
                doctorId: doctor.id,
                serviceId: service.id,
                date: appointmentDate,
                time: input.time,
                duration: service.duration,
                reason: input.reason,
                notes: input.notes ?? null,
                severity: input.severity,
                status: "PENDING",
              },
              include: appointmentInclude,
            });

            await tx.notification.create({
              data: {
                doctorId: doctor.id,
                patientId: patient.id,
                type: "APPOINTMENT_BOOKED",
                title: "Nueva cita agendada",
                message: `Se agendó una cita para ${appointmentDate.toISOString().slice(0, 10)} a las ${input.time}.`,
                appointmentId: created.id,
              },
            });

            return created;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        if (appointment === null) {
          return trpcFailure(
            "SCHEDULE_UNAVAILABLE",
            "El horario está fuera de la jornada disponible del médico",
            400,
          );
        }

        if (appointment === false) {
          return trpcFailure(
            "SLOT_UNAVAILABLE",
            "Ese horario ya está ocupado",
            409,
          );
        }

        return trpcSuccess(appointment, "Cita creada correctamente", 201);
      } catch (error) {
        if (isSerializationConflict(error)) {
          return trpcFailure(
            "SLOT_UNAVAILABLE",
            "Ese horario acaba de ser reservado; elige otro",
            409,
          );
        }

        console.error("Unable to create appointment", error);
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible crear la cita",
          500,
        );
      }
    }),

  reschedule: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        newDate: z.date(),
        newTime: timeSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const actor = getActor(ctx.session.user);

      if (!isTodayOrFuture(input.newDate)) {
        return trpcFailure(
          "INVALID_DATE",
          "La cita debe programarse para hoy o una fecha futura",
          400,
        );
      }

      try {
        const current = await ctx.db.appointment.findFirst({
          where: {
            AND: [{ id: input.id }, appointmentScopeForActor(actor)],
          },
        });

        if (!current) {
          return trpcFailure(
            "APPOINTMENT_NOT_FOUND",
            "Cita no encontrada",
            404,
          );
        }

        if (finalAppointmentStatuses.has(current.status)) {
          return trpcFailure(
            "INVALID_STATE",
            "Esta cita ya no se puede reagendar",
            409,
          );
        }

        const { start: appointmentDate, end: nextDay } = getUtcDayBounds(
          input.newDate,
        );
        const appointment = await ctx.db.$transaction(
          async (tx) => {
            const schedule = await tx.schedule.findFirst({
              where: {
                doctorId: current.doctorId,
                dayOfWeek: appointmentDate.getUTCDay(),
                isActive: true,
              },
            });

            if (
              !schedule ||
              !isSlotInsideSchedule(
                input.newTime,
                current.duration,
                schedule.startTime,
                schedule.endTime,
              )
            ) {
              return null;
            }

            const existingAppointments = await tx.appointment.findMany({
              where: {
                id: { not: current.id },
                doctorId: current.doctorId,
                date: { gte: appointmentDate, lt: nextDay },
                status: { in: [...activeAppointmentStatuses] },
              },
              select: { time: true, duration: true },
            });

            if (
              hasTimeConflict(
                input.newTime,
                current.duration,
                existingAppointments,
              )
            ) {
              return false;
            }

            const updated = await tx.appointment.update({
              where: { id: current.id },
              data: {
                date: appointmentDate,
                time: input.newTime,
                status: "CONFIRMED",
              },
              include: appointmentInclude,
            });

            await tx.notification.create({
              data: {
                doctorId: current.doctorId,
                patientId: current.patientId,
                type: "APPOINTMENT_RESCHEDULED",
                title: "Cita reagendada",
                message: `La cita fue reagendada para ${appointmentDate.toISOString().slice(0, 10)} a las ${input.newTime}.`,
                appointmentId: current.id,
              },
            });

            return updated;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        if (appointment === null) {
          return trpcFailure(
            "SCHEDULE_UNAVAILABLE",
            "El horario está fuera de la jornada disponible del médico",
            400,
          );
        }

        if (appointment === false) {
          return trpcFailure(
            "SLOT_UNAVAILABLE",
            "Ese horario ya está ocupado",
            409,
          );
        }

        return trpcSuccess(appointment, "Cita reagendada correctamente");
      } catch (error) {
        if (isSerializationConflict(error)) {
          return trpcFailure(
            "SLOT_UNAVAILABLE",
            "Ese horario acaba de ser reservado; elige otro",
            409,
          );
        }

        console.error("Unable to reschedule appointment", error);
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible reagendar la cita",
          500,
        );
      }
    }),

  cancel: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        reason: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const actor = getActor(ctx.session.user);

      try {
        const current = await ctx.db.appointment.findFirst({
          where: {
            AND: [{ id: input.id }, appointmentScopeForActor(actor)],
          },
        });

        if (!current) {
          return trpcFailure(
            "APPOINTMENT_NOT_FOUND",
            "Cita no encontrada",
            404,
          );
        }

        if (finalAppointmentStatuses.has(current.status)) {
          return trpcFailure(
            "INVALID_STATE",
            "Esta cita ya no se puede cancelar",
            409,
          );
        }

        const appointment = await ctx.db.$transaction(async (tx) => {
          const updated = await tx.appointment.update({
            where: { id: current.id },
            data: { status: "CANCELLED" },
            include: appointmentInclude,
          });

          const reasonSuffix = input.reason ? ` Motivo: ${input.reason}` : "";
          await tx.notification.create({
            data: {
              doctorId: current.doctorId,
              patientId: current.patientId,
              type: "APPOINTMENT_CANCELLED",
              title: "Cita cancelada",
              message: `La cita del ${current.date.toISOString().slice(0, 10)} a las ${current.time} fue cancelada.${reasonSuffix}`,
              appointmentId: current.id,
            },
          });

          return updated;
        });

        return trpcSuccess(appointment, "Cita cancelada correctamente");
      } catch (error) {
        console.error("Unable to cancel appointment", error);
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible cancelar la cita",
          500,
        );
      }
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
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
      const actor = getActor(ctx.session.user);
      if (!canManageAllAppointments(actor)) {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes permisos para cambiar el estado de la cita",
          403,
        );
      }

      try {
        const current = await ctx.db.appointment.findFirst({
          where: {
            AND: [{ id: input.id }, appointmentScopeForActor(actor)],
          },
        });
        if (!current) {
          return trpcFailure(
            "APPOINTMENT_NOT_FOUND",
            "Cita no encontrada",
            404,
          );
        }

        const appointment = await ctx.db.appointment.update({
          where: { id: current.id },
          data: { status: input.status },
        });

        return trpcSuccess(
          appointment.status,
          "Estado de la cita actualizado correctamente",
        );
      } catch (error) {
        console.error("Unable to update appointment status", error);
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar el estado de la cita",
          500,
        );
      }
    }),

  updateNotes: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        notes: z.string().trim().max(2000),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const actor = getActor(ctx.session.user);
      if (!canManageAllAppointments(actor)) {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes permisos para editar notas clínicas",
          403,
        );
      }

      try {
        const current = await ctx.db.appointment.findFirst({
          where: {
            AND: [{ id: input.id }, appointmentScopeForActor(actor)],
          },
        });
        if (!current) {
          return trpcFailure(
            "APPOINTMENT_NOT_FOUND",
            "Cita no encontrada",
            404,
          );
        }

        const appointment = await ctx.db.appointment.update({
          where: { id: current.id },
          data: { notes: input.notes || null, severity: input.severity },
        });

        return trpcSuccess(
          appointment.notes,
          "Notas actualizadas correctamente",
        );
      } catch (error) {
        console.error("Unable to update appointment notes", error);
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar las notas",
          500,
        );
      }
    }),

  updateReason: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        reason: z.string().trim().min(1).max(500),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const actor = getActor(ctx.session.user);
      if (!canManageAllAppointments(actor)) {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes permisos para editar el motivo de la cita",
          403,
        );
      }

      try {
        const current = await ctx.db.appointment.findFirst({
          where: {
            AND: [{ id: input.id }, appointmentScopeForActor(actor)],
          },
        });
        if (!current) {
          return trpcFailure(
            "APPOINTMENT_NOT_FOUND",
            "Cita no encontrada",
            404,
          );
        }

        const appointment = await ctx.db.appointment.update({
          where: { id: current.id },
          data: { reason: input.reason },
        });

        return trpcSuccess(
          appointment.reason,
          "Motivo actualizado correctamente",
        );
      } catch (error) {
        console.error("Unable to update appointment reason", error);
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar el motivo",
          500,
        );
      }
    }),

  updateDuration: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        duration: z.number().int().positive().max(480),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const actor = getActor(ctx.session.user);
      if (!canManageAllAppointments(actor)) {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes permisos para editar la duración de la cita",
          403,
        );
      }

      try {
        const current = await ctx.db.appointment.findFirst({
          where: {
            AND: [{ id: input.id }, appointmentScopeForActor(actor)],
          },
        });
        if (!current) {
          return trpcFailure(
            "APPOINTMENT_NOT_FOUND",
            "Cita no encontrada",
            404,
          );
        }

        const { start, end } = getUtcDayBounds(current.date);
        const result = await ctx.db.$transaction(
          async (tx) => {
            const schedule = await tx.schedule.findFirst({
              where: {
                doctorId: current.doctorId,
                dayOfWeek: start.getUTCDay(),
                isActive: true,
              },
            });

            if (
              !schedule ||
              !isSlotInsideSchedule(
                current.time,
                input.duration,
                schedule.startTime,
                schedule.endTime,
              )
            ) {
              return null;
            }

            const existingAppointments = await tx.appointment.findMany({
              where: {
                id: { not: current.id },
                doctorId: current.doctorId,
                date: { gte: start, lt: end },
                status: { in: [...activeAppointmentStatuses] },
              },
              select: { time: true, duration: true },
            });

            if (
              hasTimeConflict(
                current.time,
                input.duration,
                existingAppointments,
              )
            ) {
              return false;
            }

            return tx.appointment.update({
              where: { id: current.id },
              data: { duration: input.duration },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        if (result === null) {
          return trpcFailure(
            "SCHEDULE_UNAVAILABLE",
            "La duración excede la jornada disponible del médico",
            400,
          );
        }

        if (result === false) {
          return trpcFailure(
            "SLOT_UNAVAILABLE",
            "La duración se solapa con otra cita",
            409,
          );
        }

        return trpcSuccess(
          result.duration,
          "Duración actualizada correctamente",
        );
      } catch (error) {
        if (isSerializationConflict(error)) {
          return trpcFailure(
            "SLOT_UNAVAILABLE",
            "La agenda cambió; vuelve a intentarlo",
            409,
          );
        }

        console.error("Unable to update appointment duration", error);
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar la duración",
          500,
        );
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const actor = getActor(ctx.session.user);
      if (actor.role !== "ADMIN") {
        return trpcFailure(
          "FORBIDDEN",
          "Solo un administrador puede eliminar una cita",
          403,
        );
      }

      try {
        const current = await ctx.db.appointment.findUnique({
          where: { id: input.id },
        });
        if (!current) {
          return trpcFailure(
            "APPOINTMENT_NOT_FOUND",
            "Cita no encontrada",
            404,
          );
        }

        const deleted = await ctx.db.appointment.delete({
          where: { id: current.id },
        });
        return trpcSuccess(deleted, "Cita eliminada correctamente");
      } catch (error) {
        console.error("Unable to delete appointment", error);
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible eliminar la cita",
          500,
        );
      }
    }),

  getPatientHistory: protectedProcedure
    .input(z.object({ patientId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const actor = getActor(ctx.session.user);
      if (actor.role !== "DOCTOR") {
        return trpcFailure(
          "FORBIDDEN",
          "Solo el médico tratante puede consultar este historial",
          403,
        );
      }

      try {
        const appointments = await ctx.db.appointment.findMany({
          where: {
            patientId: input.patientId,
            doctor: { userId: actor.id },
          },
          include: {
            patient: {
              select: {
                user: { select: { name: true, email: true } },
                medicalHistory: true,
              },
            },
            service: true,
          },
          orderBy: [{ date: "desc" }, { time: "desc" }],
        });

        return trpcSuccess(appointments, "Historial obtenido correctamente");
      } catch (error) {
        console.error("Unable to get patient history", error);
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible obtener el historial",
          500,
        );
      }
    }),
});
