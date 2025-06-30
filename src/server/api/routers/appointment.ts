// server/api/routers/appointment.ts
import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"
import { prisma } from "~/lib/prisma"

export const useAppointment = createTRPCRouter({
  // Obtener todas las citas con relaciones incluidas
  getAll: publicProcedure.query(async () => {
    return await prisma.appointment.findMany({
      include: { patient: true, doctor: true, service: true },
      orderBy: { date: "asc" },
    })
  }),

  // Crear una cita
  create: publicProcedure
    .input(
      z.object({
        patientId: z.string(),
        doctorId: z.string(),
        serviceId: z.string(),
        date: z.string(), 
        time: z.string().optional().default(""),
        duration: z.number().int().positive(),
        reason: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const newAppointment = await prisma.appointment.create({
        data: {
          patientId: input.patientId,
          doctorId: input.doctorId,
          serviceId: input.serviceId,
          date: new Date(input.date),
          time: input.time,
          duration: input.duration,
          reason: input.reason,
          notes: input.notes ?? "",
          status: "PENDING",
        },
      })
      return newAppointment
    }),
})
