import { randomInt } from "node:crypto";
import { z } from "zod";
import { env } from "~/env";
import { publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { hashVoiceCode } from "~/server/domain/voice/voice-policy";
import { resolveVoiceLine } from "~/server/domain/voice/voice-context";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

export const voiceAgentControls = {
  setAddonLicense: protectedProcedure
    .input(
      z.object({ clinicId: z.string().cuid(), enabled: z.boolean() }).strict(),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN")
        return trpcFailure(
          "FORBIDDEN",
          "Solo administración puede habilitar licencias.",
          403,
        );
      try {
        const subscription = await ctx.db.clinicSubscription.update({
          where: { clinicId: input.clinicId },
          data: { voiceAgentEnabled: input.enabled },
          select: { clinicId: true, voiceAgentEnabled: true },
        });
        return trpcSuccess(
          subscription,
          "Licencia actualizada. El médico debe activar su asistente.",
        );
      } catch {
        return trpcFailure(
          "LICENSE_UNAVAILABLE",
          "No se pudo actualizar la licencia del consultorio.",
          409,
        );
      }
    }),
  availability: publicProcedure
    .input(z.object({ doctorId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      try {
        const candidate = await ctx.db.voiceAgentLine.findFirst({
          where: { doctorId: input.doctorId, status: "ACTIVE", enabled: true },
          select: { vapiPhoneNumberId: true, phoneNumber: true },
        });
        const line = candidate?.vapiPhoneNumberId
          ? await resolveVoiceLine(ctx.db, candidate.vapiPhoneNumberId)
          : null;
        return trpcSuccess(
          {
            enabled: !!line,
            phoneNumber: line ? (candidate?.phoneNumber ?? null) : null,
          },
          "Disponibilidad del asistente.",
        );
      } catch {
        return trpcSuccess(
          { enabled: false, phoneNumber: null },
          "Asistente no disponible.",
        );
      }
    }),
  configure: protectedProcedure
    .input(
      z
        .object({ enabled: z.boolean(), mutationsEnabled: z.boolean() })
        .strict(),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "DOCTOR")
        return trpcFailure(
          "FORBIDDEN",
          "Solo el médico puede configurar su asistente.",
          403,
        );
      try {
        const doctor = await ctx.db.doctor.findUnique({
          where: { userId: ctx.session.user.id },
          select: { id: true, clinicId: true },
        });
        const workspace = await ctx.getWorkspace();
        if (!doctor?.clinicId || workspace?.clinicId !== doctor.clinicId)
          return trpcFailure("FORBIDDEN", "Selecciona tu consultorio.", 403);
        const line = await ctx.db.voiceAgentLine.findUnique({
          where: {
            clinicId_doctorId: {
              clinicId: doctor.clinicId,
              doctorId: doctor.id,
            },
          },
          select: {
            id: true,
            status: true,
            vapiAssistantId: true,
            vapiPhoneNumberId: true,
          },
        });
        if (!line)
          return trpcFailure(
            "LINE_REQUIRED",
            "Primero solicita la conexión de tu línea.",
            409,
          );
        if (input.enabled) {
          if (env.DEMO_MODE === "true")
            return trpcFailure(
              "DEMO_MODE",
              "Las llamadas están desactivadas en la demo.",
              503,
            );
          const subscription = await ctx.db.clinicSubscription.findUnique({
            where: { clinicId: doctor.clinicId },
            select: { voiceAgentEnabled: true, status: true },
          });
          if (
            !subscription?.voiceAgentEnabled ||
            !["ACTIVE", "TRIALING"].includes(subscription.status)
          )
            return trpcFailure(
              "ADDON_REQUIRED",
              "Tu licencia no tiene habilitado el complemento de llamadas.",
              403,
            );
          if (
            line.status !== "ACTIVE" ||
            !line.vapiPhoneNumberId ||
            !line.vapiAssistantId
          )
            return trpcFailure(
              "LINE_NOT_READY",
              "La línea todavía no está conectada a Vapi.",
              409,
            );
        }
        const updated = await ctx.db.voiceAgentLine.update({
          where: { id: line.id },
          data: {
            enabled: input.enabled,
            mutationsEnabled: input.enabled && input.mutationsEnabled,
          },
          select: { enabled: true, mutationsEnabled: true },
        });
        return trpcSuccess(
          updated,
          input.enabled ? "Asistente habilitado." : "Asistente desactivado.",
        );
      } catch {
        return trpcFailure(
          "VOICE_UNAVAILABLE",
          "No se pudo guardar la configuración.",
          503,
        );
      }
    }),
  issueAccessCode: protectedProcedure
    .input(z.object({ doctorId: z.string().cuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "PATIENT")
        return trpcFailure(
          "FORBIDDEN",
          "Inicia sesión con tu cuenta de paciente.",
          403,
        );
      if (env.DEMO_MODE === "true" || !env.VAPI_WEBHOOK_TOKEN)
        return trpcFailure(
          "VOICE_DISABLED",
          "Las llamadas no están habilitadas.",
          503,
        );
      try {
        const lineId = await ctx.db.voiceAgentLine.findFirst({
          where: { doctorId: input.doctorId, status: "ACTIVE", enabled: true },
          select: { vapiPhoneNumberId: true, phoneNumber: true },
        });
        if (!lineId?.vapiPhoneNumberId)
          return trpcFailure(
            "VOICE_DISABLED",
            "Este médico no tiene activado el asistente.",
            404,
          );
        const line = await resolveVoiceLine(ctx.db, lineId.vapiPhoneNumberId);
        const patient = await ctx.db.patient.findUnique({
          where: { userId: ctx.session.user.id },
          select: { id: true },
        });
        if (!line || !patient)
          return trpcFailure(
            "VOICE_DISABLED",
            "No se pudo autorizar esta solicitud.",
            403,
          );
        const now = new Date();
        const recent = await ctx.db.voicePatientCode.count({
          where: {
            patientId: patient.id,
            lineId: line.id,
            createdAt: { gte: new Date(now.getTime() - 10 * 60_000) },
          },
        });
        if (recent >= 3)
          return trpcFailure(
            "RATE_LIMITED",
            "Espera unos minutos antes de generar otro código.",
            429,
          );
        const code = String(randomInt(10000000, 100000000));
        const expiresAt = new Date(now.getTime() + 10 * 60_000);
        await ctx.db.$transaction(async (tx) => {
          await tx.voicePatientCode.updateMany({
            where: { lineId: line.id, patientId: patient.id, consumedAt: null },
            data: { expiresAt: now },
          });
          await tx.voicePatientCode.create({
            data: {
              lineId: line.id,
              patientId: patient.id,
              tokenHash: hashVoiceCode(code, line.id, env.VAPI_WEBHOOK_TOKEN!),
              expiresAt,
            },
          });
        });
        return trpcSuccess(
          { code, expiresAt, phoneNumber: lineId.phoneNumber },
          "Código creado. Compártelo únicamente durante tu llamada al consultorio.",
        );
      } catch {
        return trpcFailure(
          "VOICE_UNAVAILABLE",
          "No se pudo generar el código.",
          503,
        );
      }
    }),
};
