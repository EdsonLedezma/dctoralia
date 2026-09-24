import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";
import type { Prisma } from "@prisma/client";
import {
  patientScopeForActor,
  patientSelfScopeForActor,
} from "~/server/domain/authorization/access-policy";

function actorFromSession(sessionUser: {
  id: string;
  role: "DOCTOR" | "PATIENT" | "ADMIN";
}) {
  return { id: sessionUser.id, role: sessionUser.role } as const;
}

export const usePatients = createTRPCRouter({
  // Crear paciente
  create: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        phone: z.string(),
        birthDate: z.date().optional(),
        gender: z.string().optional(),
        address: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.session.user.role !== "DOCTOR" &&
        ctx.session.user.role !== "ADMIN"
      ) {
        return trpcFailure(
          "FORBIDDEN",
          "Sólo doctores o administradores pueden crear pacientes",
          403,
        );
      }
      try {
        const user = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: { id: true, role: true, patient: { select: { id: true } } },
        });
        if (!user || user.role !== "PATIENT") {
          return trpcFailure(
            "PATIENT_USER_REQUIRED",
            "El usuario debe tener rol de paciente",
            400,
          );
        }
        if (user.patient) {
          return trpcFailure(
            "PATIENT_ALREADY_EXISTS",
            "El perfil de paciente ya existe",
            409,
          );
        }

        const newPatient = await ctx.db.patient.create({
          data: {
            userId: input.userId,
            phone: input.phone,
            birthDate: input.birthDate,
            gender: input.gender,
            address: input.address,
          },
        });
        return trpcSuccess(newPatient, "Paciente creado correctamente", 201);
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al crear paciente", 500);
      }
    }),

  // CRUD de historial médico básico del paciente
  upsertMedicalHistory: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        bloodType: z
          .enum([
            "A_POS",
            "A_NEG",
            "B_POS",
            "B_NEG",
            "AB_POS",
            "AB_NEG",
            "O_POS",
            "O_NEG",
          ])
          .nullable()
          .optional(),
        allergies: z.array(z.string()).default([]),
        medications: z.array(z.string()).default([]),
        chronicDiseases: z.array(z.string()).default([]),
        surgeries: z.array(z.string()).default([]),
        immunizations: z.array(z.string()).default([]),
        healthStatus: z
          .enum(["HEALTHY", "LOW_IMMUNITY", "SICK_LOW_RISK", "SICK_HIGH_RISK"])
          .optional(),
        height: z.string().max(16).optional(),
        weight: z.string().max(16).optional(),
        emergencyName: z.string().max(120).optional(),
        emergencyPhone: z.string().max(40).optional(),
        emergencyRelation: z.string().max(80).optional(),
        insuranceProvider: z.string().max(120).optional(),
        insuranceNumber: z.string().max(80).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const actor = actorFromSession(ctx.session.user);
      const ownershipScope = patientSelfScopeForActor(actor);
      if (!ownershipScope) {
        return trpcFailure(
          "FORBIDDEN",
          "Sólo el paciente o un administrador puede editar el historial",
          403,
        );
      }

      try {
        const patient = await ctx.db.patient.findFirst({
          where: { id: input.patientId, ...ownershipScope },
          select: { id: true },
        });
        if (!patient) {
          return trpcFailure(
            "PATIENT_NOT_FOUND",
            "Paciente no encontrado",
            404,
          );
        }

        const history = await ctx.db.medicalHistory.upsert({
          where: { patientId: patient.id },
          update: {
            bloodType: input.bloodType,
            allergies: input.allergies,
            medications: input.medications,
            chronicDiseases: input.chronicDiseases,
            surgeries: input.surgeries,
            immunizations: input.immunizations,
            healthStatus: input.healthStatus,
            height: input.height,
            weight: input.weight,
            emergencyName: input.emergencyName,
            emergencyPhone: input.emergencyPhone,
            emergencyRelation: input.emergencyRelation,
            insuranceProvider: input.insuranceProvider,
            insuranceNumber: input.insuranceNumber,
            notes: input.notes,
            lastUpdated: new Date(),
          },
          create: {
            patientId: patient.id,
            bloodType: input.bloodType,
            allergies: input.allergies,
            medications: input.medications,
            chronicDiseases: input.chronicDiseases,
            surgeries: input.surgeries,
            immunizations: input.immunizations,
            healthStatus: input.healthStatus ?? "HEALTHY",
            height: input.height,
            weight: input.weight,
            emergencyName: input.emergencyName,
            emergencyPhone: input.emergencyPhone,
            emergencyRelation: input.emergencyRelation,
            insuranceProvider: input.insuranceProvider,
            insuranceNumber: input.insuranceNumber,
            notes: input.notes,
          },
        });
        return trpcSuccess(history, "Historial médico guardado");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al guardar historial médico",
          500,
        );
      }
    }),

  getMedicalHistory: protectedProcedure
    .input(z.object({ patientId: z.string() }))
    .query(async ({ input, ctx }) => {
      const actor = actorFromSession(ctx.session.user);
      try {
        const patient = await ctx.db.patient.findFirst({
          where: { id: input.patientId, ...patientScopeForActor(actor) },
          select: { id: true },
        });
        if (!patient) {
          return trpcFailure(
            "PATIENT_NOT_FOUND",
            "Paciente no encontrado",
            404,
          );
        }

        const history = await ctx.db.medicalHistory.findUnique({
          where: { patientId: patient.id },
        });
        return trpcSuccess(history, "Historial médico");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al obtener historial médico",
          500,
        );
      }
    }),

  // Obtener paciente por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const actor = actorFromSession(ctx.session.user);
      try {
        const patient = await ctx.db.patient.findFirst({
          where: { id: input.id, ...patientScopeForActor(actor) },
        });
        if (!patient) {
          return trpcFailure(
            "PATIENT_NOT_FOUND",
            "Paciente no encontrado",
            404,
          );
        }
        return trpcSuccess(patient, "Paciente encontrado");
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al buscar paciente", 500);
      }
    }),

  // Actualizar teléfono
  updatePhone: protectedProcedure
    .input(z.object({ id: z.string(), phone: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const ownershipScope = patientSelfScopeForActor(
        actorFromSession(ctx.session.user),
      );
      if (!ownershipScope) {
        return trpcFailure("FORBIDDEN", "No puedes editar este paciente", 403);
      }
      try {
        const ownedPatient = await ctx.db.patient.findFirst({
          where: { id: input.id, ...ownershipScope },
          select: { id: true },
        });
        if (!ownedPatient) {
          return trpcFailure(
            "PATIENT_NOT_FOUND",
            "Paciente no encontrado",
            404,
          );
        }
        const patient = await ctx.db.patient.update({
          where: { id: ownedPatient.id },
          data: { phone: input.phone },
        });
        return trpcSuccess(patient.phone, "Teléfono actualizado correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar el teléfono",
          500,
        );
      }
    }),

  // Actualizar dirección
  updateAddress: protectedProcedure
    .input(z.object({ id: z.string(), address: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const ownershipScope = patientSelfScopeForActor(
        actorFromSession(ctx.session.user),
      );
      if (!ownershipScope) {
        return trpcFailure("FORBIDDEN", "No puedes editar este paciente", 403);
      }
      try {
        const ownedPatient = await ctx.db.patient.findFirst({
          where: { id: input.id, ...ownershipScope },
          select: { id: true },
        });
        if (!ownedPatient) {
          return trpcFailure(
            "PATIENT_NOT_FOUND",
            "Paciente no encontrado",
            404,
          );
        }
        const patient = await ctx.db.patient.update({
          where: { id: ownedPatient.id },
          data: { address: input.address },
        });
        return trpcSuccess(
          patient.address,
          "Dirección actualizada correctamente",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar la dirección",
          500,
        );
      }
    }),

  // Actualizar fecha de nacimiento
  updateBirthDate: protectedProcedure
    .input(z.object({ id: z.string(), birthDate: z.date() }))
    .mutation(async ({ input, ctx }) => {
      const ownershipScope = patientSelfScopeForActor(
        actorFromSession(ctx.session.user),
      );
      if (!ownershipScope) {
        return trpcFailure("FORBIDDEN", "No puedes editar este paciente", 403);
      }
      try {
        const ownedPatient = await ctx.db.patient.findFirst({
          where: { id: input.id, ...ownershipScope },
          select: { id: true },
        });
        if (!ownedPatient) {
          return trpcFailure(
            "PATIENT_NOT_FOUND",
            "Paciente no encontrado",
            404,
          );
        }
        const patient = await ctx.db.patient.update({
          where: { id: ownedPatient.id },
          data: { birthDate: input.birthDate },
        });
        return trpcSuccess(
          patient.birthDate,
          "Fecha de nacimiento actualizada correctamente",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar la fecha de nacimiento",
          500,
        );
      }
    }),

  // Actualizar género
  updateGender: protectedProcedure
    .input(z.object({ id: z.string(), gender: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const ownershipScope = patientSelfScopeForActor(
        actorFromSession(ctx.session.user),
      );
      if (!ownershipScope) {
        return trpcFailure("FORBIDDEN", "No puedes editar este paciente", 403);
      }
      try {
        const ownedPatient = await ctx.db.patient.findFirst({
          where: { id: input.id, ...ownershipScope },
          select: { id: true },
        });
        if (!ownedPatient) {
          return trpcFailure(
            "PATIENT_NOT_FOUND",
            "Paciente no encontrado",
            404,
          );
        }
        const patient = await ctx.db.patient.update({
          where: { id: ownedPatient.id },
          data: { gender: input.gender },
        });
        return trpcSuccess(patient.gender, "Género actualizado correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar el género",
          500,
        );
      }
    }),

  // Eliminar paciente
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "ADMIN") {
        return trpcFailure(
          "FORBIDDEN",
          "Sólo un administrador puede eliminar pacientes",
          403,
        );
      }
      try {
        const deleted = await ctx.db.patient.delete({
          where: { id: input.id },
        });
        return trpcSuccess(deleted, "Paciente eliminado correctamente");
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al eliminar paciente", 500);
      }
    }),

  // Obtener todos los pacientes (incluye datos básicos del usuario)
  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      let where: Prisma.PatientWhereInput;
      if (ctx.session.user.role === "PATIENT") {
        where = { userId: ctx.session.user.id };
      } else if (ctx.session.user.role === "DOCTOR") {
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
        where = { appointments: { some: { doctorId: doctor.id } } };
      } else if (ctx.session.user.role === "ADMIN") {
        where = {};
      } else {
        return trpcFailure("FORBIDDEN", "No tienes acceso a pacientes", 403);
      }

      const patients = await ctx.db.patient.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });
      return trpcSuccess(patients, "Pacientes obtenidos correctamente");
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "No fue posible obtener pacientes",
        500,
      );
    }
  }),
});
