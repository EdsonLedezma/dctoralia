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
  getAvailableAppointmentSlots,
  hasTimeConflict,
  isAppointmentTimeInFuture,
  isSlotInsideSchedule,
  isTodayOrFuture,
} from "~/server/domain/appointments/appointment-time";
import { recordAppointmentLifecycleEvent } from "~/server/domain/appointments/lifecycle";
import { recordClinicalRead } from "~/server/domain/clinical/audit";
import { resolveClinicalActor } from "~/server/domain/clinical/access";
import {
  cancelPendingAppointmentReminders,
  scheduleAppointmentReminders,
} from "~/server/domain/messaging/appointment-reminders";
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
  location: true,
  lifecycleEvents: {
    where: { eventType: { in: ["CHECKED_IN", "CONSULTATION_STARTED"] } },
    select: { id: true, eventType: true, occurredAt: true },
    orderBy: { occurredAt: "asc" },
  },
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
      console.error("Unable to list appointments");
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
      console.error("Unable to list actor appointments");
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
        console.error("Unable to list upcoming appointments");
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
        console.error("Unable to get appointment");
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible obtener la cita",
          500,
        );
      }
    }),

  availableSlots: protectedProcedure
    .input(
      z.object({
        appointmentId: z.string().cuid(),
        date: z.date(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const actor = getActor(ctx.session.user);

      try {
        const current = await ctx.db.appointment.findFirst({
          where: {
            AND: [{ id: input.appointmentId }, appointmentScopeForActor(actor)],
          },
          select: { id: true, doctorId: true, duration: true, status: true },
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

        if (!isTodayOrFuture(input.date)) {
          return trpcFailure(
            "INVALID_DATE",
            "Consulta horarios para hoy o una fecha futura",
            400,
          );
        }

        const { start, end } = getUtcDayBounds(input.date);
        const schedule = await ctx.db.schedule.findFirst({
          where: {
            doctorId: current.doctorId,
            dayOfWeek: start.getUTCDay(),
            isActive: true,
          },
          select: { startTime: true, endTime: true },
        });

        if (!schedule) return trpcSuccess([], "No hay jornada para esta fecha");

        const existingAppointments = await ctx.db.appointment.findMany({
          where: {
            id: { not: current.id },
            doctorId: current.doctorId,
            date: { gte: start, lt: end },
            status: { in: [...activeAppointmentStatuses] },
          },
          select: { time: true, duration: true },
        });

        const slots = getAvailableAppointmentSlots(
          input.date,
          current.duration,
          schedule.startTime,
          schedule.endTime,
          existingAppointments,
        );

        return trpcSuccess(slots, "Horarios disponibles obtenidos");
      } catch (error) {
        console.error("Unable to list appointment slots");
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible obtener los horarios disponibles",
          500,
        );
      }
    }),

  bookingSlots: protectedProcedure
    .input(
      z.object({
        serviceId: z.string().min(1),
        date: z.date(),
      }),
    )
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "DOCTOR") {
        return trpcFailure(
          "FORBIDDEN",
          "Sólo el doctor puede consultar su agenda",
          403,
        );
      }

      if (!isTodayOrFuture(input.date)) {
        return trpcFailure(
          "INVALID_DATE",
          "Consulta horarios para hoy o una fecha futura",
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
            "DOCTOR_NOT_FOUND",
            "No encontramos tu perfil de médico",
            404,
          );
        }

        const service = await ctx.db.service.findFirst({
          where: {
            id: input.serviceId,
            doctorId: doctor.id,
            isActive: true,
          },
          select: { id: true, duration: true },
        });
        if (!service) {
          return trpcFailure(
            "SERVICE_REQUIRED",
            "Selecciona un servicio activo para consultar horarios",
            404,
          );
        }

        const { start, end } = getUtcDayBounds(input.date);
        const schedule = await ctx.db.schedule.findFirst({
          where: {
            doctorId: doctor.id,
            dayOfWeek: start.getUTCDay(),
            isActive: true,
          },
          select: { startTime: true, endTime: true },
        });
        if (!schedule) return trpcSuccess([], "No hay jornada para esta fecha");

        const existingAppointments = await ctx.db.appointment.findMany({
          where: {
            doctorId: doctor.id,
            date: { gte: start, lt: end },
            status: { in: [...activeAppointmentStatuses] },
          },
          select: { time: true, duration: true },
        });
        const slots = getAvailableAppointmentSlots(
          input.date,
          service.duration,
          schedule.startTime,
          schedule.endTime,
          existingAppointments,
        );

        return trpcSuccess(slots, "Horarios disponibles obtenidos");
      } catch (error) {
        console.error("Unable to list booking slots");
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible obtener los horarios disponibles",
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
        locationId: z.string().cuid().optional(),
        date: z.date(),
        time: timeSchema,
        duration: z.number().int().positive().max(480).optional(),
        reason: z.string().trim().min(1).max(500),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        notes: z.string().trim().max(2000).optional(),
        intake: z
          .object({
            symptoms: z.string().trim().min(3).max(2000),
            allergies: z.string().trim().max(1000),
            medications: z.string().trim().max(1000),
            context: z.string().trim().max(2000),
          })
          .optional(),
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

      if (!isAppointmentTimeInFuture(input.date, input.time)) {
        return trpcFailure(
          "INVALID_TIME",
          "El horario debe ser posterior a la hora actual",
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

        let locationId: string | null = null;
        if (input.locationId) {
          if (!doctor.clinicId) {
            return trpcFailure(
              "LOCATION_NOT_AVAILABLE",
              "Tu perfil no tiene una clínica configurada para asignar ubicaciones",
              400,
            );
          }
          const location = await ctx.db.clinicLocation.findFirst({
            where: {
              id: input.locationId,
              clinicId: doctor.clinicId,
              isActive: true,
            },
            select: { id: true },
          });
          if (!location) {
            return trpcFailure(
              "LOCATION_NOT_FOUND",
              "Selecciona una ubicación activa de tu clínica",
              400,
            );
          }
          locationId = location.id;
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
                clinicId: doctor.clinicId,
                locationId,
                date: appointmentDate,
                time: input.time,
                duration: service.duration,
                reason: input.reason,
                notes: input.notes ?? null,
                intakeSymptoms: input.intake?.symptoms ?? null,
                intakeAllergies: input.intake?.allergies ?? null,
                intakeMedications: input.intake?.medications ?? null,
                intakeContext: input.intake?.context ?? null,
                severity: input.severity,
                status: "PENDING",
              },
              include: appointmentInclude,
            });

            await scheduleAppointmentReminders(tx, created);

            await recordAppointmentLifecycleEvent(tx, {
              clinicId: created.clinicId,
              appointmentId: created.id,
              patientId: created.patientId,
              doctorId: created.doctorId,
              actorUserId: ctx.session.user.id,
              eventType: "CREATED",
              toStatus: created.status,
              scheduledAt: created.date,
              scheduledTime: created.time,
            });

            await tx.notification.createMany({
              data: [
                {
                  recipientUserId: created.doctor.user.id,
                  doctorId: doctor.id,
                  patientId: patient.id,
                  type: "APPOINTMENT_BOOKED",
                  clinicId: doctor.clinicId,
                  title: "Nueva solicitud de cita",
                  message: `Hay una solicitud para el ${appointmentDate.toISOString().slice(0, 10)} a las ${input.time}.`,
                  appointmentId: created.id,
                },
                {
                  recipientUserId: created.patient.user.id,
                  doctorId: doctor.id,
                  patientId: patient.id,
                  type: "APPOINTMENT_BOOKED",
                  clinicId: doctor.clinicId,
                  title: "Solicitud enviada",
                  message: `Tu solicitud para el ${appointmentDate.toISOString().slice(0, 10)} a las ${input.time} fue enviada al consultorio.`,
                  appointmentId: created.id,
                },
              ],
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

        console.error("Unable to create appointment");
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

      if (!isAppointmentTimeInFuture(input.newDate, input.newTime)) {
        return trpcFailure(
          "INVALID_TIME",
          "El horario debe ser posterior a la hora actual",
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
            const attendanceEvent =
              await tx.appointmentLifecycleEvent.findFirst({
                where: {
                  appointmentId: current.id,
                  eventType: { in: ["CHECKED_IN", "CONSULTATION_STARTED"] },
                },
                select: { id: true },
              });
            if (attendanceEvent) return "attendance_recorded" as const;

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

            await cancelPendingAppointmentReminders(tx, updated.id);
            await scheduleAppointmentReminders(tx, updated);

            await recordAppointmentLifecycleEvent(tx, {
              clinicId: updated.clinicId,
              appointmentId: updated.id,
              patientId: updated.patientId,
              doctorId: updated.doctorId,
              actorUserId: ctx.session.user.id,
              eventType: "RESCHEDULED",
              fromStatus: current.status,
              toStatus: updated.status,
              scheduledAt: updated.date,
              scheduledTime: updated.time,
              metadata: {
                previousDate: current.date.toISOString(),
                previousTime: current.time,
              },
            });

            await tx.notification.createMany({
              data: [
                {
                  recipientUserId: updated.doctor.user.id,
                  doctorId: current.doctorId,
                  patientId: current.patientId,
                  type: "APPOINTMENT_RESCHEDULED",
                  clinicId: updated.clinicId,
                  title: "Cita reagendada",
                  message: `La cita fue reagendada para ${appointmentDate.toISOString().slice(0, 10)} a las ${input.newTime}.`,
                  appointmentId: current.id,
                },
                {
                  recipientUserId: updated.patient.user.id,
                  doctorId: current.doctorId,
                  patientId: current.patientId,
                  type: "APPOINTMENT_RESCHEDULED",
                  clinicId: updated.clinicId,
                  title: "Tu cita fue reagendada",
                  message: `Tu cita fue reagendada para el ${appointmentDate.toISOString().slice(0, 10)} a las ${input.newTime}.`,
                  appointmentId: current.id,
                },
              ],
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

        if (appointment === "attendance_recorded") {
          return trpcFailure(
            "ATTENDANCE_ALREADY_STARTED",
            "No se puede reagendar una cita después de registrar la llegada.",
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

        console.error("Unable to reschedule appointment");
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
          const changed = await tx.appointment.updateMany({
            where: { id: current.id, status: current.status },
            data: { status: "CANCELLED" },
          });
          if (changed.count !== 1) return null;
          const updated = await tx.appointment.findUniqueOrThrow({
            where: { id: current.id },
            include: appointmentInclude,
          });
          await cancelPendingAppointmentReminders(tx, updated.id);

          await recordAppointmentLifecycleEvent(tx, {
            clinicId: updated.clinicId,
            appointmentId: updated.id,
            patientId: updated.patientId,
            doctorId: updated.doctorId,
            actorUserId: ctx.session.user.id,
            eventType: "STATUS_CHANGED",
            fromStatus: current.status,
            toStatus: updated.status,
            scheduledAt: updated.date,
            scheduledTime: updated.time,
            metadata: input.reason ? { reasonProvided: true } : undefined,
          });

          const reasonSuffix = input.reason ? ` Motivo: ${input.reason}` : "";
          await tx.notification.createMany({
            data: [
              {
                recipientUserId: updated.doctor.user.id,
                doctorId: current.doctorId,
                patientId: current.patientId,
                type: "APPOINTMENT_CANCELLED",
                clinicId: updated.clinicId,
                title: "Cita cancelada",
                message: `La cita del ${current.date.toISOString().slice(0, 10)} a las ${current.time} fue cancelada.${reasonSuffix}`,
                appointmentId: current.id,
              },
              {
                recipientUserId: updated.patient.user.id,
                doctorId: current.doctorId,
                patientId: current.patientId,
                type: "APPOINTMENT_CANCELLED",
                clinicId: updated.clinicId,
                title: "Tu cita fue cancelada",
                message: `Tu cita del ${current.date.toISOString().slice(0, 10)} a las ${current.time} fue cancelada.`,
                appointmentId: current.id,
              },
            ],
          });

          return updated;
        });

        if (!appointment) {
          return trpcFailure(
            "CONFLICT",
            "La cita cambió mientras intentabas cancelarla. Actualiza e inténtalo de nuevo.",
            409,
          );
        }

        return trpcSuccess(appointment, "Cita cancelada correctamente");
      } catch (error) {
        console.error("Unable to cancel appointment");
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

        if (current.status === input.status) {
          return trpcSuccess(current.status, "La cita ya tenía ese estado");
        }
        const appointment = await ctx.db.$transaction(async (tx) => {
          const changed = await tx.appointment.updateMany({
            where: { id: current.id, status: current.status },
            data: { status: input.status },
          });
          if (changed.count !== 1) return null;
          const updated = await tx.appointment.findUniqueOrThrow({
            where: { id: current.id },
            include: appointmentInclude,
          });
          await recordAppointmentLifecycleEvent(tx, {
            clinicId: updated.clinicId,
            appointmentId: updated.id,
            patientId: updated.patientId,
            doctorId: updated.doctorId,
            actorUserId: ctx.session.user.id,
            eventType: "STATUS_CHANGED",
            fromStatus: current.status,
            toStatus: updated.status,
            scheduledAt: updated.date,
            scheduledTime: updated.time,
          });
          if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(updated.status)) {
            await cancelPendingAppointmentReminders(tx, updated.id);
          } else {
            await scheduleAppointmentReminders(tx, updated);
          }

          const patientStatusNotice =
            updated.status === "CONFIRMED"
              ? {
                  type: "APPOINTMENT_CONFIRMED" as const,
                  title: "Tu cita está confirmada",
                  message: `Tu cita del ${updated.date.toISOString().slice(0, 10)} a las ${updated.time} quedó confirmada.`,
                }
              : updated.status === "COMPLETED"
                ? {
                    type: "APPOINTMENT_COMPLETED" as const,
                    title: "Tu consulta finalizó",
                    message:
                      "La consulta quedó registrada como completada. Revisa los detalles disponibles en tu cuenta.",
                  }
                : updated.status === "CANCELLED"
                  ? {
                      type: "APPOINTMENT_CANCELLED" as const,
                      title: "Tu cita fue cancelada",
                      message: `Tu cita del ${updated.date.toISOString().slice(0, 10)} a las ${updated.time} fue cancelada.`,
                    }
                  : null;

          if (patientStatusNotice) {
            await tx.notification.create({
              data: {
                recipientUserId: updated.patient.user.id,
                doctorId: updated.doctorId,
                patientId: updated.patientId,
                clinicId: updated.clinicId,
                appointmentId: updated.id,
                type: patientStatusNotice.type,
                title: patientStatusNotice.title,
                message: patientStatusNotice.message,
              },
            });
          }
          return updated;
        });

        if (!appointment) {
          return trpcFailure(
            "CONFLICT",
            "La cita cambió mientras intentabas actualizarla. Actualiza e inténtalo de nuevo.",
            409,
          );
        }

        return trpcSuccess(
          appointment.status,
          "Estado de la cita actualizado correctamente",
        );
      } catch (error) {
        console.error("Unable to update appointment status");
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar el estado de la cita",
          500,
        );
      }
    }),

  recordAttendance: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        action: z.enum(["CHECK_IN", "START_CONSULTATION"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const actor = getActor(ctx.session.user);
      if (!canManageAllAppointments(actor)) {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes permisos para registrar la atención de esta cita.",
          403,
        );
      }

      try {
        const current = await ctx.db.appointment.findFirst({
          where: { AND: [{ id: input.id }, appointmentScopeForActor(actor)] },
          select: { id: true, clinicId: true, date: true },
        });
        if (!current) {
          return trpcFailure(
            "APPOINTMENT_NOT_FOUND",
            "Cita no encontrada",
            404,
          );
        }

        const clinic = current.clinicId
          ? await ctx.db.clinic.findUnique({
              where: { id: current.clinicId },
              select: { timezone: true },
            })
          : null;
        const timeZone = clinic?.timezone ?? "America/Mexico_City";
        const appointmentDay = current.date.toISOString().slice(0, 10);
        let localToday: string;
        try {
          localToday = new Intl.DateTimeFormat("en-CA", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date());
        } catch {
          localToday = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Mexico_City",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date());
        }
        if (appointmentDay !== localToday) {
          return trpcFailure(
            "ATTENDANCE_DATE_MISMATCH",
            "La atención sólo puede registrarse el día local de la cita.",
            400,
          );
        }

        const eventType =
          input.action === "CHECK_IN" ? "CHECKED_IN" : "CONSULTATION_STARTED";
        const result = await ctx.db.$transaction(
          async (tx) => {
            const appointment = await tx.appointment.findFirst({
              where: {
                AND: [{ id: input.id }, appointmentScopeForActor(actor)],
              },
              select: {
                id: true,
                clinicId: true,
                patientId: true,
                doctorId: true,
                date: true,
                time: true,
                status: true,
              },
            });
            if (!appointment) return { kind: "missing" as const };
            if (
              !activeAppointmentStatuses.some(
                (status) => status === appointment.status,
              )
            ) {
              return { kind: "inactive" as const };
            }
            if (appointment.date.toISOString().slice(0, 10) !== localToday) {
              return { kind: "date_mismatch" as const };
            }

            const existing = await tx.appointmentLifecycleEvent.findFirst({
              where: { appointmentId: appointment.id, eventType },
              select: { id: true, occurredAt: true },
            });
            if (existing) return { kind: "recorded" as const, ...existing };

            if (input.action === "START_CONSULTATION") {
              const checkIn = await tx.appointmentLifecycleEvent.findFirst({
                where: {
                  appointmentId: appointment.id,
                  eventType: "CHECKED_IN",
                },
                select: { id: true },
              });
              if (!checkIn) return { kind: "check_in_required" as const };
            }

            const event = await recordAppointmentLifecycleEvent(tx, {
              clinicId: appointment.clinicId,
              appointmentId: appointment.id,
              patientId: appointment.patientId,
              doctorId: appointment.doctorId,
              actorUserId: ctx.session.user.id,
              eventType,
              fromStatus: appointment.status,
              toStatus: appointment.status,
              scheduledAt: appointment.date,
              scheduledTime: appointment.time,
              idempotencyKey: `appointment-attendance:${appointment.id}:${eventType}`,
            });
            if (input.action === "CHECK_IN") {
              await cancelPendingAppointmentReminders(tx, appointment.id);
            }
            return {
              kind: "recorded" as const,
              id: event.id,
              occurredAt: event.occurredAt,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        if (result.kind === "missing") {
          return trpcFailure(
            "APPOINTMENT_NOT_FOUND",
            "Cita no encontrada",
            404,
          );
        }
        if (result.kind === "inactive") {
          return trpcFailure(
            "INVALID_STATE",
            "Sólo puedes registrar la atención de una cita activa.",
            409,
          );
        }
        if (result.kind === "date_mismatch") {
          return trpcFailure(
            "ATTENDANCE_DATE_MISMATCH",
            "La fecha de la cita cambió. Actualiza e inténtalo de nuevo.",
            409,
          );
        }
        if (result.kind === "check_in_required") {
          return trpcFailure(
            "CHECK_IN_REQUIRED",
            "Registra la llegada del paciente antes de iniciar la consulta.",
            409,
          );
        }
        return trpcSuccess(
          { action: input.action, occurredAt: result.occurredAt },
          input.action === "CHECK_IN"
            ? "Llegada registrada"
            : "Inicio de consulta registrado",
        );
      } catch (error) {
        if (isSerializationConflict(error)) {
          return trpcFailure(
            "ATTENDANCE_CONFLICT",
            "La cita cambió durante el registro. Actualiza e inténtalo de nuevo.",
            409,
          );
        }
        console.error("Unable to record appointment attendance");
        return trpcFailure(
          "INTERNAL_ERROR",
          "No se pudo registrar la atención.",
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

        const signedEncounter = await ctx.db.clinicalEncounter.findFirst({
          where: { appointmentId: current.id, status: "SIGNED" },
          select: { id: true },
        });
        if (signedEncounter) {
          return trpcFailure(
            "ENCOUNTER_SIGNED",
            "La consulta está firmada. Registra una enmienda para corregirla.",
            409,
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
        console.error("Unable to update appointment notes");
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
        console.error("Unable to update appointment reason");
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

        console.error("Unable to update appointment duration");
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
        console.error("Unable to delete appointment");
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
        const workspace = await ctx.getWorkspace();
        const clinicalActor = await resolveClinicalActor({
          db: ctx.db,
          userId: ctx.session.user.id,
          role: ctx.session.user.role,
          workspace,
        });
        if (!clinicalActor) {
          return trpcFailure(
            "CLINICAL_ACCESS_REQUIRED",
            "Acceso clínico a un consultorio requerido",
            403,
          );
        }

        const appointments = await ctx.db.appointment.findMany({
          where: {
            patientId: input.patientId,
            clinicId: clinicalActor.clinicId,
            doctorId: clinicalActor.doctorId,
          },
          include: {
            patient: {
              select: {
                user: { select: { name: true, email: true } },
              },
            },
            service: true,
          },
          orderBy: [{ date: "desc" }, { time: "desc" }],
        });
        if (appointments.length === 0) {
          return trpcFailure(
            "PATIENT_NOT_FOUND",
            "No se encontró historial de este paciente en el consultorio.",
            404,
          );
        }

        const consent = await ctx.db.medicalHistoryConsent.findUnique({
          where: {
            patientId_clinicId: {
              patientId: input.patientId,
              clinicId: clinicalActor.clinicId,
            },
          },
          select: { status: true },
        });
        const medicalHistory =
          consent?.status === "GRANTED"
            ? await ctx.db.medicalHistory.findUnique({
                where: { patientId: input.patientId },
                select: {
                  bloodType: true,
                  allergies: true,
                  medications: true,
                  chronicDiseases: true,
                  lastUpdated: true,
                },
              })
            : null;
        await recordClinicalRead(ctx.db, clinicalActor, {
          resourceType: "PATIENT_APPOINTMENT_HISTORY",
          resourceId: input.patientId,
          patientId: input.patientId,
        });
        if (medicalHistory) {
          await recordClinicalRead(ctx.db, clinicalActor, {
            resourceType: "MEDICAL_HISTORY",
            resourceId: input.patientId,
            patientId: input.patientId,
            action: "MEDICAL_HISTORY_READ",
          });
        }

        return trpcSuccess(
          appointments.map((appointment) => ({
            ...appointment,
            patient: { ...appointment.patient, medicalHistory },
          })),
          "Historial obtenido correctamente",
        );
      } catch (error) {
        console.error("Unable to get patient history");
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible obtener el historial",
          500,
        );
      }
    }),
});
