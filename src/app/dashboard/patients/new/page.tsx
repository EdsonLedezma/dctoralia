"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Calendar, ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import DashboardWrapper from "../../../../components/auth/DashboardWrapper"
import { api } from "src/trpc/react"

export default function NewPatientPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: "",
    gender: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    medicalHistory: "",
    allergies: "",
    currentMedications: "",
    insuranceProvider: "",
    insuranceNumber: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const createUser = api.users.create.useMutation();
  const createPatient = api.patients.create.useMutation();



  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // 1. Crear usuario tipo paciente
      const userRes = await createUser.mutateAsync({
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        password: formData.birthDate ? formData.birthDate.replaceAll('-', '') : "Paciente123*", // Puedes mejorar esto
        phone: formData.phone,
        role: "PATIENT",
      })
      if (!userRes.result?.id) throw new Error("No se pudo crear el usuario")

      // 2. Crear perfil de paciente
      await createPatient.mutateAsync({
        userId: userRes.result.id,
        phone: formData.phone,
        birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
        gender: formData.gender,
        address: formData.address,
        // Puedes agregar más campos si tu modelo de paciente lo permite
      })
      router.push("/dashboard/patients")
    } catch (err: any) {
      setError(err?.message || "Error al crear el paciente")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="px-6 py-4 flex items-center space-x-4">
            <Link href="/dashboard/patients">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">MediCare Pro</span>
            </div>
            <div className="text-gray-600">|</div>
            <h1 className="text-xl font-semibold">Nuevo Paciente</h1>
          </div>
        </header>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
            {/* Información Personal */}
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Datos básicos del paciente</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleInputChange("birthDate", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Género</Label>
                  <Select onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar género" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contacto de Emergencia */}
            <Card>
              <CardHeader>
                <CardTitle>Contacto de Emergencia</CardTitle>
                <CardDescription>Información de contacto en caso de emergencia</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Nombre del Contacto</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Teléfono de Emergencia</Label>
                  <Input
                    id="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={(e) => handleInputChange("emergencyPhone", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Información Médica */}
            <Card>
              <CardHeader>
                <CardTitle>Información Médica</CardTitle>
                <CardDescription>Historial y condiciones médicas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="medicalHistory">Historial Médico</Label>
                  <Textarea
                    id="medicalHistory"
                    placeholder="Describe el historial médico del paciente..."
                    value={formData.medicalHistory}
                    onChange={(e) => handleInputChange("medicalHistory", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allergies">Alergias</Label>
                  <Textarea
                    id="allergies"
                    placeholder="Lista las alergias conocidas..."
                    value={formData.allergies}
                    onChange={(e) => handleInputChange("allergies", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentMedications">Medicamentos Actuales</Label>
                  <Textarea
                    id="currentMedications"
                    placeholder="Lista los medicamentos que toma actualmente..."
                    value={formData.currentMedications}
                    onChange={(e) => handleInputChange("currentMedications", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Información del Seguro */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Seguro</CardTitle>
                <CardDescription>Datos del seguro médico</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insuranceProvider">Proveedor del Seguro</Label>
                  <Input
                    id="insuranceProvider"
                    value={formData.insuranceProvider}
                    onChange={(e) => handleInputChange("insuranceProvider", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insuranceNumber">Número de Póliza</Label>
                  <Input
                    id="insuranceNumber"
                    value={formData.insuranceNumber}
                    onChange={(e) => handleInputChange("insuranceNumber", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="flex space-x-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Guardando..." : "Guardar Paciente"}
              </Button>
              <Link href="/dashboard/patients">
                <Button type="button" variant="outline" className="flex-1" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
            </div>
            {error && (
              <p className="mt-4 text-red-600 text-center font-medium">{error}</p>
            )}
          </form>
        </div>
      </div>
    </DashboardWrapper>
  )
}
