import { type Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  trpcFailure,
  trpcSuccess,
  type TrpcResponse,
} from "~/types/trpc-response";

const notificationInclude = {
  patient: {
    select: {
      user: { select: { name: true } },
    },
  },
} satisfies Prisma.NotificationInclude;

type NotificationResult = Prisma.NotificationGetPayload<{
  include: typeof notificationInclude;
}>;

type NotificationMutationResult = Pick<
  Prisma.NotificationGetPayload<{}>,
  "id" | "isRead"
>;

async function getDoctorId(db: PrismaClient, userId: string) {
  const doctor = await db.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  return doctor?.id ?? null;
}

async function listNotifications(
  db: PrismaClient,
  doctorId: string,
): Promise<NotificationResult[]> {
  return db.notification.findMany({
    where: { doctorId },
    include: notificationInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export const useNotifications = createTRPCRouter({
  getMyNotifications: protectedProcedure.query(
    async ({ ctx }): Promise<TrpcResponse<NotificationResult[]>> => {
      if (ctx.session.user.role !== "DOCTOR") {
        return trpcFailure(
          "FORBIDDEN",
          "Esta bandeja es solo para doctores",
          403,
        );
      }

      try {
        const doctorId = await getDoctorId(ctx.db, ctx.session.user.id);
        if (!doctorId) {
          return trpcFailure(
            "DOCTOR_NOT_FOUND",
            "Perfil de doctor no encontrado",
            404,
          );
        }

        return trpcSuccess(
          await listNotifications(ctx.db, doctorId),
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
    if (ctx.session.user.role !== "DOCTOR") {
      return trpcFailure(
        "FORBIDDEN",
        "Esta bandeja es solo para doctores",
        403,
      );
    }

    try {
      const doctorId = await getDoctorId(ctx.db, ctx.session.user.id);
      if (!doctorId) {
        return trpcFailure(
          "DOCTOR_NOT_FOUND",
          "Perfil de doctor no encontrado",
          404,
        );
      }
      return trpcSuccess(
        await listNotifications(ctx.db, doctorId),
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

  markAsRead: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(
      async ({
        input,
        ctx,
      }): Promise<TrpcResponse<NotificationMutationResult>> => {
        if (ctx.session.user.role !== "DOCTOR") {
          return trpcFailure(
            "FORBIDDEN",
            "No tienes permisos para actualizar esta notificación",
            403,
          );
        }

        try {
          const doctorId = await getDoctorId(ctx.db, ctx.session.user.id);
          if (!doctorId) {
            return trpcFailure(
              "DOCTOR_NOT_FOUND",
              "Perfil de doctor no encontrado",
              404,
            );
          }

          const updated = await ctx.db.notification.updateMany({
            where: { id: input.id, doctorId },
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

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.session.user.role !== "DOCTOR") {
      return trpcFailure(
        "FORBIDDEN",
        "No tienes permisos para actualizar notificaciones",
        403,
      );
    }

    try {
      const doctorId = await getDoctorId(ctx.db, ctx.session.user.id);
      if (!doctorId) {
        return trpcFailure(
          "DOCTOR_NOT_FOUND",
          "Perfil de doctor no encontrado",
          404,
        );
      }

      const result = await ctx.db.notification.updateMany({
        where: { doctorId, isRead: false },
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
        if (ctx.session.user.role !== "DOCTOR") {
          return trpcFailure(
            "FORBIDDEN",
            "No tienes permisos para eliminar esta notificación",
            403,
          );
        }

        try {
          const doctorId = await getDoctorId(ctx.db, ctx.session.user.id);
          if (!doctorId) {
            return trpcFailure(
              "DOCTOR_NOT_FOUND",
              "Perfil de doctor no encontrado",
              404,
            );
          }

          const deleted = await ctx.db.notification.deleteMany({
            where: { id: input.id, doctorId },
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

  markRead: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "DOCTOR") {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes permisos para actualizar esta notificación",
          403,
        );
      }
      try {
        const doctorId = await getDoctorId(ctx.db, ctx.session.user.id);
        if (!doctorId) {
          return trpcFailure(
            "DOCTOR_NOT_FOUND",
            "Perfil de doctor no encontrado",
            404,
          );
        }
        const updated = await ctx.db.notification.updateMany({
          where: { id: input.id, doctorId },
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
});
