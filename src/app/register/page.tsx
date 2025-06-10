"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Calendar, Eye, EyeOff, Loader2, UserCheck, Stethoscope } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const [doctorData, setDoctorData] = useState({
    name: "",
    email: "",
    password: "",
    specialty: "",
    license: "",
    phone: "",
    role: "DOCTOR" as const,
  })

  const [patientData, setPatientData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "PATIENT" as const,
  })

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doctorData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al registrar")
      }

      setSuccess("Cuenta creada exitosamente. Redirigiendo...")
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al registrar")
      }

      setSuccess("Cuenta creada exitosamente. Redirigiendo...")
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">MediCare Pro</span>
          </div>
          <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
          <CardDescription>Regístrate como doctor o paciente</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="doctor" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="doctor" className="flex items-center space-x-2">
                <Stethoscope className="w-4 h-4" />
                <span>Doctor</span>
              </TabsTrigger>
              <TabsTrigger value="patient" className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4" />
                <span>Paciente</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="doctor">
              <form onSubmit={handleDoctorSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="doctor-name">Nombre Completo</Label>
                  <Input
                    id="doctor-name"
                    placeholder="Dr. Juan Pérez"
                    value={doctorData.name}
                    onChange={(e) => setDoctorData({ ...doctorData, name: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor-email">Email</Label>
                  <Input
                    id="doctor-email"
                    type="email"
                    placeholder="doctor@ejemplo.com"
                    value={doctorData.email}
                    onChange={(e) => setDoctorData({ ...doctorData, email: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor-specialty">Especialidad</Label>
                  <Select
                    onValueChange={(value) => setDoctorData({ ...doctorData, specialty: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu especialidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medicina-general">Medicina General</SelectItem>
                      <SelectItem value="cardiologia">Cardiología</SelectItem>
                      <SelectItem value="dermatologia">Dermatología</SelectItem>
                      <SelectItem value="pediatria">Pediatría</SelectItem>
                      <SelectItem value="ginecologia">Ginecología</SelectItem>
                      <SelectItem value="neurologia">Neurología</SelectItem>
                      <SelectItem value="traumatologia">Traumatología</SelectItem>
                      <SelectItem value="psiquiatria">Psiquiatría</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor-license">Número de Cédula</Label>
                  <Input
                    id="doctor-license"
                    placeholder="123456789"
                    value={doctorData.license}
                    onChange={(e) => setDoctorData({ ...doctorData, license: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor-phone">Teléfono</Label>
                  <Input
                    id="doctor-phone"
                    placeholder="+1 234 567 8900"
                    value={doctorData.phone}
                    onChange={(e) => setDoctorData({ ...doctorData, phone: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor-password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="doctor-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={doctorData.password}
                      onChange={(e) => setDoctorData({ ...doctorData, password: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Cuenta de Doctor
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="patient">
              <form onSubmit={handlePatientSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-name">Nombre Completo</Label>
                  <Input
                    id="patient-name"
                    placeholder="María González"
                    value={patientData.name}
                    onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient-email">Email</Label>
                  <Input
                    id="patient-email"
                    type="email"
                    placeholder="paciente@ejemplo.com"
                    value={patientData.email}
                    onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient-phone">Teléfono</Label>
                  <Input
                    id="patient-phone"
                    placeholder="+1 234 567 8900"
                    value={patientData.phone}
                    onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient-password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="patient-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={patientData.password}
                      onChange={(e) => setPatientData({ ...patientData, password: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Cuenta de Paciente
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-center text-sm">
            <Link href="/login" className="text-blue-600 hover:underline">
              ¿Ya tienes cuenta? Inicia sesión aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
