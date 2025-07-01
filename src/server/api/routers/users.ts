import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { hash } from "argon2";

export const useUsers = createTRPCRouter({
    // Crear usuario (solo admin)
    create: protectedProcedure
        .input(
            z.object({
            name: z.string(),
            email: z.string(),
            password: z.string(),
            phone: z.string().optional(),
            role: z.enum(["ADMIN", "DOCTOR", "PATIENT"]).optional().default("PATIENT"),
            })
        )
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.role !== "ADMIN") {
                return {
                    status: 403,
                    message: "Solo los administradores pueden crear usuarios",
                    result: null,
                    error: new Error("No autorizado"),
                };
            }
            try {
                const hashedPassword = await hash(input.password);
                const newUser = await ctx.db.user.create({
                    data: {
                        name: input.name,
                        email: input.email,
                        password: hashedPassword,
                        phone: input.phone ?? "",
                        role: input.role,
                    },
                });
                return {
                    status: 201,
                    message: "Usuario creado correctamente",
                    result: newUser,
                    error: null,
                };
            } catch (err) {
                return {
                    status: 500,
                    message: "Error al crear el usuario",
                    result: null,
                    error: err,
                };
            }
        }),

    // Obtener usuario por ID
    getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
        try {
            const user = await ctx.db.user.findUnique({ where: { id: input.id } });
            if (!user) {
                return {
                    status: 404,
                    message: "Usuario no encontrado",
                    result: null,
                    error: new Error("Usuario no encontrado"),
                };
            }
            return {
                status: 200,
                message: "Usuario encontrado",
                result: user,
                error: null,
            };
        } catch (error) {
            return {
                status: 500,
                message: "Error al buscar usuario",
                result: null,
                error,
            };
        }
    }),

    // Obtener todos los usuarios (solo admin)
    getAll: protectedProcedure.query(async ({ ctx }) => {
        if (ctx.session.user.role !== "ADMIN") {
            return {
                status: 403,
                message: "Solo los administradores pueden ver todos los usuarios",
                result: null,
                error: new Error("No autorizado"),
            };
        }
        try {
            const users = await ctx.db.user.findMany();
            return {
                status: 200,
                message: "Usuarios obtenidos correctamente",
                result: users,
                error: null,
            };
        } catch (error) {
            return {
                status: 500,
                message: "Error al obtener usuarios",
                result: null,
                error,
            };
        }
    }),

    // Eliminar usuario (solo admin)
    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
        if (ctx.session.user.role !== "ADMIN") {
            return {
                status: 403,
                message: "Solo los administradores pueden eliminar usuarios",
                result: null,
                error: new Error("No autorizado"),
            };
        }
        try {
            const deleted = await ctx.db.user.delete({ where: { id: input.id } });
            return {
                status: 200,
                message: "Usuario eliminado correctamente",
                result: deleted,
                error: null,
            };
        } catch (error) {
            return {
                status: 500,
                message: "Error al eliminar usuario",
                result: null,
                error,
            };
        }
    }),

    // Actualizar nombre
    updateName: protectedProcedure.input(z.object({ id: z.string(), name: z.string() })).mutation(async ({ input, ctx }) => {
        try {
            const user = await ctx.db.user.update({ where: { id: input.id }, data: { name: input.name } });
            return {
                status: 200,
                message: "Nombre actualizado correctamente",
                result: user.name,
                error: null,
            };
        } catch (error) {
            return {
                status: 500,
                message: "Error al actualizar el nombre",
                result: null,
                error,
            };
        }
    }),

    // Actualizar email
    updateEmail: protectedProcedure.input(z.object({ id: z.string(), email: z.string() })).mutation(async ({ input, ctx }) => {
        try {
            const user = await ctx.db.user.update({ where: { id: input.id }, data: { email: input.email } });
            return {
                status: 200,
                message: "Email actualizado correctamente",
                result: user.email,
                error: null,
            };
        } catch (error) {
            return {
                status: 500,
                message: "Error al actualizar el email",
                result: null,
                error,
            };
        }
    }),

    // Actualizar teléfono
    updatePhone: protectedProcedure.input(z.object({ id: z.string(), phone: z.string() })).mutation(async ({ input, ctx }) => {
        try {
            const user = await ctx.db.user.update({ where: { id: input.id }, data: { phone: input.phone } });
            return {
                status: 200,
                message: "Teléfono actualizado correctamente",
                result: user.phone,
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

    // Actualizar password
    updatePassword: protectedProcedure.input(z.object({ id: z.string(), password: z.string() })).mutation(async ({ input, ctx }) => {
        try {
            const hashedPassword = await hash(input.password);
            const user = await ctx.db.user.update({ where: { id: input.id }, data: { password: hashedPassword } });
            return {
                status: 200,
                message: "Contraseña actualizada correctamente",
                result: null,
                error: null,
            };
        } catch (error) {
            return {
                status: 500,
                message: "Error al actualizar la contraseña",
                result: null,
                error,
            };
        }
    }),

    // Actualizar imagen
    updateImage: protectedProcedure.input(z.object({ id: z.string(), image: z.string() })).mutation(async ({ input, ctx }) => {
        try {
            const user = await ctx.db.user.update({ where: { id: input.id }, data: { image: input.image } });
            return {
                status: 200,
                message: "Imagen actualizada correctamente",
                result: user.image,
                error: null,
            };
        } catch (error) {
            return {
                status: 500,
                message: "Error al actualizar la imagen",
                result: null,
                error,
            };
        }
    }),
});