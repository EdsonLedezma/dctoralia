"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  LoaderCircle,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useRegister } from "~/hooks/useRegister";
import { validateRegistrationForm } from "~/utils/validation";
import {
  authPageHref,
  safeAuthReturnPath,
} from "~/components/auth/auth-navigation";
import { PasswordInput } from "~/components/auth/password-input";
import { PasswordStrengthIndicator } from "~/components/ui/validation-errors";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { SegmentedControl } from "~/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type Draft = {
  name: string;
  email: string;
  password: string;
  phone: string;
  specialty: string;
  license: string;
};
type Field = keyof Draft;
const emptyDraft: Draft = {
  name: "",
  email: "",
  password: "",
  phone: "",
  specialty: "",
  license: "",
};
const specialties = [
  ["medicina-general", "Medicina general"],
  ["cardiologia", "Cardiología"],
  ["dermatologia", "Dermatología"],
  ["pediatria", "Pediatría"],
  ["ginecologia", "Ginecología"],
  ["neurologia", "Neurología"],
  ["traumatologia", "Traumatología"],
  ["psiquiatria", "Psiquiatría"],
] as const;

function RegistrationField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-foreground flex items-start gap-2 text-xs leading-5"
        >
          <AlertCircle
            className="mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
          {error}
        </p>
      )}
    </div>
  );
}

export function RegisterForm() {
  const [role, setRole] = useState<"DOCTOR" | "PATIENT">("DOCTOR");
  const [drafts, setDrafts] = useState({
    DOCTOR: { ...emptyDraft },
    PATIENT: { ...emptyDraft },
  });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const { register, isRegistering, resetRegister } = useRegister();
  const router = useRouter();
  const search = useSearchParams();
  const returnPath = safeAuthReturnPath(search.get("callbackUrl"));
  const loginHref = authPageHref("/login", returnPath);
  const draft = drafts[role];
  const payload = {
    name: draft.name,
    email: draft.email,
    password: draft.password,
    phone: draft.phone,
    role,
    ...(role === "DOCTOR"
      ? { specialty: draft.specialty, license: draft.license }
      : {}),
  };
  const validation = validateRegistrationForm(payload);
  const message = (field: Field) =>
    touched[field]
      ? validation.errors.find((item) => item.field === field)?.message
      : undefined;
  const fieldProps = (field: Field) => ({
    id: `${role.toLowerCase()}-${field}`,
    value: draft[field],
    disabled: isRegistering,
    required: true,
    "aria-invalid": Boolean(message(field)),
    "aria-describedby": message(field)
      ? `${role.toLowerCase()}-${field}-error`
      : undefined,
    onBlur: () => setTouched((current) => ({ ...current, [field]: true })),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setDrafts((current) => ({
        ...current,
        [role]: { ...current[role], [field]: event.target.value },
      })),
  });
  useEffect(() => {
    if (!created) return;
    const timer = window.setTimeout(() => router.push(loginHref), 2000);
    return () => window.clearTimeout(timer);
  }, [created, loginHref, router]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRegistering) return;
    setTouched({
      name: true,
      email: true,
      phone: true,
      password: true,
      specialty: true,
      license: true,
    });
    setError("");
    resetRegister();
    if (!validation.isValid) return;
    try {
      await register(payload);
      setCreated(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos crear tu cuenta. Inténtalo de nuevo.",
      );
    }
  };
  if (created)
    return (
      <div role="status" className="space-y-4 py-4">
        <span className="glass-bubble flex size-12 items-center justify-center">
          <Check className="size-5" />
        </span>
        <p className="font-semibold">Tu cuenta está lista.</p>
        <p className="text-muted-foreground text-sm leading-6">
          Te llevaremos a iniciar sesión en un momento.
        </p>
        <Button asChild>
          <Link href={loginHref}>
            Continuar
            <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  return (
    <>
      <SegmentedControl
        label="Tipo de cuenta"
        value={role}
        disabled={isRegistering}
        options={[
          { value: "DOCTOR", label: "Doctor", icon: Stethoscope },
          { value: "PATIENT", label: "Paciente", icon: UserRound },
        ]}
        className="grid w-full grid-cols-2"
        onValueChange={(value) => {
          setRole(value);
          setTouched({});
          setError("");
          resetRegister();
        }}
      />
      <p className="text-muted-foreground text-sm leading-6">
        {role === "DOCTOR"
          ? "Organiza tu consultorio y da continuidad a tus pacientes."
          : "Encuentra atención y consulta tus próximas citas."}
      </p>
      {error && (
        <div
          role="alert"
          className="border-foreground/25 bg-muted flex gap-3 rounded-xl border p-4 text-sm"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
      <form
        key={role}
        onSubmit={submit}
        aria-label={
          role === "DOCTOR" ? "Registro de doctor" : "Registro de paciente"
        }
        aria-busy={isRegistering}
        className="space-y-5"
      >
        <RegistrationField
          id={fieldProps("name").id}
          label="Nombre completo"
          error={message("name")}
        >
          <Input
            {...fieldProps("name")}
            autoComplete="name"
            placeholder="Nombre y apellido"
          />
        </RegistrationField>
        <RegistrationField
          id={fieldProps("email").id}
          label="Correo electrónico"
          error={message("email")}
        >
          <Input
            {...fieldProps("email")}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nombre@ejemplo.com"
          />
        </RegistrationField>
        {role === "DOCTOR" && (
          <div className="grid gap-5 sm:grid-cols-2">
            <RegistrationField
              id="doctor-specialty"
              label="Especialidad"
              error={message("specialty")}
            >
              <Select
                value={draft.specialty}
                disabled={isRegistering}
                onValueChange={(value) => {
                  setDrafts((current) => ({
                    ...current,
                    DOCTOR: { ...current.DOCTOR, specialty: value },
                  }));
                  setTouched((current) => ({ ...current, specialty: true }));
                }}
              >
                <SelectTrigger
                  id="doctor-specialty"
                  aria-invalid={Boolean(message("specialty"))}
                  aria-describedby={
                    message("specialty") ? "doctor-specialty-error" : undefined
                  }
                  className="w-full min-w-0"
                >
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </RegistrationField>
            <RegistrationField
              id={fieldProps("license").id}
              label="Cédula profesional"
              error={message("license")}
            >
              <Input
                {...fieldProps("license")}
                inputMode="numeric"
                placeholder="Tu número de cédula"
              />
            </RegistrationField>
          </div>
        )}
        <RegistrationField
          id={fieldProps("phone").id}
          label="Teléfono"
          error={message("phone")}
        >
          <Input
            {...fieldProps("phone")}
            type="tel"
            autoComplete="tel"
            placeholder="55 1234 5678"
          />
        </RegistrationField>
        <RegistrationField
          id={fieldProps("password").id}
          label="Contraseña"
          error={message("password")}
        >
          <PasswordInput
            {...fieldProps("password")}
            autoComplete="new-password"
            placeholder="Crea una contraseña"
          />
          {draft.password && (
            <PasswordStrengthIndicator password={draft.password} />
          )}
        </RegistrationField>
        <Button
          type="submit"
          className="w-full"
          disabled={isRegistering || !validation.isValid}
        >
          {isRegistering ? (
            <>
              <LoaderCircle className="animate-spin motion-reduce:animate-none" />
              Creando cuenta…
            </>
          ) : (
            <>
              Crear cuenta de {role === "DOCTOR" ? "doctor" : "paciente"}
              <ArrowRight />
            </>
          )}
        </Button>
      </form>
      <p className="text-muted-foreground border-border border-t pt-5 text-center text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={loginHref}
          className="text-foreground font-semibold underline-offset-4 hover:underline"
        >
          Iniciar sesión
        </Link>
      </p>
    </>
  );
}
