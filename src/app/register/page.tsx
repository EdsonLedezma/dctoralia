"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Calendar, Eye, EyeOff, Loader2, UserCheck, Stethoscope } from "lucide-react"
import Link from "next/link"
import { useRegister } from "../../hooks/useRegister"
import { 
  validateRegistrationForm, 
  validateName, 
  validateEmail, 
  validatePassword, 
  validatePhone, 
  validateLicense, 
  validateSpecialty,
  type ValidationError 
} from "../../utils/validation"
import { ValidationErrors, FieldValidation, PasswordStrengthIndicator } from "../../components/ui/validation-errors"

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [activeTab, setActiveTab] = useState("doctor")
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    phone: false,
    specialty: false,
    license: false,
  })
  const router = useRouter()

  // Use tRPC registration hook
  const { register, isRegistering, registerError, isSuccess, resetRegister } = useRegister()

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

  // Real-time validation
  useEffect(() => {
    const currentData = activeTab === "doctor" ? doctorData : patientData
    const errors: ValidationError[] = []

    // Only validate touched fields
    if (touched.name) {
      const nameValidation = validateName(currentData.name)
      errors.push(...nameValidation.errors)
    }

    if (touched.email) {
      const emailValidation = validateEmail(currentData.email)
      errors.push(...emailValidation.errors)
    }

    if (touched.password) {
      const passwordValidation = validatePassword(currentData.password)
      errors.push(...passwordValidation.errors)
    }

    if (touched.phone) {
      const phoneValidation = validatePhone(currentData.phone)
      errors.push(...phoneValidation.errors)
    }

    // Doctor-specific validations
    if (activeTab === "doctor") {
      if (touched.specialty) {
        const specialtyValidation = validateSpecialty(doctorData.specialty)
        errors.push(...specialtyValidation.errors)
      }

      if (touched.license) {
        const licenseValidation = validateLicense(doctorData.license)
        errors.push(...licenseValidation.errors)
      }
    }

    setValidationErrors(errors)
  }, [doctorData, patientData, activeTab, touched])

  const handleFieldBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  // Handle success state
  useEffect(() => {
    if (isSuccess) {
      setSuccess("Cuenta creada exitosamente. Redirigiendo...")
      setValidationErrors([])
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    }
  }, [isSuccess, router])

  // Handle error state
  useEffect(() => {
    if (registerError) {
      const errorMessage = registerError.message ?? "Error al registrar usuario"
      setError(errorMessage)
      
      // Map tRPC errors to validation errors with codes
      const errorCode = getRegistrationErrorCode(errorMessage)
      setValidationErrors([{
        code: errorCode,
        field: "registration",
        message: errorMessage
      }])
    }
  }, [registerError])

  const getRegistrationErrorCode = (errorMessage: string): string => {
    if (errorMessage.includes("email") && errorMessage.includes("exists")) {
      return "EMAIL_ALREADY_EXISTS"
    }
    if (errorMessage.includes("license") && errorMessage.includes("exists")) {
      return "LICENSE_ALREADY_EXISTS"
    }
    if (errorMessage.includes("phone") && errorMessage.includes("exists")) {
      return "PHONE_ALREADY_EXISTS"
    }
    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return "NETWORK_ERROR"
    }
    if (errorMessage.includes("server") || errorMessage.includes("internal")) {
      return "SERVER_ERROR"
    }
    return "REGISTRATION_FAILED"
  }

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setValidationErrors([])
    resetRegister()

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      password: true,
      phone: true,
      specialty: true,
      license: true,
    })

    // Validate entire form
    const validation = validateRegistrationForm(doctorData)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    try {
      await register({
        name: doctorData.name,
        email: doctorData.email,
        password: doctorData.password,
        phone: doctorData.phone,
        role: doctorData.role,
        specialty: doctorData.specialty,
        license: doctorData.license,
      })
    } catch (error) {
      // Error is handled by useEffect above
    }
  }

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setValidationErrors([])
    resetRegister()

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      password: true,
      phone: true,
      specialty: false,
      license: false,
    })

    // Validate entire form
    const validation = validateRegistrationForm(patientData)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    try {
      await register({
        name: patientData.name,
        email: patientData.email,
        password: patientData.password,
        phone: patientData.phone,
        role: patientData.role,
      })
    } catch (error) {
      // Error is handled by useEffect above
    }
  }

  const isFormValid = (data: typeof doctorData | typeof patientData) => {
    const validation = validateRegistrationForm(data)
    return validation.isValid && data.name && data.email && data.password && data.phone
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

          {/* Validation Errors */}
          <ValidationErrors errors={validationErrors} className="mb-4" />

          <Tabs defaultValue="doctor" value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                <FieldValidation field="name" errors={validationErrors}>
                  <div className="space-y-2">
                    <Label htmlFor="doctor-name">Nombre Completo</Label>
                    <Input
                      id="doctor-name"
                      placeholder="Dr. Juan Pérez"
                      value={doctorData.name}
                      onChange={(e) => setDoctorData({ ...doctorData, name: e.target.value })}
                      onBlur={() => handleFieldBlur("name")}
                      required
                      disabled={isRegistering}
                      className={
                        touched.name && validationErrors.some(e => e.field === "name")
                          ? "border-red-500"
                          : ""
                      }
                    />
                  </div>
                </FieldValidation>

                <FieldValidation field="email" errors={validationErrors}>
                  <div className="space-y-2">
                    <Label htmlFor="doctor-email">Email</Label>
                    <Input
                      id="doctor-email"
                      type="email"
                      placeholder="doctor@ejemplo.com"
                      value={doctorData.email}
                      onChange={(e) => setDoctorData({ ...doctorData, email: e.target.value })}
                      onBlur={() => handleFieldBlur("email")}
                      required
                      disabled={isRegistering}
                      className={
                        touched.email && validationErrors.some(e => e.field === "email")
                          ? "border-red-500"
                          : ""
                      }
                    />
                  </div>
                </FieldValidation>

                <FieldValidation field="specialty" errors={validationErrors}>
                  <div className="space-y-2">
                    <Label htmlFor="doctor-specialty">Especialidad</Label>
                    <Select
                      onValueChange={(value) => {
                        setDoctorData({ ...doctorData, specialty: value })
                        handleFieldBlur("specialty")
                      }}
                      disabled={isRegistering}
                    >
                      <SelectTrigger className={
                        touched.specialty && validationErrors.some(e => e.field === "specialty")
                          ? "border-red-500"
                          : ""
                      }>
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
                </FieldValidation>

                <FieldValidation field="license" errors={validationErrors}>
                  <div className="space-y-2">
                    <Label htmlFor="doctor-license">Número de Cédula</Label>
                    <Input
                      id="doctor-license"
                      placeholder="123456789"
                      value={doctorData.license}
                      onChange={(e) => setDoctorData({ ...doctorData, license: e.target.value })}
                      onBlur={() => handleFieldBlur("license")}
                      required
                      disabled={isRegistering}
                      className={
                        touched.license && validationErrors.some(e => e.field === "license")
                          ? "border-red-500"
                          : ""
                      }
                    />
                  </div>
                </FieldValidation>

                <FieldValidation field="phone" errors={validationErrors}>
                  <div className="space-y-2">
                    <Label htmlFor="doctor-phone">Teléfono</Label>
                    <Input
                      id="doctor-phone"
                      placeholder="+1 234 567 8900"
                      value={doctorData.phone}
                      onChange={(e) => setDoctorData({ ...doctorData, phone: e.target.value })}
                      onBlur={() => handleFieldBlur("phone")}
                      required
                      disabled={isRegistering}
                      className={
                        touched.phone && validationErrors.some(e => e.field === "phone")
                          ? "border-red-500"
                          : ""
                      }
                    />
                  </div>
                </FieldValidation>

                <FieldValidation field="password" errors={validationErrors}>
                  <div className="space-y-2">
                    <Label htmlFor="doctor-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="doctor-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={doctorData.password}
                        onChange={(e) => setDoctorData({ ...doctorData, password: e.target.value })}
                        onBlur={() => handleFieldBlur("password")}
                        required
                        disabled={isRegistering}
                        className={
                          touched.password && validationErrors.some(e => e.field === "password")
                            ? "border-red-500"
                            : ""
                        }
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
                    {/* Password Strength Indicator */}
                    {doctorData.password && (
                      <PasswordStrengthIndicator password={doctorData.password} />
                    )}
                  </div>
                </FieldValidation>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isRegistering || !isFormValid(doctorData)}
                >
                  {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Cuenta de Doctor
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="patient">
              <form onSubmit={handlePatientSubmit} className="space-y-4">
                <FieldValidation field="name" errors={validationErrors}>
                  <div className="space-y-2">
                    <Label htmlFor="patient-name">Nombre Completo</Label>
                    <Input
                      id="patient-name"
                      placeholder="María García"
                      value={patientData.name}
                      onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
                      onBlur={() => handleFieldBlur("name")}
                      required
                      disabled={isRegistering}
                      className={
                        touched.name && validationErrors.some(e => e.field === "name")
                          ? "border-red-500"
                          : ""
                      }
                    />
                  </div>
                </FieldValidation>

                <FieldValidation field="email" errors={validationErrors}>
                  <div className="space-y-2">
                    <Label htmlFor="patient-email">Email</Label>
                    <Input
                      id="patient-email"
                      type="email"
                      placeholder="maria@ejemplo.com"
                      value={patientData.email}
                      onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
                      onBlur={() => handleFieldBlur("email")}
                      required
                      disabled={isRegistering}
                      className={
                        touched.email && validationErrors.some(e => e.field === "email")
                          ? "border-red-500"
                          : ""
                      }
                    />
                  </div>
                </FieldValidation>

                <FieldValidation field="phone" errors={validationErrors}>
                  <div className="space-y-2">
                    <Label htmlFor="patient-phone">Teléfono</Label>
                    <Input
                      id="patient-phone"
                      placeholder="+1 234 567 8900"
                      value={patientData.phone}
                      onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                      onBlur={() => handleFieldBlur("phone")}
                      required
                      disabled={isRegistering}
                      className={
                        touched.phone && validationErrors.some(e => e.field === "phone")
                          ? "border-red-500"
                          : ""
                      }
                    />
                  </div>
                </FieldValidation>

                <FieldValidation field="password" errors={validationErrors}>
                  <div className="space-y-2">
                    <Label htmlFor="patient-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="patient-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={patientData.password}
                        onChange={(e) => setPatientData({ ...patientData, password: e.target.value })}
                        onBlur={() => handleFieldBlur("password")}
                        required
                        disabled={isRegistering}
                        className={
                          touched.password && validationErrors.some(e => e.field === "password")
                            ? "border-red-500"
                            : ""
                        }
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
                    {/* Password Strength Indicator */}
                    {patientData.password && (
                      <PasswordStrengthIndicator password={patientData.password} />
                    )}
                  </div>
                </FieldValidation>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isRegistering || !isFormValid(patientData)}
                >
                  {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Cuenta de Paciente
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="text-center text-sm mt-4">
            <Link href="/login" className="text-blue-600 hover:underline">
              ¿Ya tienes cuenta? Inicia sesión aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
