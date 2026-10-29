import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { normalizeVoicePhone } from "~/server/integrations/vapi/phone-number";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

export const voiceAgentRouter = createTRPCRouter({
  getMine: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "DOCTOR")
      return trpcFailure("FORBIDDEN", "Solo médicos pueden configurar su línea", 403);
    const doctor = await ctx.db.doctor.findUnique({
      where: { userId: ctx.session.user.id },
      select: { id: true, clinicId: true, phone: true },
    });
    if (!doctor?.clinicId)
      return trpcFailure("WORKSPACE_REQUIRED", "Configura tu consultorio primero", 400);
    const line = await ctx.db.voiceAgentLine.findUnique({
      where: { clinicId_doctorId: { clinicId: doctor.clinicId, doctorId: doctor.id } },
      select: { id: true, phoneNumber: true, status: true, createdAt: true },
    });
    return trpcSuccess(
      { profilePhone: doctor.phone, line },
      "Estado de línea recuperado",
    );
  }),

  requestLine: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.session.user.role !== "DOCTOR")
      return trpcFailure("FORBIDDEN", "Solo médicos pueden solicitar su línea", 403);
    const doctor = await ctx.db.doctor.findUnique({
      where: { userId: ctx.session.user.id },
      select: { id: true, clinicId: true, phone: true },
    });
    if (!doctor?.clinicId)
      return trpcFailure("WORKSPACE_REQUIRED", "Configura tu consultorio primero", 400);
    const workspace = await ctx.getWorkspace();
    if (workspace?.clinicId !== doctor.clinicId)
      return trpcFailure("WORKSPACE_FORBIDDEN", "Selecciona tu consultorio", 403);
    const phoneNumber = normalizeVoicePhone(doctor.phone);
    if (!phoneNumber)
      return trpcFailure(
        "PHONE_INVALID",
        "Guarda un teléfono válido en tu perfil antes de solicitar la línea",
        400,
      );

    const existing = await ctx.db.voiceAgentLine.findUnique({
      where: { clinicId_doctorId: { clinicId: doctor.clinicId, doctorId: doctor.id } },
    });
    if (existing?.status === "ACTIVE")
      return trpcFailure(
        "LINE_ALREADY_ACTIVE",
        "Ya tienes una línea activa; solicita el cambio al equipo de soporte",
        409,
      );
    try {
      const line = await ctx.db.voiceAgentLine.upsert({
        where: { clinicId_doctorId: { clinicId: doctor.clinicId, doctorId: doctor.id } },
        create: { clinicId: doctor.clinicId, doctorId: doctor.id, phoneNumber },
        update: {
          phoneNumber,
          status: "PENDING",
          vapiPhoneNumberId: null,
          vapiDialInNumber: null,
          vapiAssistantId: null,
        },
        select: { id: true, phoneNumber: true, status: true },
      });
      return trpcSuccess(line, "Solicitud de línea registrada");
    } catch {
      return trpcFailure(
        "PHONE_ALREADY_REQUESTED",
        "Este número ya está asociado a otro consultorio",
        409,
      );
    }
  }),
});
