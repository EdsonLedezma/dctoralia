import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "~/lib/prisma"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  specialty: z.string().optional(),
  license: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(["DOCTOR", "PATIENT"]).default("PATIENT"),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, specialty, license, phone, role } = registerSchema.parse(body)

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "El usuario ya existe" }, { status: 400 })
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear el usuario
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    })

    // Si es doctor, crear el perfil de doctor
    if (role === "DOCTOR") {
      await prisma.doctor.create({
        data: {
          userId: user.id,
          specialty: specialty || "",
          license: license || "",
          phone: phone || "",
        },
      })
    }

    // Si es paciente, crear el perfil de paciente
    if (role === "PATIENT") {
      await prisma.patient.create({
        data: {
          userId: user.id,
          phone: phone || "",
        },
      })
    }

    return NextResponse.json({ message: "Usuario creado exitosamente", userId: user.id }, { status: 201 })
  } catch (error) {
    console.error("Error en registro:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
