import { type Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  trpcFailure,
  trpcSuccess,
  type TrpcResponse,
} from "~/types/trpc-response";

const notificationInclude = {
  patient: { select: { user: { select: { name: true } } } },
  doctor: { select: { user: { select: { name: true } } } },
} satisfies Prisma.NotificationInclude;

type NotificationResult = Prisma.NotificationGetPayload<{
  include: typeof notificationInclude;
}>;

type NotificationMutationResult = Pick<
  Prisma.NotificationGetPayload<{}>,
  "id" | "isRead"
>;

function notificationScope(userId: string): Prisma.NotificationWhereInput {
  return {
    OR: [
      { recipientUserId: userId },
      { recipientUserId: null, doctor: { userId } },
    ],
  };
}

async function listNotifications(db: PrismaClient, userId: string) {
  return db.notification.findMany({
    where: notificationScope(userId),
    include: notificationInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export const useNotifications = createTRPCRouter({
  getMyNotifications: protectedProcedure.query(
    async ({ ctx }): Promise<TrpcResponse<NotificationResult[]>> => {
      try {
        return trpcSuccess(
          await listNotifications(ctx.db, ctx.session.user.id),
          "Notificaciones recuperadas",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No se pudieron cargar las notificaciones",
          500,
        );
      }
    },
  ),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    try {
      return trpcSuccess(
        await listNotifications(ctx.db, ctx.session.user.id),
        "Notificaciones recuperadas",
      );
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "No se pudieron cargar las notificaciones",
        500,
      );
    }
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      const count = await ctx.db.notification.count({
        where: {
          AND: [notificationScope(ctx.session.user.id), { isRead: false }],
        },
      });
      return trpcSuccess(count, "Avisos pendientes recuperados");
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "No se pudieron cargar los avisos pendientes",
        500,
      );
    }
  }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(
      async ({
        input,
        ctx,
      }): Promise<TrpcResponse<NotificationMutationResult>> => {
        try {
          const updated = await ctx.db.notification.updateMany({
            where: {
              AND: [notificationScope(ctx.session.user.id), { id: input.id }],
            },
            data: { isRead: true },
          });
          if (updated.count === 0) {
            return trpcFailure(
              "NOTIFICATION_NOT_FOUND",
              "Notificación no encontrada",
              404,
            );
          }
          return trpcSuccess(
            { id: input.id, isRead: true },
            "Notificación marcada como leída",
          );
        } catch {
          return trpcFailure(
            "INTERNAL_ERROR",
            "No se pudo actualizar la notificación",
            500,
          );
        }
      },
    ),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const updated = await ctx.db.notification.updateMany({
          where: {
            AND: [notificationScope(ctx.session.user.id), { id: input.id }],
          },
          data: { isRead: true },
        });
        if (updated.count === 0) {
          return trpcFailure(
            "NOTIFICATION_NOT_FOUND",
            "Notificación no encontrada",
            404,
          );
        }
        return trpcSuccess(
          { id: input.id, isRead: true },
          "Notificación marcada como leída",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No se pudo actualizar la notificación",
          500,
        );
      }
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await ctx.db.notification.updateMany({
        where: {
          AND: [notificationScope(ctx.session.user.id), { isRead: false }],
        },
        data: { isRead: true },
      });
      return trpcSuccess(result, "Todas las notificaciones están al día");
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "No se pudieron actualizar las notificaciones",
        500,
      );
    }
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(
      async ({
        input,
        ctx,
      }): Promise<TrpcResponse<NotificationMutationResult>> => {
        try {
          const deleted = await ctx.db.notification.deleteMany({
            where: {
              AND: [notificationScope(ctx.session.user.id), { id: input.id }],
            },
          });
          if (deleted.count === 0) {
            return trpcFailure(
              "NOTIFICATION_NOT_FOUND",
              "Notificación no encontrada",
              404,
            );
          }
          return trpcSuccess(
            { id: input.id, isRead: true },
            "Notificación eliminada",
          );
        } catch {
          return trpcFailure(
            "INTERNAL_ERROR",
            "No se pudo eliminar la notificación",
            500,
          );
        }
      },
    ),
});
