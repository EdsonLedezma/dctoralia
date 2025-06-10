import { z } from "zod";
import { hash } from "argon2";
import { createTRPCRouter, publicProcedure } from "../trpc";
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
});
