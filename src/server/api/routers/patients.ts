import z from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"

export const usePatients = createTRPCRouter({
  // Obtener todos los pacientes con relaciones incluidas
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.patient.findMany({
      include: { user: true, appointments: true },
      orderBy: { createdAt: "desc" },
    })
  }),

  // Crear un paciente asociado a un usuario ya existente
  createPatient: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        phone: z.string().optional(),
        birthDate: z.coerce.date().optional(),
        gender: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const newPatient = await ctx.db.patient.create({
          data: {
            userId: input.userId,
            phone: input.phone ?? "",
            birthDate: input.birthDate,
            address: input.address ?? "",
            gender: input.gender ?? "",
          },
        })

        return {
          error: null,
          status: "200",
          message: "Paciente creado correctamente",
          data: newPatient,
        }
      } catch (err) {
        return {
          error: err,
          status: "500",
          message: "Error al crear el paciente",
          data: null,
        }
      }
    }),
})
