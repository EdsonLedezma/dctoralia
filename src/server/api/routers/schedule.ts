import type { Prisma } from "@prisma/client";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  getUtcDayBounds,
  hasTimeConflict,
  timeToMinutes,
} from "~/server/domain/appointments/appointment-time";
import { doctorOwnedScheduleScope } from "~/server/domain/authorization/access-policy";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const scheduleIdSchema = z.object({ id: z.string().min(1) });
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

type Actor = {
  id: string;
  role: "DOCTOR" | "PATIENT" | "ADMIN";
};

function manageableScheduleWhere(
  actor: Actor,
  id: string,
): Prisma.ScheduleWhereInput | null {
  if (actor.role === "ADMIN") {
    return { id };
  }

  const ownershipScope = doctorOwnedScheduleScope(actor);
  return ownershipScope ? { id, ...ownershipScope } : null;
}

function isValidScheduleWindow(startTime: string, endTime: string): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return start !== null && end !== null && start < end;
}

export const useSchedule = createTRPCRouter({
  publicGetByDoctor: publicProcedure
    .input(z.object({ doctorId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        const schedules = await ctx.db.schedule.findMany({
          where: { doctorId: input.doctorId, isActive: true },
          orderBy: { dayOfWeek: "asc" },
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            isActive: true,
          },
        });

        return trpcSuccess(schedules, "Horarios obtenidos correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible obtener los horarios",
          500,
        );
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        doctorId: z.string().optional(),
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: timeSchema,
        endTime: timeSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "DOCTOR") {
        return trpcFailure(
          "FORBIDDEN",
          "Sólo los doctores pueden administrar horarios",
          403,
        );
      }

      if (!isValidScheduleWindow(input.startTime, input.endTime)) {
        return trpcFailure(
          "INVALID_SCHEDULE",
          "La hora de término debe ser posterior a la hora de inicio",
          400,
        );
      }

      try {
        const doctor = await ctx.db.doctor.findUnique({
          where: { userId: ctx.session.user.id },
          select: { id: true },
        });
        if (!doctor) {
          return trpcFailure(
            "DOCTOR_PROFILE_NOT_FOUND",
            "No se encontró el perfil del doctor",
            404,
          );
        }

        const existing = await ctx.db.schedule.findUnique({
          where: {
            doctorId_dayOfWeek: {
              doctorId: doctor.id,
              dayOfWeek: input.dayOfWeek,
            },
          },
          select: { id: true },
        });
        if (existing) {
          return trpcFailure(
            "SCHEDULE_ALREADY_EXISTS",
            "Ya existe un horario para ese día",
            409,
          );
        }

        const schedule = await ctx.db.schedule.create({
          data: {
            doctorId: doctor.id,
            dayOfWeek: input.dayOfWeek,
            startTime: input.startTime,
            endTime: input.endTime,
          },
        });

        return trpcSuccess(schedule, "Horario creado correctamente", 201);
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible crear el horario",
          500,
        );
      }
    }),

  getMine: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "DOCTOR") {
      return trpcFailure(
        "FORBIDDEN",
        "Sólo los doctores pueden administrar horarios",
        403,
      );
    }

    try {
      const doctor = await ctx.db.doctor.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!doctor) {
        return trpcFailure(
          "DOCTOR_PROFILE_NOT_FOUND",
          "No se encontró el perfil del doctor",
          404,
        );
      }

      const schedules = await ctx.db.schedule.findMany({
        where: { doctorId: doctor.id },
        orderBy: { dayOfWeek: "asc" },
      });

      return trpcSuccess(schedules, "Horarios obtenidos correctamente");
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "No fue posible obtener los horarios",
        500,
      );
    }
  }),

  getByDoctor: protectedProcedure
    .input(z.object({ doctorId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role === "PATIENT") {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes acceso a la administración de horarios",
          403,
        );
      }

      try {
        const doctor =
          ctx.session.user.role === "ADMIN"
            ? await ctx.db.doctor.findUnique({
                where: { id: input.doctorId },
                select: { id: true },
              })
            : await ctx.db.doctor.findUnique({
                where: { userId: ctx.session.user.id },
                select: { id: true },
              });

        if (!doctor || doctor.id !== input.doctorId) {
          return trpcFailure(
            "FORBIDDEN",
            "No tienes acceso a los horarios de este doctor",
            403,
          );
        }

        const schedules = await ctx.db.schedule.findMany({
          where: { doctorId: doctor.id },
          orderBy: { dayOfWeek: "asc" },
        });

        return trpcSuccess(schedules, "Horarios obtenidos correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible obtener los horarios",
          500,
        );
      }
    }),

  update: protectedProcedure
    .input(
      scheduleIdSchema.extend({
        startTime: timeSchema,
        endTime: timeSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const where = manageableScheduleWhere(ctx.session.user, input.id);
      if (!where) {
        return trpcFailure("FORBIDDEN", "No tienes acceso a este horario", 403);
      }

      if (!isValidScheduleWindow(input.startTime, input.endTime)) {
        return trpcFailure(
          "INVALID_SCHEDULE",
          "La hora de término debe ser posterior a la hora de inicio",
          400,
        );
      }

      try {
        const ownedSchedule = await ctx.db.schedule.findFirst({
          where,
          select: { id: true },
        });
        if (!ownedSchedule) {
          return trpcFailure(
            "SCHEDULE_NOT_FOUND",
            "Horario no encontrado",
            404,
          );
        }

        const schedule = await ctx.db.schedule.update({
          where: { id: ownedSchedule.id },
          data: { startTime: input.startTime, endTime: input.endTime },
        });
        return trpcSuccess(schedule, "Horario actualizado correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar el horario",
          500,
        );
      }
    }),

  updateIsActive: protectedProcedure
    .input(scheduleIdSchema.extend({ isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const where = manageableScheduleWhere(ctx.session.user, input.id);
      if (!where) {
        return trpcFailure("FORBIDDEN", "No tienes acceso a este horario", 403);
      }

      try {
        const ownedSchedule = await ctx.db.schedule.findFirst({
          where,
          select: { id: true },
        });
        if (!ownedSchedule) {
          return trpcFailure(
            "SCHEDULE_NOT_FOUND",
            "Horario no encontrado",
            404,
          );
        }

        const schedule = await ctx.db.schedule.update({
          where: { id: ownedSchedule.id },
          data: { isActive: input.isActive },
          select: { isActive: true },
        });
        return trpcSuccess(
          schedule.isActive,
          "Estado actualizado correctamente",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar el estado",
          500,
        );
      }
    }),

  delete: protectedProcedure
    .input(scheduleIdSchema)
    .mutation(async ({ input, ctx }) => {
      const where = manageableScheduleWhere(ctx.session.user, input.id);
      if (!where) {
        return trpcFailure("FORBIDDEN", "No tienes acceso a este horario", 403);
      }

      try {
        const ownedSchedule = await ctx.db.schedule.findFirst({
          where,
          select: { id: true },
        });
        if (!ownedSchedule) {
          return trpcFailure(
            "SCHEDULE_NOT_FOUND",
            "Horario no encontrado",
            404,
          );
        }

        const schedule = await ctx.db.schedule.delete({
          where: { id: ownedSchedule.id },
        });
        return trpcSuccess(schedule, "Horario eliminado correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible eliminar el horario",
          500,
        );
      }
    }),

  getAvailableSlots: publicProcedure
    .input(
      z.object({
        doctorId: z.string().min(1),
        serviceId: z.string().min(1).optional(),
        startDate: dateSchema,
        endDate: dateSchema,
      }),
    )
    .query(async ({ input, ctx }) => {
      const requestedStart = new Date(`${input.startDate}T00:00:00.000Z`);
      const requestedEnd = new Date(`${input.endDate}T00:00:00.000Z`);
      if (
        Number.isNaN(requestedStart.getTime()) ||
        Number.isNaN(requestedEnd.getTime()) ||
        requestedStart > requestedEnd
      ) {
        return trpcFailure(
          "INVALID_DATE_RANGE",
          "El rango de fechas no es válido",
          400,
        );
      }

      const maximumEnd = new Date(requestedStart);
      maximumEnd.setUTCDate(maximumEnd.getUTCDate() + 31);
      if (requestedEnd > maximumEnd) {
        return trpcFailure(
          "DATE_RANGE_TOO_LARGE",
          "La disponibilidad se consulta en rangos máximos de 31 días",
          400,
        );
      }

      try {
        const service = input.serviceId
          ? await ctx.db.service.findFirst({
              where: {
                id: input.serviceId,
                doctorId: input.doctorId,
                isActive: true,
              },
              select: { duration: true },
            })
          : null;
        if (input.serviceId && !service) {
          return trpcFailure(
            "SERVICE_NOT_FOUND",
            "El servicio seleccionado no está disponible",
            404,
          );
        }

        const slotDuration = service?.duration ?? 30;
        const schedules = await ctx.db.schedule.findMany({
          where: { doctorId: input.doctorId, isActive: true },
          orderBy: { dayOfWeek: "asc" },
        });

        const finalDay = getUtcDayBounds(requestedEnd).end;
        const appointments = await ctx.db.appointment.findMany({
          where: {
            doctorId: input.doctorId,
            date: { gte: requestedStart, lt: finalDay },
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          select: { date: true, time: true, duration: true },
        });

        const availableSlots: Array<{ date: string; time: string }> = [];
        for (
          let date = new Date(requestedStart);
          date <= requestedEnd;
          date.setUTCDate(date.getUTCDate() + 1)
        ) {
          const schedule = schedules.find(
            (item) => item.dayOfWeek === date.getUTCDay(),
          );
          if (!schedule) {
            continue;
          }

          const startMinutes = timeToMinutes(schedule.startTime);
          const endMinutes = timeToMinutes(schedule.endTime);
          if (startMinutes === null || endMinutes === null) {
            continue;
          }

          const dateKey = date.toISOString().slice(0, 10);
          const appointmentsForDay = appointments
            .filter(
              (appointment) =>
                appointment.date.toISOString().slice(0, 10) === dateKey,
            )
            .map((appointment) => ({
              time: appointment.time,
              duration: appointment.duration,
            }));

          for (
            let currentMinutes = startMinutes;
            currentMinutes + slotDuration <= endMinutes;
            currentMinutes += 15
          ) {
            const hours = Math.floor(currentMinutes / 60)
              .toString()
              .padStart(2, "0");
            const minutes = (currentMinutes % 60).toString().padStart(2, "0");
            const time = `${hours}:${minutes}`;

            if (!hasTimeConflict(time, slotDuration, appointmentsForDay)) {
              availableSlots.push({ date: dateKey, time });
            }
          }
        }

        return trpcSuccess(
          availableSlots,
          "Slots disponibles obtenidos correctamente",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible obtener la disponibilidad",
          500,
        );
      }
    }),
});
