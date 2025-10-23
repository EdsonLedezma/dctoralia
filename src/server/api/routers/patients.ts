import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const usePatients = createTRPCRouter({
  // Crear paciente
  create: protectedProcedure.input(z.object({
    userId: z.string(),
    phone: z.string(),
    birthDate: z.date().optional(),
    gender: z.string().optional(),
    address: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    try {
      const newPatient = await ctx.db.patient.create({
        data: {
          userId: input.userId,
          phone: input.phone,
          birthDate: input.birthDate,
          gender: input.gender,
          address: input.address,
        },
      });
      return {
        status: 201,
        message: "Paciente creado correctamente",
        result: newPatient,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al crear paciente",
        result: null,
        error,
      };
    }
  }),

  // CRUD de historial médico básico del paciente
  upsertMedicalHistory: protectedProcedure.input(
    z.object({
      patientId: z.string(),
      bloodType: z.enum(["A_POS","A_NEG","B_POS","B_NEG","AB_POS","AB_NEG","O_POS","O_NEG"]).optional(),
      allergies: z.array(z.string()).default([]),
      medications: z.array(z.string()).default([]),
      chronicDiseases: z.array(z.string()).default([]),
      surgeries: z.array(z.string()).default([]),
      immunizations: z.array(z.string()).default([]),
      healthStatus: z.enum(["HEALTHY","LOW_IMMUNITY","SICK_LOW_RISK","SICK_HIGH_RISK"]).optional(),
      notes: z.string().optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const history = await ctx.db.medicalHistory.upsert({
        where: { patientId: input.patientId },
        update: {
          bloodType: input.bloodType,
          allergies: input.allergies,
          medications: input.medications,
          chronicDiseases: input.chronicDiseases,
          surgeries: input.surgeries,
          immunizations: input.immunizations,
          healthStatus: input.healthStatus,
          notes: input.notes,
          lastUpdated: new Date(),
        },
        create: {
          patientId: input.patientId,
          bloodType: input.bloodType,
          allergies: input.allergies,
          medications: input.medications,
          chronicDiseases: input.chronicDiseases,
          surgeries: input.surgeries,
          immunizations: input.immunizations,
          healthStatus: input.healthStatus ?? "HEALTHY",
          notes: input.notes,
        },
      });
      return { status: 200, message: "Historial médico guardado", result: history, error: null };
    } catch (error) {
      return { status: 500, message: "Error al guardar historial médico", result: null, error };
    }
  }),

  getMedicalHistory: protectedProcedure.input(z.object({ patientId: z.string() })).query(async ({ input, ctx }) => {
    try {
      const history = await ctx.db.medicalHistory.findUnique({ where: { patientId: input.patientId } });
      return { status: 200, message: "Historial médico", result: history, error: null };
    } catch (error) {
      return { status: 500, message: "Error al obtener historial médico", result: null, error };
    }
  }),

  // Obtener paciente por ID
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    try {
      const patient = await ctx.db.patient.findUnique({ where: { id: input.id } });
      if (!patient) {
        return {
          status: 404,
          message: "Paciente no encontrado",
          result: null,
          error: new Error("Paciente no encontrado"),
        };
      }
      return {
        status: 200,
        message: "Paciente encontrado",
        result: patient,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al buscar paciente",
        result: null,
        error,
      };
    }
  }),

  // Actualizar teléfono
  updatePhone: protectedProcedure.input(z.object({ id: z.string(), phone: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const patient = await ctx.db.patient.update({ where: { id: input.id }, data: { phone: input.phone } });
      return {
        status: 200,
        message: "Teléfono actualizado correctamente",
        result: patient.phone,
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

  // Actualizar dirección
  updateAddress: protectedProcedure.input(z.object({ id: z.string(), address: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const patient = await ctx.db.patient.update({ where: { id: input.id }, data: { address: input.address } });
      return {
        status: 200,
        message: "Dirección actualizada correctamente",
        result: patient.address,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar la dirección",
        result: null,
        error,
      };
    }
  }),

  // Actualizar fecha de nacimiento
  updateBirthDate: protectedProcedure.input(z.object({ id: z.string(), birthDate: z.date() })).mutation(async ({ input, ctx }) => {
    try {
      const patient = await ctx.db.patient.update({ where: { id: input.id }, data: { birthDate: input.birthDate } });
      return {
        status: 200,
        message: "Fecha de nacimiento actualizada correctamente",
        result: patient.birthDate,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar la fecha de nacimiento",
        result: null,
        error,
      };
    }
  }),

  // Actualizar género
  updateGender: protectedProcedure.input(z.object({ id: z.string(), gender: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const patient = await ctx.db.patient.update({ where: { id: input.id }, data: { gender: input.gender } });
      return {
        status: 200,
        message: "Género actualizado correctamente",
        result: patient.gender,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al actualizar el género",
        result: null,
        error,
      };
    }
  }),

  // Eliminar paciente
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    try {
      const deleted = await ctx.db.patient.delete({ where: { id: input.id } });
      return {
        status: 200,
        message: "Paciente eliminado correctamente",
        result: deleted,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al eliminar paciente",
        result: null,
        error,
      };
    }
  }),

  // Valorar doctor (rating)
  rateDoctor: protectedProcedure.input(z.object({ doctorId: z.string(), patientId: z.string(), rating: z.number().min(1).max(5) })).mutation(async ({ input, ctx }) => {
    try {
      // Actualizar o crear review
      const review = await ctx.db.review.upsert({
        where: { doctorId_patientId: { doctorId: input.doctorId, patientId: input.patientId } },
        update: { rating: input.rating },
        create: { doctorId: input.doctorId, patientId: input.patientId, rating: input.rating },
      });
      return {
        status: 200,
        message: "Calificación registrada correctamente",
        result: review,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al registrar calificación",
        result: null,
        error,
      };
    }
  }),

  // Agendar cita con doctor
  bookAppointment: protectedProcedure.input(z.object({
    doctorId: z.string(),
    patientId: z.string(),
    serviceId: z.string(),
    date: z.date(),
    time: z.string(),
    duration: z.number(),
    reason: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    try {
      // Validar disponibilidad antes de crear
      const dayOfWeek = input.date.getDay();
      const schedule = await ctx.db.schedule.findFirst({ where: { doctorId: input.doctorId, dayOfWeek, isActive: true } });
      if (!schedule) {
        return { status: 400, message: "El doctor no tiene horario disponible ese día", result: null, error: null };
      }
      const within = input.time >= schedule.startTime && input.time <= schedule.endTime;
      if (!within) {
        return { status: 400, message: "Hora fuera del horario disponible", result: null, error: null };
      }
      const clash = await ctx.db.appointment.findFirst({ where: { doctorId: input.doctorId, date: input.date, time: input.time, status: { in: ["PENDING","CONFIRMED"] } } });
      if (clash) {
        return { status: 409, message: "Horario ya ocupado", result: null, error: null };
      }

      const appointment = await ctx.db.appointment.create({
        data: {
          doctorId: input.doctorId,
          patientId: input.patientId,
          serviceId: input.serviceId,
          date: input.date,
          time: input.time,
          duration: input.duration,
          reason: input.reason,
          notes: input.notes,
        },
      });
      await ctx.db.notification.create({
        data: {
          doctorId: input.doctorId,
          patientId: input.patientId,
          type: "APPOINTMENT_BOOKED",
          title: "Nueva cita agendada",
          message: `Se agendó una cita para ${input.date.toISOString().slice(0, 10)} a las ${input.time}.`,
          appointmentId: appointment.id,
        },
      });
      return {
        status: 201,
        message: "Cita agendada correctamente",
        result: appointment,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al agendar cita",
        result: null,
        error,
      };
    }
  }),

  // Dejar reseña al doctor
  leaveReview: protectedProcedure.input(z.object({ doctorId: z.string(), patientId: z.string(), rating: z.number().min(1).max(5), comment: z.string().optional() })).mutation(async ({ input, ctx }) => {
    try {
      const review = await ctx.db.review.upsert({
        where: { doctorId_patientId: { doctorId: input.doctorId, patientId: input.patientId } },
        update: { rating: input.rating, comment: input.comment },
        create: { doctorId: input.doctorId, patientId: input.patientId, rating: input.rating, comment: input.comment },
      });
      return {
        status: 200,
        message: "Reseña registrada correctamente",
        result: review,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al dejar reseña",
        result: null,
        error,
      };
    }
  }),

  // Obtener todos los pacientes (incluye datos básicos del usuario)
  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      const patients = await ctx.db.patient.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });
      return {
        status: 200,
        message: "Pacientes obtenidos correctamente",
        result: patients,
        error: null,
      };
    } catch (error) {
      return {
        status: 500,
        message: "Error al obtener pacientes",
        result: null,
        error,
      };
    }
  }),
});
