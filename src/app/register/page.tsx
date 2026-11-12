import { Suspense } from "react";
import { AuthShell, AuthFormLoading } from "~/components/auth/auth-shell";
import { RegisterForm } from "./_components/register-form";
export default function RegisterPage() {
  return (
    <AuthShell
      title="Crea tu cuenta"
      description="Un lugar para organizar tu atención, a tu manera."
    >
      <Suspense fallback={<AuthFormLoading />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
