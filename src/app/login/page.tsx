"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { Calendar, Eye, EyeOff, Loader2 } from "lucide-react"
import Link from "next/link"
import { validateEmail, validatePassword, type ValidationError } from "../../utils/validation"
import { ValidationErrors, FieldValidation } from "../../components/ui/validation-errors"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [touched, setTouched] = useState({ email: false, password: false })
  const router = useRouter()

  // Real-time validation
  useEffect(() => {
    if (!touched.email && !touched.password) return

    const errors: ValidationError[] = []

    if (touched.email) {
      const emailValidation = validateEmail(email)
      errors.push(...emailValidation.errors)
    }

    if (touched.password) {
      const passwordValidation = validatePassword(password)
      errors.push(...passwordValidation.errors)
    }

    setValidationErrors(errors)
  }, [email, password, touched])

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }))
  }

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }))
  }

  const getLoginErrorCode = (errorMessage: string): string => {
    if (errorMessage.includes("Credenciales inválidas") || errorMessage.includes("credentials")) {
      return "INVALID_CREDENTIALS"
    }
    if (errorMessage.includes("usuario no encontrado") || errorMessage.includes("user not found")) {
      return "USER_NOT_FOUND"
    }
    if (errorMessage.includes("contraseña incorrecta") || errorMessage.includes("incorrect password")) {
      return "INCORRECT_PASSWORD"
    }
    if (errorMessage.includes("cuenta desactivada") || errorMessage.includes("account disabled")) {
      return "ACCOUNT_DISABLED"
    }
    if (errorMessage.includes("red") || errorMessage.includes("network")) {
      return "NETWORK_ERROR"
    }
    return "LOGIN_FAILED"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setValidationErrors([])

    // Mark all fields as touched for validation
    setTouched({ email: true, password: true })

    // Validate form
    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)
    const allErrors = [...emailValidation.errors, ...passwordValidation.errors]

    if (allErrors.length > 0) {
      setValidationErrors(allErrors)
      setIsLoading(false)
      return
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        const errorCode = getLoginErrorCode(result.error)
        setError(`Error: ${result.error} (Código: ${errorCode})`)
        
        // Add specific validation error for login failure
        setValidationErrors([{
          code: errorCode,
          field: "login",
          message: result.error
        }])
        return
      }

      // Clear validation errors on success
      setValidationErrors([])

      // Obtener la sesión para verificar el rol
      const session = await getSession()

      if (session?.user?.role === "DOCTOR") {
        router.push("/dashboard")
      } else {
        router.push("/patient/dashboard")
      }
    } catch (error) {
      const errorCode = "UNEXPECTED_ERROR"
      const errorMessage = "Error inesperado al iniciar sesión"
      setError(`${errorMessage} (Código: ${errorCode})`)
      
      setValidationErrors([{
        code: errorCode,
        field: "login",
        message: errorMessage
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError("")
    setValidationErrors([])
    
    try {
      await signIn("google", { callbackUrl: "/dashboard" })
    } catch (error) {
      const errorCode = "GOOGLE_SIGNIN_ERROR"
      const errorMessage = "Error al iniciar sesión con Google"
      setError(`${errorMessage} (Código: ${errorCode})`)
      
      setValidationErrors([{
        code: errorCode,
        field: "google",
        message: errorMessage
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = validationErrors.length === 0 && email.length > 0 && password.length > 0

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
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>Accede a tu cuenta para gestionar tu consulta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Validation Errors */}
          <ValidationErrors errors={validationErrors} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldValidation field="email" errors={validationErrors}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  required
                  disabled={isLoading}
                  className={
                    touched.email && validationErrors.some(e => e.field === "email")
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }
                />
              </div>
            </FieldValidation>

            <FieldValidation field="password" errors={validationErrors}>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={handlePasswordBlur}
                    required
                    disabled={isLoading}
                    className={
                      touched.password && validationErrors.some(e => e.field === "password")
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }
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
            </FieldValidation>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !isFormValid}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar Sesión
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">O continúa con</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </Button>

          <div className="text-center text-sm">
            <Link href="/register" className="text-blue-600 hover:underline">
              ¿No tienes cuenta? Regístrate aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
