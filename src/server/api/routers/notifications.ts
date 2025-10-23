import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const useNotifications = createTRPCRouter({
  // Listar notificaciones del doctor autenticado
  listMine: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.session.user.role !== "DOCTOR") {
        return { status: 200, message: "Sin rol de doctor", result: [], error: null };
      }
      const doctor = await ctx.db.doctor.findUnique({ where: { userId: ctx.session.user.id } });
      if (!doctor) return { status: 404, message: "Perfil de doctor no encontrado", result: [], error: null };
      const notifs = await ctx.db.notification.findMany({
        where: { doctorId: doctor.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return { status: 200, message: "Notificaciones", result: notifs, error: null };
    } catch (error) {
      return { status: 500, message: "Error al obtener notificaciones", result: null, error };
    }
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const notif = await ctx.db.notification.update({ where: { id: input.id }, data: { isRead: true } });
        return { status: 200, message: "Notificación marcada como leída", result: notif, error: null };
      } catch (error) {
        return { status: 500, message: "Error al marcar notificación", result: null, error };
      }
    }),
});


