import { z } from "zod";
import { hash, verify } from "argon2";
import { Prisma } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { trpcFailure, trpcSuccess } from "~/types/trpc-response";

const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(new RegExp(".*[A-Z].*"), "Debe contener una mayúscula")
    .regex(new RegExp(".*[a-z].*"), "Debe contener una minúscula")
    .regex(new RegExp(".*\\d.*"), "Debe contener un número")
    .regex(
      new RegExp(".*[`~<>?,./!@#$%^&*()\\-_+=\"'|{}\\[\\];:\\\\].*"),
      "Debe contener un carácter especial",
    ),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 caracteres"),
  role: z.enum(["DOCTOR", "PATIENT"]),
  specialty: z.string().optional(),
  license: z.string().optional(),
});

const signinSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, password, role, name, phone, specialty, license } = input;

      if (role === "DOCTOR" && (!specialty?.trim() || !license?.trim())) {
        return trpcFailure(
          "DOCTOR_FIELDS_REQUIRED",
          "Especialidad y cédula son obligatorias",
          400,
        );
      }
      try {
        const existingUser = await ctx.db.user.findFirst({
          where: {
            OR: [
              { email: email.trim().toLowerCase() },
              ...(role === "DOCTOR" && license
                ? [{ doctor: { license: license.trim() } }]
                : []),
            ],
          },
        });

        if (existingUser) {
          return trpcFailure(
            "USER_ALREADY_EXISTS",
            "El usuario ya existe",
            409,
          );
        }

        // Hash de la contraseña
        const hashedPassword = await hash(password);

        // Crear usuario
        const user = await ctx.db.user.create({
          data: {
            email: email.trim().toLowerCase(),
            name,
            password: hashedPassword,
            phone,
            role,
            ...(role === "DOCTOR" && specialty && license
              ? {
                  doctor: {
                    create: {
                      specialty: specialty.trim(),
                      license: license.trim(),
                      phone,
                    },
                  },
                }
              : { patient: { create: { phone } } }),
          },
          select: { id: true },
        });

        return trpcSuccess(
          { userId: user.id },
          "Usuario creado exitosamente",
          201,
        );
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return trpcFailure(
            "USER_ALREADY_EXISTS",
            "El correo o la cédula ya están registrados",
            409,
          );
        }
        return trpcFailure("INTERNAL_ERROR", "Error al crear el usuario", 500);
      }
    }),

  signin: publicProcedure
    .input(signinSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, password } = input;

      try {
        const user = await ctx.db.user.findUnique({
          where: {
            email: email.toLowerCase(),
          },
          include: {
            doctor: true,
            patient: true,
          },
        });

        if (!user)
          return trpcFailure(
            "INVALID_CREDENTIALS",
            "Credenciales inválidas",
            401,
          );

        // Verificar contraseña
        let isValidPassword = false;
        try {
          isValidPassword = await verify(user.password, password);
        } catch {
          isValidPassword = false;
        }

        if (!isValidPassword) {
          return trpcFailure(
            "INVALID_CREDENTIALS",
            "Credenciales inválidas",
            401,
          );
        }

        // Retornar información del usuario sin la contraseña
        const { password: _, ...userWithoutPassword } = user;

        return trpcSuccess(
          { user: userWithoutPassword },
          "Inicio de sesión exitoso",
        );
      } catch {
        return trpcFailure("INTERNAL_ERROR", "Error al iniciar sesión", 500);
      }
    }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    try {
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: {
          doctor: {
            include: {
              services: true,
              schedules: true,
              reviews: {
                include: {
                  patient: {
                    include: {
                      user: {
                        select: {
                          name: true,
                          image: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          patient: true,
        },
      });

      if (!user) {
        return trpcFailure("USER_NOT_FOUND", "Usuario no encontrado", 404);
      }

      const { password: _, ...userWithoutPassword } = user;
      return trpcSuccess(
        userWithoutPassword,
        "Perfil recuperado correctamente",
      );
    } catch {
      return trpcFailure("INTERNAL_ERROR", "Error al obtener el perfil", 500);
    }
  }),

  checkUserExists: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      try {
        const user = await ctx.db.user.findUnique({
          where: { email: input.email.toLowerCase() },
          select: { id: true, email: true },
        });

        return trpcSuccess({ exists: !!user }, "Usuario verificado");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al verificar el usuario",
          500,
        );
      }
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        phone: z.string().min(10).optional(),
        image: z.string().url().nullable().optional(),
        specialty: z.string().optional(),
        about: z.string().optional(),
        experience: z.number().min(0).optional(),
        birthDate: z.date().nullable().optional(),
        gender: z.string().nullable().optional(),
        address: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const {
        specialty,
        about,
        experience,
        birthDate,
        gender,
        address,
        ...userFields
      } = input;

      if (typeof userFields.email === "string") {
        userFields.email = userFields.email.toLowerCase().trim();
      }

      try {
        await ctx.db.$transaction(async (tx) => {
          // Update user basic info
          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: userFields,
            include: {
              doctor: true,
              patient: true,
            },
          });

          // Update doctor specific fields if user is a doctor
          if (updatedUser.role === "DOCTOR" && updatedUser.doctor) {
            await tx.doctor.update({
              where: { userId },
              data: {
                ...(specialty && { specialty }),
                ...(about !== undefined && { about }),
                ...(userFields.phone !== undefined && {
                  phone: userFields.phone,
                }),
                ...(experience !== undefined && { experience }),
              },
            });
          }

          // Update patient specific fields if user is a patient
          if (updatedUser.role === "PATIENT" && updatedUser.patient) {
            await tx.patient.update({
              where: { userId },
              data: {
                ...(birthDate !== undefined && { birthDate }),
                ...(gender !== undefined && { gender: gender || null }),
                ...(address !== undefined && { address }),
                ...(userFields.phone !== undefined && {
                  phone: userFields.phone,
                }),
              },
            });
          }
        });

        return trpcSuccess(null, "Perfil actualizado exitosamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al actualizar el perfil",
          500,
        );
      }
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "La contraseña actual es requerida"),
        newPassword: z
          .string()
          .min(8, "La contraseña debe tener al menos 8 caracteres")
          .regex(new RegExp(".*[A-Z].*"), "Debe contener una mayúscula")
          .regex(new RegExp(".*[a-z].*"), "Debe contener una minúscula")
          .regex(new RegExp(".*\\d.*"), "Debe contener un número")
          .regex(
            new RegExp(".*[`~<>?,./!@#$%^&*()\\-_+=\"'|{}\\[\\];:\\\\].*"),
            "Debe contener un carácter especial",
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { currentPassword, newPassword } = input;

      try {
        // Get current user with password
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
          select: { password: true },
        });

        if (!user) {
          return trpcFailure("USER_NOT_FOUND", "Usuario no encontrado", 404);
        }

        // Verify current password
        const isValidPassword = await verify(user.password, currentPassword);

        if (!isValidPassword) {
          return trpcFailure(
            "INVALID_CURRENT_PASSWORD",
            "La contraseña actual es incorrecta",
            401,
          );
        }

        // Hash new password
        const hashedNewPassword = await hash(newPassword);

        // Update password
        await ctx.db.user.update({
          where: { id: userId },
          data: { password: hashedNewPassword },
        });

        return trpcSuccess(null, "Contraseña actualizada exitosamente");
      } catch {
        return trpcFailure(
          "INTERNAL_ERROR",
          "Error al cambiar la contraseña",
          500,
        );
      }
    }),
});
