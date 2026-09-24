import { randomUUID } from "node:crypto";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { enqueueMessage } from "~/server/domain/messaging/outbox";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

export const messagingRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const workspace = await ctx.getWorkspace();
      if (!workspace || !["OWNER", "ADMIN"].includes(workspace.membershipRole))
        return trpcFailure(
          "MESSAGING_FORBIDDEN",
          "No tienes acceso a comunicaciones.",
          403,
        );
      const messages = await ctx.db.messageOutbox.findMany({
        where: { clinicId: workspace.clinicId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          channel: true,
          template: true,
          status: true,
          attempts: true,
          createdAt: true,
          lastErrorCode: true,
          sandbox: true,
        },
      });
      return trpcSuccess(
        {
          enabled: env.SENT_ENABLED === "true",
          sandbox: env.SENT_SANDBOX !== "false",
          messages,
        },
        "Comunicaciones recuperadas",
      );
    } catch {
      return trpcFailure(
        "MESSAGING_UNAVAILABLE",
        "No se pudieron cargar las comunicaciones.",
        503,
      );
    }
  }),
  test: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const workspace = await ctx.getWorkspace();
      if (!workspace || workspace.membershipRole !== "OWNER")
        return trpcFailure(
          "MESSAGING_FORBIDDEN",
          "Solo el propietario puede probar la integración.",
          403,
        );
      if (
        env.SENT_ENABLED !== "true" ||
        !env.SENT_API_KEY ||
        !env.SENT_TEST_TEMPLATE
      )
        return trpcFailure(
          "MESSAGING_NOT_CONFIGURED",
          "Configura Sent y una plantilla de prueba antes de continuar.",
          503,
        );
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { phone: true, name: true },
      });
      if (!user?.phone || !/^\+[1-9]\d{7,14}$/.test(user.phone))
        return trpcFailure(
          "PHONE_REQUIRED",
          "Guarda tu teléfono con código de país en tu perfil.",
          400,
        );
      const message = await enqueueMessage(ctx.db, {
        clinicId: workspace.clinicId,
        channel: "WHATSAPP",
        recipient: user.phone,
        template: env.SENT_TEST_TEMPLATE,
        payload: { name: user.name },
        idempotencyKey: `sandbox-${workspace.clinicId}-${randomUUID()}`,
        sandbox: true,
      });
      return trpcSuccess(
        { id: message.id },
        "Prueba en cola. El dispatcher la procesará en sandbox.",
        201,
      );
    } catch {
      return trpcFailure(
        "MESSAGING_UNAVAILABLE",
        "No se pudo preparar la prueba.",
        503,
      );
    }
  }),
});
