import { hash } from "argon2";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

const userIdSchema = z.object({ id: z.string().min(1) });

function canManageUser(actor: { id: string; role: string }, userId: string) {
  return actor.role === "ADMIN" || actor.id === userId;
}

function forbidden(message: string) {
  return trpcFailure("FORBIDDEN", message, 403);
}

export const useUsers = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        phone: z.string().trim().optional(),
        role: z
          .enum(["ADMIN", "DOCTOR", "PATIENT"])
          .optional()
          .default("PATIENT"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.session.user.role !== "ADMIN" &&
        !(ctx.session.user.role === "DOCTOR" && input.role === "PATIENT")
      ) {
        return forbidden(
          "Sólo administradores o doctores pueden crear pacientes",
        );
      }

      try {
        const user = await ctx.db.user.create({
          data: {
            name: input.name,
            email: input.email.toLowerCase(),
            password: await hash(input.password),
            phone: input.phone ?? "",
            role: input.role,
          },
          select: publicUserSelect,
        });
        return trpcSuccess(user, "Usuario creado correctamente", 201);
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al crear el usuario", 500);
      }
    }),

  getById: protectedProcedure
    .input(userIdSchema)
    .query(async ({ input, ctx }) => {
      if (!canManageUser(ctx.session.user, input.id)) {
        return forbidden("No tienes acceso a este usuario");
      }

      try {
        const user = await ctx.db.user.findUnique({
          where: { id: input.id },
          select: publicUserSelect,
        });
        if (!user) {
          return trpcFailure("USER_NOT_FOUND", "Usuario no encontrado", 404);
        }
        return trpcSuccess(user, "Usuario encontrado");
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al buscar usuario", 500);
      }
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "ADMIN") {
      return forbidden("Sólo los administradores pueden listar usuarios");
    }

    try {
      const users = await ctx.db.user.findMany({ select: publicUserSelect });
      return trpcSuccess(users, "Usuarios obtenidos correctamente");
    } catch {
      return trpcFailure("INTERNAL_ERROR", "Error al obtener usuarios", 500);
    }
  }),

  getAllWithProfile: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "ADMIN") {
      return forbidden(
        "Sólo los administradores pueden ver todos los usuarios",
      );
    }

    try {
      const users = await ctx.db.user.findMany({
        select: {
          ...publicUserSelect,
          patient: true,
          doctor: true,
        },
      });
      return trpcSuccess(users, "Usuarios obtenidos correctamente");
    } catch {
      return trpcFailure("INTERNAL_ERROR", "Error al obtener usuarios", 500);
    }
  }),

  delete: protectedProcedure
    .input(userIdSchema)
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "ADMIN") {
        return forbidden("Sólo los administradores pueden eliminar usuarios");
      }

      try {
        const deleted = await ctx.db.user.delete({
          where: { id: input.id },
          select: { id: true },
        });
        return trpcSuccess(deleted, "Usuario eliminado correctamente");
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al eliminar usuario", 500);
      }
    }),

  updateName: protectedProcedure
    .input(userIdSchema.extend({ name: z.string().trim().min(2) }))
    .mutation(async ({ input, ctx }) => {
      if (!canManageUser(ctx.session.user, input.id)) {
        return forbidden("No puedes editar este usuario");
      }
      try {
        const user = await ctx.db.user.update({
          where: { id: input.id },
          data: { name: input.name },
          select: { name: true },
        });
        return trpcSuccess(user.name, "Nombre actualizado correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar el nombre",
          500,
        );
      }
    }),

  updateEmail: protectedProcedure
    .input(userIdSchema.extend({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      if (!canManageUser(ctx.session.user, input.id)) {
        return forbidden("No puedes editar este usuario");
      }
      try {
        const user = await ctx.db.user.update({
          where: { id: input.id },
          data: { email: input.email.toLowerCase() },
          select: { email: true },
        });
        return trpcSuccess(user.email, "Email actualizado correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar el email",
          500,
        );
      }
    }),

  updatePhone: protectedProcedure
    .input(userIdSchema.extend({ phone: z.string().trim().min(10) }))
    .mutation(async ({ input, ctx }) => {
      if (!canManageUser(ctx.session.user, input.id)) {
        return forbidden("No puedes editar este usuario");
      }
      try {
        const user = await ctx.db.user.update({
          where: { id: input.id },
          data: { phone: input.phone },
          select: { phone: true },
        });
        return trpcSuccess(user.phone, "Teléfono actualizado correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar el teléfono",
          500,
        );
      }
    }),

  updatePassword: protectedProcedure
    .input(userIdSchema.extend({ password: z.string().min(8) }))
    .mutation(async ({ input, ctx }) => {
      if (!canManageUser(ctx.session.user, input.id)) {
        return forbidden("No puedes editar este usuario");
      }
      try {
        await ctx.db.user.update({
          where: { id: input.id },
          data: { password: await hash(input.password) },
          select: { id: true },
        });
        return trpcSuccess(null, "Contraseña actualizada correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar la contraseña",
          500,
        );
      }
    }),

  updateImage: protectedProcedure
    .input(userIdSchema.extend({ image: z.string().url() }))
    .mutation(async ({ input, ctx }) => {
      if (!canManageUser(ctx.session.user, input.id)) {
        return forbidden("No puedes editar este usuario");
      }
      try {
        const user = await ctx.db.user.update({
          where: { id: input.id },
          data: { image: input.image },
          select: { image: true },
        });
        return trpcSuccess(user.image, "Imagen actualizada correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar la imagen",
          500,
        );
      }
    }),
});
