"use client";

import type React from "react";
import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Stethoscope } from "lucide-react";

import { Alert, AlertDescription } from "~/components/ui/alert";
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

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(
          result.error.toLowerCase().includes("network")
            ? "No pudimos conectar. Revisa tu conexión e inténtalo de nuevo."
            : "El correo o la contraseña no son correctos.",
        );
        return;
      }

      const session = await getSession();
      router.replace(
        session?.user?.role === "DOCTOR" ? "/dashboard" : "/patient/dashboard",
      );
    } catch {
      setError("No pudimos iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-10">
      <div className="w-full max-w-[420px]">
        <Card className="border-[#e5e5e5] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.06)]">
          <CardHeader className="space-y-6 px-6 pt-8 text-center sm:px-9 sm:pt-10">
            <div className="mx-auto flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#171717] text-white">
                <Stethoscope aria-hidden="true" className="h-[18px] w-[18px]" />
              </div>
              <span className="text-lg font-semibold tracking-[-0.04em] text-[#171717]">
                Dctoralia
              </span>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-[26px] font-semibold tracking-[-0.04em] text-[#171717]">
                Bienvenido de nuevo
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-[#6b6b6b]">
                Inicia sesión para continuar con tu consulta.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-6 pb-8 pt-7 sm:px-9 sm:pb-9">
            {error && (
              <Alert
                variant="destructive"
                role="alert"
                aria-live="polite"
                className="rounded-lg border-[#f3c6c6] bg-[#fff7f7] text-[#b42318]"
              >
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-[#262626]">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 rounded-lg border-[#dedede] bg-white px-3.5 text-sm shadow-none placeholder:text-[#a3a3a3] focus-visible:border-[#171717] focus-visible:ring-[#171717]/15"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-[#262626]">
                    Contraseña
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 rounded-lg border-[#dedede] bg-white px-3.5 pr-11 text-sm shadow-none placeholder:text-[#a3a3a3] focus-visible:border-[#171717] focus-visible:ring-[#171717]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-[#737373] transition-colors hover:text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#171717]/30 disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Eye aria-hidden="true" className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-lg bg-[#171717] text-sm font-medium text-white shadow-none transition-colors hover:bg-[#333]"
                disabled={isLoading || !email.trim() || !password}
              >
                {isLoading ? (
                  <>
                    <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión…
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>

            <div className="border-t border-[#ebebeb] pt-5 text-center text-sm text-[#737373]">
              ¿Aún no tienes cuenta?{" "}
              <Link
                href="/register"
                className="font-medium text-[#171717] underline-offset-4 transition-colors hover:text-[#525252] hover:underline"
              >
                Crear cuenta
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-[#8c8c8c]">
          Tu información clínica está protegida.
        </p>
      </div>
    </main>
  );
}
