"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Calendar, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  validateEmail,
  validatePassword,
  type ValidationError,
} from "../../utils/validation";
import {
  ValidationErrors,
  FieldValidation,
} from "../../components/ui/validation-errors";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const [touched, setTouched] = useState({ email: false, password: false });
  const router = useRouter();

  // Real-time validation
  useEffect(() => {
    if (!touched.email && !touched.password) return;

    const errors: ValidationError[] = [];

    if (touched.email) {
      const emailValidation = validateEmail(email);
      errors.push(...emailValidation.errors);
    }

    if (touched.password) {
      const passwordValidation = validatePassword(password);
      errors.push(...passwordValidation.errors);
    }

    setValidationErrors(errors);
  }, [email, password, touched]);

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
  };

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
  };

  const getLoginErrorCode = (errorMessage: string): string => {
    if (
      errorMessage.includes("Credenciales inválidas") ||
      errorMessage.includes("credentials")
    ) {
      return "INVALID_CREDENTIALS";
    }
    if (
      errorMessage.includes("usuario no encontrado") ||
      errorMessage.includes("user not found")
    ) {
      return "USER_NOT_FOUND";
    }
    if (
      errorMessage.includes("contraseña incorrecta") ||
      errorMessage.includes("incorrect password")
    ) {
      return "INCORRECT_PASSWORD";
    }
    if (
      errorMessage.includes("cuenta desactivada") ||
      errorMessage.includes("account disabled")
    ) {
      return "ACCOUNT_DISABLED";
    }
    if (errorMessage.includes("red") || errorMessage.includes("network")) {
      return "NETWORK_ERROR";
    }
    return "LOGIN_FAILED";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setValidationErrors([]);

    // Mark all fields as touched for validation
    setTouched({ email: true, password: true });

    // Validate form
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    const allErrors = [...emailValidation.errors, ...passwordValidation.errors];

    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        const errorCode = getLoginErrorCode(result.error);
        setError(`Error: ${result.error} (Código: ${errorCode})`);

        // Add specific validation error for login failure
        setValidationErrors([
          {
            code: errorCode,
            field: "login",
            message: result.error,
          },
        ]);
        return;
      }

      // Clear validation errors on success
      setValidationErrors([]);

      // Obtener la sesión para verificar el rol
      const session = await getSession();

      if (session?.user?.role === "DOCTOR") {
        router.push("/dashboard");
      } else {
        router.push("/patient/dashboard");
      }
    } catch (error) {
      const errorCode = "UNEXPECTED_ERROR";
      const errorMessage = "Error inesperado al iniciar sesión";
      setError(`${errorMessage} (Código: ${errorCode})`);

      setValidationErrors([
        {
          code: errorCode,
          field: "login",
          message: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    validationErrors.length === 0 && email.length > 0 && password.length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex items-center justify-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#171717]">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Dctoralia</span>
          </div>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Accede a tu cuenta para gestionar tu consulta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" role="alert" aria-live="polite">
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
                  autoComplete="email"
                  placeholder="doctor@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  required
                  disabled={isLoading}
                  className={
                    touched.email &&
                    validationErrors.some((e) => e.field === "email")
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
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={handlePasswordBlur}
                    required
                    disabled={isLoading}
                    className={
                      touched.password &&
                      validationErrors.some((e) => e.field === "password")
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
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

          <div className="text-center text-sm">
            <Link
              href="/register"
              className="text-[#171717] underline-offset-4 hover:underline"
            >
              ¿No tienes cuenta? Regístrate aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
