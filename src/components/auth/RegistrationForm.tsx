"use client"

import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Alert, AlertDescription } from "../ui/alert"
import { Badge } from "../ui/badge"
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react"
import { useRegister } from "../../hooks/useRegister"

interface RegistrationFormProps {
  role: "DOCTOR" | "PATIENT"
  onSuccess?: () => void
}

export default function RegistrationForm({ role, onSuccess }: RegistrationFormProps) {
  const { register, isRegistering, registerError, isSuccess, resetRegister } = useRegister()
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    specialty: "",
    license: "",
  })

  const [showPassword, setShowPassword] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  })

  // Handle success
  useEffect(() => {
    if (isSuccess) {
      onSuccess?.()
    }
  }, [isSuccess, onSuccess])

  // Validate password in real-time
  useEffect(() => {
    const { password } = formData
    setPasswordValidation({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[`~<>?,./!@#$%^&*()\\-_+="'|{}\\[\\];:\\\\]/.test(password),
    })
  }, [formData.password])

  const isPasswordValid = Object.values(passwordValidation).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetRegister()

    if (!isPasswordValid) {
      return
    }

    try {
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role,
        ...(role === "DOCTOR" && {
          specialty: formData.specialty,
          license: formData.license,
        }),
      }

      await register(registrationData)
    } catch (error) {
      // Error is handled by the hook
    }
  }

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          Registro de {role === "DOCTOR" ? "Doctor" : "Paciente"}
        </CardTitle>
        <CardDescription>
          Completa los datos para crear tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent>
        {registerError && (
          <Alert variant="destructive" className="mb-4">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{registerError.message}</AlertDescription>
          </Alert>
        )}

        {isSuccess && (
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>¡Cuenta creada exitosamente!</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic fields */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre Completo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData("name", e.target.value)}
              placeholder="Juan Pérez"
              required
              disabled={isRegistering}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData("email", e.target.value)}
              placeholder="ejemplo@correo.com"
              required
              disabled={isRegistering}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => updateFormData("phone", e.target.value)}
              placeholder="+1 234 567 8900"
              required
              disabled={isRegistering}
            />
          </div>

          {/* Doctor-specific fields */}
          {role === "DOCTOR" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidad</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => updateFormData("specialty", e.target.value)}
                  placeholder="Cardiología"
                  required
                  disabled={isRegistering}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="license">Número de Cédula</Label>
                <Input
                  id="license"
                  value={formData.license}
                  onChange={(e) => updateFormData("license", e.target.value)}
                  placeholder="123456789"
                  required
                  disabled={isRegistering}
                />
              </div>
            </>
          )}

          {/* Password field with validation */}
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => updateFormData("password", e.target.value)}
                placeholder="••••••••"
                required
                disabled={isRegistering}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isRegistering}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            {/* Password validation indicators */}
            {formData.password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center space-x-2">
                  <Badge variant={passwordValidation.length ? "default" : "secondary"}>
                    {passwordValidation.length ? "✓" : "✗"} Mínimo 8 caracteres
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={passwordValidation.uppercase ? "default" : "secondary"}>
                    {passwordValidation.uppercase ? "✓" : "✗"} Una mayúscula
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={passwordValidation.lowercase ? "default" : "secondary"}>
                    {passwordValidation.lowercase ? "✓" : "✗"} Una minúscula
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={passwordValidation.number ? "default" : "secondary"}>
                    {passwordValidation.number ? "✓" : "✗"} Un número
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={passwordValidation.special ? "default" : "secondary"}>
                    {passwordValidation.special ? "✓" : "✗"} Un carácter especial
                  </Badge>
                </div>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isRegistering || !isPasswordValid}
          >
            {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Cuenta
          </Button>
        </form>
      </CardContent>
    </Card>
  )
} 