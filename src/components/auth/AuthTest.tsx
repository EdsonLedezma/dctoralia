"use client"

import { useState } from "react"
import { useAuth } from "../../hooks/useAuth"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Alert, AlertDescription } from "../ui/alert"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { signOut } from "next-auth/react"

export default function AuthTest() {
  const {
    user,
    session,
    isAuthenticated,
    isLoading,
    signin,
    isSigningIn,
    signinError,
    resetSigninError,
  } = useAuth()

  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  })

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    resetSigninError()

    try {
      const result = await signin(credentials.email, credentials.password)
      setSuccess(`¡Inicio de sesión exitoso! Bienvenido ${result.user.name}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al iniciar sesión"
      setError(errorMessage)
    }
  }

  const handleSignout = async () => {
    await signOut({ redirect: false })
    setSuccess("")
    setError("")
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-6">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verificando sesión...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isAuthenticated) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Sesión Activa</span>
          </CardTitle>
          <CardDescription>¡Autenticación exitosa!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <p><strong>Nombre:</strong> {user?.name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Rol:</strong> {user?.role}</p>
            <p><strong>ID:</strong> {user?.id}</p>
          </div>
          
          <Button onClick={handleSignout} variant="outline" className="w-full">
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Prueba de Autenticación</CardTitle>
        <CardDescription>
          Prueba la integración tRPC + NextAuth
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(error || signinError) && (
          <Alert variant="destructive" className="mb-4">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {error || signinError?.message}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSignin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              placeholder="test@example.com"
              required
              disabled={isSigningIn}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              placeholder="••••••••"
              required
              disabled={isSigningIn}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSigningIn}>
            {isSigningIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Iniciar Sesión (tRPC + NextAuth)
          </Button>
        </form>
      </CardContent>
    </Card>
  )
} 