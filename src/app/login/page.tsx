import { Suspense } from "react";
import { AuthShell, AuthFormLoading } from "~/components/auth/auth-shell";
import { LoginForm } from "./_components/login-form";
export default function LoginPage() {
  return (
    <AuthShell
      title="Bienvenido de nuevo"
      description="Inicia sesión para continuar con tu consulta."
    >
      <Suspense fallback={<AuthFormLoading />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
