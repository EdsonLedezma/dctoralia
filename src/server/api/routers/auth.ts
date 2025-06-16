import { z } from "zod";
import { hash, verify } from "argon2";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

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

      // Verificar si el usuario ya existe
      const existingUser = await ctx.db.user.findFirst({
        where: {
          OR: [
            { email: email.toLowerCase() },
            role === "DOCTOR" ? { doctor: { license } } : {},
          ],
        },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "El usuario ya existe",
        });
      }

      // Hash de la contraseña
      const hashedPassword = await hash(password);

      try {
        // Crear usuario
        const user = await ctx.db.user.create({
          data: {
            email: email.toLowerCase(),
            name,
            password: hashedPassword,
            phone,
            role,
          },
        });

        // Si es doctor, crear perfil de doctor
        if (role === "DOCTOR" && specialty && license) {
          await ctx.db.doctor.create({
            data: {
              userId: user.id,
              specialty,
              license,
              phone,
            },
          });
        }

        // Si es paciente, crear perfil de paciente
        if (role === "PATIENT") {
          await ctx.db.patient.create({
            data: {
              userId: user.id,
              phone,
            },
          });
        }

        return {
          status: 201,
          message: "Usuario creado exitosamente",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al crear el usuario",
        });
      }
    }),

  signin: publicProcedure
    .input(signinSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, password } = input;

      try {
        // Buscar usuario por email
        const user = await ctx.db.user.findUnique({
          where: {
            email: email.toLowerCase(),
          },
          include: {
            doctor: true,
            patient: true,
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Credenciales inválidas",
          });
        }

        // Verificar contraseña
        const isValidPassword = await verify(user.password, password);

        if (!isValidPassword) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Credenciales inválidas",
          });
        }

        // Retornar información del usuario sin la contraseña
        const { password: _, ...userWithoutPassword } = user;

        return {
          status: 200,
          message: "Inicio de sesión exitoso",
          user: userWithoutPassword,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al iniciar sesión",
        });
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario no encontrado",
        });
      }

      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener el perfil",
      });
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

        return {
          exists: !!user,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al verificar el usuario",
        });
      }
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        phone: z.string().min(10).optional(),
        image: z.string().url().optional(),
        specialty: z.string().optional(),
        about: z.string().optional(),
        experience: z.number().min(0).optional(),
        birthDate: z.date().optional(),
        gender: z.string().optional(),
        address: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { specialty, about, experience, birthDate, gender, address, ...userFields } = input;

      try {
        // Update user basic info
        const updatedUser = await ctx.db.user.update({
          where: { id: userId },
          data: userFields,
          include: {
            doctor: true,
            patient: true,
          },
        });

        // Update doctor specific fields if user is a doctor
        if (updatedUser.role === "DOCTOR" && updatedUser.doctor) {
          await ctx.db.doctor.update({
            where: { userId },
            data: {
              ...(specialty && { specialty }),
              ...(about && { about }),
              ...(experience !== undefined && { experience }),
            },
          });
        }

        // Update patient specific fields if user is a patient
        if (updatedUser.role === "PATIENT" && updatedUser.patient) {
          await ctx.db.patient.update({
            where: { userId },
            data: {
              ...(birthDate && { birthDate }),
              ...(gender && { gender }),
              ...(address && { address }),
            },
          });
        }

        return {
          status: 200,
          message: "Perfil actualizado exitosamente",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al actualizar el perfil",
        });
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Usuario no encontrado",
          });
        }

        // Verify current password
        const isValidPassword = await verify(user.password, currentPassword);

        if (!isValidPassword) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "La contraseña actual es incorrecta",
          });
        }

        // Hash new password
        const hashedNewPassword = await hash(newPassword);

        // Update password
        await ctx.db.user.update({
          where: { id: userId },
          data: { password: hashedNewPassword },
        });

        return {
          status: 200,
          message: "Contraseña actualizada exitosamente",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al cambiar la contraseña",
        });
      }
    }),
});
