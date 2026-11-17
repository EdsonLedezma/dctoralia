import { Prisma } from "@prisma/client";
import { hash } from "argon2";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  resolveOperationalActor,
  selectedDoctorCookie,
} from "~/server/domain/workspaces/operational-actor";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

export const agendaAdministratorRouter = createTRPCRouter({
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const workspace = await ctx.getWorkspace();
    if (
      !workspace ||
      workspace.membershipRole === "RECEPTIONIST" ||
      ctx.session.user.role !== "DOCTOR"
    )
      return trpcFailure(
        "FORBIDDEN",
        "Solo el médico puede administrar su equipo de agenda.",
        403,
      );
    try {
      const doctor = await ctx.db.doctor.findFirst({
        where: { userId: ctx.session.user.id, clinicId: workspace.clinicId },
        select: { id: true },
      });
      if (!doctor)
        return trpcFailure(
          "DOCTOR_REQUIRED",
          "Selecciona tu consultorio.",
          403,
        );
      const [settings, administrators] = await Promise.all([
        ctx.db.doctorBookingSettings.findUnique({
          where: { doctorId: doctor.id },
          select: { agendaAdminEnabled: true },
        }),
        ctx.db.agendaAdministrator.findMany({
          where: { doctorId: doctor.id, clinicId: workspace.clinicId },
          select: {
            id: true,
            active: true,
            user: { select: { id: true, name: true, username: true } },
          },
          orderBy: { createdAt: "asc" },
        }),
      ]);
      return trpcSuccess(
        { enabled: settings?.agendaAdminEnabled ?? false, administrators },
        "Administradores de agenda recuperados.",
      );
    } catch {
      return trpcFailure(
        "ADMINISTRATOR_UNAVAILABLE",
        "No se pudo cargar la configuración de recepción.",
        503,
      );
    }
  }),
  configure: protectedProcedure
    .input(z.object({ enabled: z.boolean() }).strict())
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.getWorkspace();
      if (
        !workspace ||
        workspace.membershipRole === "RECEPTIONIST" ||
        ctx.session.user.role !== "DOCTOR"
      )
        return trpcFailure(
          "FORBIDDEN",
          "Solo el médico puede habilitar recepción.",
          403,
        );
      try {
        const doctor = await ctx.db.doctor.findFirst({
          where: { userId: ctx.session.user.id, clinicId: workspace.clinicId },
          select: { id: true },
        });
        if (!doctor)
          return trpcFailure(
            "DOCTOR_REQUIRED",
            "Selecciona tu consultorio.",
            403,
          );
        const settings = await ctx.db.doctorBookingSettings.upsert({
          where: { doctorId: doctor.id },
          update: { agendaAdminEnabled: input.enabled },
          create: {
            doctorId: doctor.id,
            clinicId: workspace.clinicId,
            agendaAdminEnabled: input.enabled,
          },
          select: { agendaAdminEnabled: true },
        });
        return trpcSuccess(
          { enabled: settings.agendaAdminEnabled },
          input.enabled
            ? "Recepción habilitada."
            : "Acceso de recepción desactivado.",
        );
      } catch {
        return trpcFailure(
          "ADMINISTRATOR_UNAVAILABLE",
          "No se pudo guardar la configuración.",
          503,
        );
      }
    }),
  create: protectedProcedure
    .input(
      z
        .object({
          name: z.string().trim().min(2).max(100),
          username: z
            .string()
            .trim()
            .toLowerCase()
            .regex(/^[a-z0-9._-]{3,40}$/),
          password: z.string().min(12).max(128),
        })
        .strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.getWorkspace();
      if (
        !workspace ||
        workspace.membershipRole === "RECEPTIONIST" ||
        ctx.session.user.role !== "DOCTOR"
      )
        return trpcFailure(
          "FORBIDDEN",
          "Solo el médico puede crear accesos de recepción.",
          403,
        );
      try {
        const doctor = await ctx.db.doctor.findFirst({
          where: {
            userId: ctx.session.user.id,
            clinicId: workspace.clinicId,
            bookingSettings: { agendaAdminEnabled: true },
          },
          select: { id: true },
        });
        if (!doctor)
          return trpcFailure(
            "ADMINISTRATOR_DISABLED",
            "Primero habilita el administrador de agenda.",
            403,
          );
        const password = await hash(input.password);
        const created = await ctx.db.$transaction(
          async (tx) => {
            const activeCount = await tx.agendaAdministrator.count({
              where: { doctorId: doctor.id, active: true },
            });
            if (activeCount >= 1) return null;
            const user = await tx.user.create({
              data: {
                name: input.name,
                username: input.username,
                email: null,
                password,
                role: "DOCTOR",
                isGuest: false,
              },
              select: { id: true, name: true, username: true },
            });
            await tx.clinicMember.create({
              data: {
                clinicId: workspace.clinicId,
                userId: user.id,
                role: "RECEPTIONIST",
              },
            });
            const administrator = await tx.agendaAdministrator.create({
              data: {
                doctorId: doctor.id,
                clinicId: workspace.clinicId,
                userId: user.id,
              },
              select: { id: true },
            });
            return { ...administrator, user };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        if (!created)
          return trpcFailure(
            "ADMINISTRATOR_LIMIT",
            "Desactiva el acceso actual antes de crear otro.",
            409,
          );
        return trpcSuccess(
          created,
          "Acceso personal de recepción creado.",
          201,
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
          return trpcFailure(
            "USERNAME_TAKEN",
            "Ese usuario ya existe. Elige otro.",
            409,
          );
        return trpcFailure(
          "ADMINISTRATOR_UNAVAILABLE",
          "No se pudo crear el acceso. Actualiza antes de reintentar.",
          409,
        );
      }
    }),
  disable: protectedProcedure
    .input(z.object({ id: z.string().cuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.getWorkspace();
      if (
        !workspace ||
        workspace.membershipRole === "RECEPTIONIST" ||
        ctx.session.user.role !== "DOCTOR"
      )
        return trpcFailure(
          "FORBIDDEN",
          "Solo el médico puede desactivar este acceso.",
          403,
        );
      try {
        const changed = await ctx.db.agendaAdministrator.updateMany({
          where: {
            id: input.id,
            clinicId: workspace.clinicId,
            doctor: { userId: ctx.session.user.id },
          },
          data: { active: false },
        });
        if (!changed.count)
          return trpcFailure("NOT_FOUND", "Acceso no encontrado.", 404);
        return trpcSuccess(
          { id: input.id },
          "Acceso de recepción desactivado.",
        );
      } catch {
        return trpcFailure(
          "ADMINISTRATOR_UNAVAILABLE",
          "No se pudo desactivar el acceso.",
          503,
        );
      }
    }),
  operatingDoctors: protectedProcedure.query(async ({ ctx }) => {
    try {
      const workspace = await ctx.getWorkspace();
      if (!workspace || ctx.session.user.role !== "DOCTOR")
        return trpcFailure(
          "WORKSPACE_REQUIRED",
          "Selecciona tu consultorio.",
          403,
        );
      if (workspace.membershipRole !== "RECEPTIONIST")
        return trpcSuccess(
          { isReceptionist: false, selectedDoctorId: null, doctors: [] },
          "Cuenta médica.",
        );
      const doctors = await ctx.db.agendaAdministrator.findMany({
        where: {
          userId: ctx.session.user.id,
          clinicId: workspace.clinicId,
          active: true,
          doctor: {
            clinicId: workspace.clinicId,
            bookingSettings: { agendaAdminEnabled: true },
          },
        },
        select: {
          doctor: { select: { id: true, user: { select: { name: true } } } },
        },
      });
      const actor = await resolveOperationalActor(
        ctx.db,
        { id: ctx.session.user.id, role: ctx.session.user.role },
        workspace,
        selectedDoctorCookie(ctx.headers),
      );
      return trpcSuccess(
        {
          isReceptionist: true,
          selectedDoctorId: actor.operationalDoctorId ?? null,
          doctors: doctors.map((item) => ({
            id: item.doctor.id,
            name: item.doctor.user.name,
          })),
        },
        "Agendas autorizadas.",
      );
    } catch {
      return trpcFailure(
        "ADMINISTRATOR_UNAVAILABLE",
        "No se pudo consultar las agendas autorizadas.",
        503,
      );
    }
  }),
  selectDoctor: protectedProcedure
    .input(z.object({ doctorId: z.string().cuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await ctx.getWorkspace();
        if (
          !workspace ||
          ctx.session.user.role !== "DOCTOR" ||
          workspace.membershipRole !== "RECEPTIONIST"
        )
          return trpcFailure(
            "FORBIDDEN",
            "No puedes seleccionar esta agenda.",
            403,
          );
        const actor = await resolveOperationalActor(
          ctx.db,
          { id: ctx.session.user.id, role: ctx.session.user.role },
          workspace,
          input.doctorId,
        );
        if (actor.operationalDoctorId !== input.doctorId)
          return trpcFailure(
            "FORBIDDEN",
            "No tienes acceso a esa agenda.",
            403,
          );
        ctx.responseHeaders?.append(
          "set-cookie",
          `dopilot-doctor=${encodeURIComponent(input.doctorId)}; Path=/; Max-Age=${60 * 60 * 8}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
        );
        return trpcSuccess(
          { doctorId: input.doctorId },
          "Agenda seleccionada.",
        );
      } catch {
        return trpcFailure(
          "ADMINISTRATOR_UNAVAILABLE",
          "No se pudo cambiar de agenda.",
          503,
        );
      }
    }),
});
