"use client";
import { useState, type FormEvent } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, LoaderCircle } from "lucide-react";
import { PasswordInput } from "~/components/auth/password-input";
import {
  authPageHref,
  safeAuthReturnPath,
} from "~/components/auth/auth-navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const returnPath = safeAuthReturnPath(search.get("callbackUrl"));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (!result || result.error) {
        setError(
          result?.error?.toLowerCase().includes("network")
            ? "No pudimos conectar. Revisa tu conexión e inténtalo de nuevo."
            : "El correo o la contraseña no son correctos.",
        );
        return;
      }
      const session = await getSession();
      if (!session?.user) {
        setError("No pudimos recuperar tu sesión. Inténtalo de nuevo.");
        return;
      }
      const role = session.user.role;
      router.replace(
        safeAuthReturnPath(returnPath, role) ??
          (role === "DOCTOR" ? "/dashboard" : "/patient/dashboard"),
      );
    } catch {
      setError("No pudimos iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      {error && (
        <div
          role="alert"
          id="login-error"
          className="border-foreground/25 bg-muted flex gap-3 rounded-xl border p-4 text-sm"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
      <form
        onSubmit={submit}
        aria-busy={loading}
        aria-describedby={error ? "login-error" : undefined}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
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
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={loading}
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={loading || !email.trim() || !password}
        >
          {loading ? (
            <>
              <LoaderCircle className="animate-spin motion-reduce:animate-none" />
              Iniciando sesión…
            </>
          ) : (
            <>
              Iniciar sesión
              <ArrowRight />
            </>
          )}
        </Button>
      </form>
      <p className="text-muted-foreground border-border border-t pt-5 text-center text-sm">
        ¿Aún no tienes cuenta?{" "}
        <Link
          className="text-foreground font-semibold underline-offset-4 hover:underline"
          href={authPageHref("/register", returnPath)}
        >
          Crear cuenta
        </Link>
      </p>
    </>
  );
}
