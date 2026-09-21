import type { Prisma } from "@prisma/client";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { doctorOwnedServiceScope } from "~/server/domain/authorization/access-policy";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

const serviceIdSchema = z.object({ id: z.string().min(1) });

const createServiceSchema = z.object({
  doctorId: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(1_000),
  price: z.number().finite().nonnegative(),
  duration: z.number().int().min(5).max(480),
});

type Actor = {
  id: string;
  role: "DOCTOR" | "PATIENT" | "ADMIN";
};

function manageableServiceWhere(
  actor: Actor,
  id: string,
): Prisma.ServiceWhereInput | null {
  if (actor.role === "ADMIN") {
    return { id };
  }

  const ownershipScope = doctorOwnedServiceScope(actor);
  return ownershipScope ? { id, ...ownershipScope } : null;
}

export const useService = createTRPCRouter({
  publicGetByDoctor: publicProcedure
    .input(z.object({ doctorId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        const services = await ctx.db.service.findMany({
          where: { doctorId: input.doctorId, isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            duration: true,
            isActive: true,
          },
        });

        return trpcSuccess(services, "Servicios obtenidos correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible obtener los servicios",
          500,
        );
      }
    }),

  getMyServices: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "DOCTOR") {
      return trpcFailure(
        "FORBIDDEN",
        "Sólo los doctores pueden administrar servicios",
        403,
      );
    }

    try {
      const doctor = await ctx.db.doctor.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });

      if (!doctor) {
        return trpcFailure(
          "DOCTOR_PROFILE_NOT_FOUND",
          "No se encontró el perfil del doctor",
          404,
        );
      }

      const services = await ctx.db.service.findMany({
        where: { doctorId: doctor.id },
        orderBy: { name: "asc" },
      });

      return trpcSuccess(services, "Servicios obtenidos correctamente");
    } catch {
      return trpcFailure(
        "INTERNAL_ERROR",
        "No fue posible obtener los servicios",
        500,
      );
    }
  }),

  create: protectedProcedure
    .input(createServiceSchema)
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "DOCTOR") {
        return trpcFailure(
          "FORBIDDEN",
          "Sólo los doctores pueden crear servicios",
          403,
        );
      }

      try {
        const doctor = await ctx.db.doctor.findUnique({
          where: { userId: ctx.session.user.id },
          select: { id: true },
        });

        if (!doctor) {
          return trpcFailure(
            "DOCTOR_PROFILE_NOT_FOUND",
            "No se encontró el perfil del doctor",
            404,
          );
        }

        const service = await ctx.db.service.create({
          data: {
            doctorId: doctor.id,
            name: input.name,
            description: input.description,
            price: input.price,
            duration: input.duration,
          },
        });

        return trpcSuccess(service, "Servicio creado correctamente", 201);
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible crear el servicio",
          500,
        );
      }
    }),

  getById: protectedProcedure
    .input(serviceIdSchema)
    .query(async ({ input, ctx }) => {
      const where = manageableServiceWhere(ctx.session.user, input.id);
      if (!where) {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes acceso a este servicio",
          403,
        );
      }

      try {
        const service = await ctx.db.service.findFirst({ where });
        if (!service) {
          return trpcFailure(
            "SERVICE_NOT_FOUND",
            "Servicio no encontrado",
            404,
          );
        }

        return trpcSuccess(service, "Servicio encontrado");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible obtener el servicio",
          500,
        );
      }
    }),

  getByDoctor: protectedProcedure
    .input(z.object({ doctorId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        if (ctx.session.user.role === "PATIENT") {
          return trpcFailure(
            "FORBIDDEN",
            "No tienes acceso a la administración de servicios",
            403,
          );
        }

        const doctor =
          ctx.session.user.role === "ADMIN"
            ? await ctx.db.doctor.findUnique({
                where: { id: input.doctorId },
                select: { id: true },
              })
            : await ctx.db.doctor.findUnique({
                where: { userId: ctx.session.user.id },
                select: { id: true },
              });

        if (!doctor || doctor.id !== input.doctorId) {
          return trpcFailure(
            "FORBIDDEN",
            "No tienes acceso a los servicios de este doctor",
            403,
          );
        }

        const services = await ctx.db.service.findMany({
          where: { doctorId: doctor.id },
          orderBy: { name: "asc" },
        });

        return trpcSuccess(services, "Servicios obtenidos correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible obtener los servicios",
          500,
        );
      }
    }),

  update: protectedProcedure
    .input(
      serviceIdSchema.extend({
        name: z.string().trim().min(2).max(120),
        description: z.string().trim().min(2).max(1_000),
        price: z.number().finite().nonnegative(),
        duration: z.number().int().min(5).max(480),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const where = manageableServiceWhere(ctx.session.user, input.id);
      if (!where) {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes acceso a este servicio",
          403,
        );
      }

      try {
        const ownedService = await ctx.db.service.findFirst({
          where,
          select: { id: true },
        });
        if (!ownedService) {
          return trpcFailure(
            "SERVICE_NOT_FOUND",
            "Servicio no encontrado",
            404,
          );
        }

        const service = await ctx.db.service.update({
          where: { id: ownedService.id },
          data: {
            name: input.name,
            description: input.description,
            price: input.price,
            duration: input.duration,
          },
        });

        return trpcSuccess(service, "Servicio actualizado correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar el servicio",
          500,
        );
      }
    }),

  updateName: protectedProcedure
    .input(serviceIdSchema.extend({ name: z.string().trim().min(2).max(120) }))
    .mutation(async ({ input, ctx }) => {
      const where = manageableServiceWhere(ctx.session.user, input.id);
      if (!where) {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes acceso a este servicio",
          403,
        );
      }

      try {
        const ownedService = await ctx.db.service.findFirst({
          where,
          select: { id: true },
        });
        if (!ownedService) {
          return trpcFailure(
            "SERVICE_NOT_FOUND",
            "Servicio no encontrado",
            404,
          );
        }

        const service = await ctx.db.service.update({
          where: { id: ownedService.id },
          data: { name: input.name },
          select: { name: true },
        });
        return trpcSuccess(service.name, "Nombre actualizado correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar el nombre",
          500,
        );
      }
    }),

  updateDescription: protectedProcedure
    .input(
      serviceIdSchema.extend({
        description: z.string().trim().min(2).max(1_000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const where = manageableServiceWhere(ctx.session.user, input.id);
      if (!where) {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes acceso a este servicio",
          403,
        );
      }

      try {
        const ownedService = await ctx.db.service.findFirst({
          where,
          select: { id: true },
        });
        if (!ownedService) {
          return trpcFailure(
            "SERVICE_NOT_FOUND",
            "Servicio no encontrado",
            404,
          );
        }

        const service = await ctx.db.service.update({
          where: { id: ownedService.id },
          data: { description: input.description },
          select: { description: true },
        });
        return trpcSuccess(
          service.description,
          "Descripción actualizada correctamente",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar la descripción",
          500,
        );
      }
    }),

  updatePrice: protectedProcedure
    .input(serviceIdSchema.extend({ price: z.number().finite().nonnegative() }))
    .mutation(async ({ input, ctx }) => {
      const where = manageableServiceWhere(ctx.session.user, input.id);
      if (!where) {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes acceso a este servicio",
          403,
        );
      }

      try {
        const ownedService = await ctx.db.service.findFirst({
          where,
          select: { id: true },
        });
        if (!ownedService) {
          return trpcFailure(
            "SERVICE_NOT_FOUND",
            "Servicio no encontrado",
            404,
          );
        }

        const service = await ctx.db.service.update({
          where: { id: ownedService.id },
          data: { price: input.price },
          select: { price: true },
        });
        return trpcSuccess(service.price, "Precio actualizado correctamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar el precio",
          500,
        );
      }
    }),

  updateDuration: protectedProcedure
    .input(
      serviceIdSchema.extend({ duration: z.number().int().min(5).max(480) }),
    )
    .mutation(async ({ input, ctx }) => {
      const where = manageableServiceWhere(ctx.session.user, input.id);
      if (!where) {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes acceso a este servicio",
          403,
        );
      }

      try {
        const ownedService = await ctx.db.service.findFirst({
          where,
          select: { id: true },
        });
        if (!ownedService) {
          return trpcFailure(
            "SERVICE_NOT_FOUND",
            "Servicio no encontrado",
            404,
          );
        }

        const service = await ctx.db.service.update({
          where: { id: ownedService.id },
          data: { duration: input.duration },
          select: { duration: true },
        });
        return trpcSuccess(
          service.duration,
          "Duración actualizada correctamente",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar la duración",
          500,
        );
      }
    }),

  updateIsActive: protectedProcedure
    .input(serviceIdSchema.extend({ isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const where = manageableServiceWhere(ctx.session.user, input.id);
      if (!where) {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes acceso a este servicio",
          403,
        );
      }

      try {
        const ownedService = await ctx.db.service.findFirst({
          where,
          select: { id: true },
        });
        if (!ownedService) {
          return trpcFailure(
            "SERVICE_NOT_FOUND",
            "Servicio no encontrado",
            404,
          );
        }

        const service = await ctx.db.service.update({
          where: { id: ownedService.id },
          data: { isActive: input.isActive },
          select: { isActive: true },
        });
        return trpcSuccess(
          service.isActive,
          "Estado actualizado correctamente",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible actualizar el estado",
          500,
        );
      }
    }),

  delete: protectedProcedure
    .input(serviceIdSchema)
    .mutation(async ({ input, ctx }) => {
      const where = manageableServiceWhere(ctx.session.user, input.id);
      if (!where) {
        return trpcFailure(
          "FORBIDDEN",
          "No tienes acceso a este servicio",
          403,
        );
      }

      try {
        const ownedService = await ctx.db.service.findFirst({
          where,
          select: { id: true },
        });
        if (!ownedService) {
          return trpcFailure(
            "SERVICE_NOT_FOUND",
            "Servicio no encontrado",
            404,
          );
        }

        const service = await ctx.db.service.update({
          where: { id: ownedService.id },
          data: { isActive: false },
        });

        return trpcSuccess(
          service,
          "Servicio desactivado; se conservó su historial",
        );
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "No fue posible desactivar el servicio",
          500,
        );
      }
    }),
});
