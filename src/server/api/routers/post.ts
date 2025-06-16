import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  // Example procedure using existing User model
  getUserInfo: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return user ?? null;
  }),

  // Example procedure to get user's appointments
  getUserAppointments: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    // Get appointments for both doctors and patients
    if (ctx.session.user.role === "DOCTOR") {
      const doctor = await ctx.db.doctor.findUnique({
        where: { userId },
        include: {
          appointments: {
            include: {
              patient: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              service: true,
            },
            orderBy: { date: "desc" },
            take: 10,
          },
        },
      });

      return doctor?.appointments ?? [];
    } else {
      const patient = await ctx.db.patient.findUnique({
        where: { userId },
        include: {
          appointments: {
            include: {
              doctor: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              service: true,
            },
            orderBy: { date: "desc" },
            take: 10,
          },
        },
      });

      return patient?.appointments ?? [];
    }
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
