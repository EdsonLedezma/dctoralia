
import z from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";




export const useUsers = createTRPCRouter({
    create: publicProcedure
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
            try {
                const newUser = await ctx.db.user.create({
                    data: {
                        name: input.name,
                        email: input.email,
                        password: input.password,
                        phone: input.phone ?? "",
                        role: input.role,
                    },
                });

                return {
                    error: null,
                    status: "200",
                    message: "Usuario creado correctamente",
                    data: newUser,
                };
            } catch (err) {
                return {
                    error: err,
                    status: "500",
                    message: "Error al crear el usuario",
                    data: null,
                };
            }
        }),

})