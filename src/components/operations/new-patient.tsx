"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { OperationsShell } from "./operations-shell";
import { PasswordInput } from "~/components/auth/password-input";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

export function NewPatient() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    birthDate: "",
    gender: "",
    address: "",
  });
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const sending = useRef(false);
  const router = useRouter();
  const utils = api.useUtils();
  const createUser = api.users.create.useMutation();
  const createPatient = api.patients.create.useMutation();
  const change = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending.current) return;
    if (!form.birthDate) {
      setError("Selecciona la fecha de nacimiento.");
      return;
    }
    sending.current = true;
    setPending(true);
    setError(null);
    let userId = createdUserId;
    try {
      if (!userId) {
        const user = unwrapTrpcResult(
          await createUser.mutateAsync({
            name: `${form.firstName.trim()} ${form.lastName.trim()}`,
            email: form.email.trim(),
            password: form.password,
            phone: form.phone.trim(),
            role: "PATIENT",
          }),
        );
        userId = user.id;
        setCreatedUserId(user.id);
        change("password", "");
      }
      unwrapTrpcResult(
        await createPatient.mutateAsync({
          userId,
          phone: form.phone.trim(),
          birthDate: new Date(`${form.birthDate}T12:00:00Z`),
          gender: form.gender || undefined,
          address: form.address.trim() || undefined,
        }),
      );
      await utils.doctor.getMyPatients.invalidate();
      router.push("/dashboard/patients");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No pudimos guardar el paciente.",
      );
    } finally {
      sending.current = false;
      setPending(false);
    }
  };

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <OperationsShell>
        <main className="mx-auto w-full max-w-3xl space-y-7 px-4 py-8 sm:px-8 sm:py-10">
          <header>
            <Button asChild variant="ghost" className="mb-4 -ml-3">
              <Link href="/dashboard/patients">
                <ArrowLeft className="size-4" />
                Pacientes
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold tracking-tight">
              Nuevo paciente
            </h1>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              Registra sus datos de identificación y contacto para incorporarlo
              al consultorio.
            </p>
          </header>
          <form onSubmit={(event) => void submit(event)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Identificación y acceso</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Los campos con * son obligatorios.
                </p>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre *</Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={(event) =>
                      change("firstName", event.target.value)
                    }
                    required
                    disabled={pending || !!createdUserId}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellidos *</Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={(event) => change("lastName", event.target.value)}
                    required
                    disabled={pending || !!createdUserId}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Correo electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => change("email", event.target.value)}
                    required
                    disabled={pending || !!createdUserId}
                  />
                </div>
                {!createdUserId && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="patient-password">
                      Contraseña inicial *
                    </Label>
                    <PasswordInput
                      id="patient-password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={form.password}
                      onChange={(event) =>
                        change("password", event.target.value)
                      }
                      disabled={pending}
                    />
                    <p className="text-muted-foreground text-sm">
                      Al menos 8 caracteres. Acuerda esta contraseña con el
                      paciente; no uses su fecha de nacimiento.
                    </p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <DatePicker
                    purpose="birthdate"
                    label="Fecha de nacimiento *"
                    value={form.birthDate}
                    onValueChange={(value) => change("birthDate", value)}
                    disabled={pending}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="gender">Género (opcional)</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(value) => change("gender", value)}
                    disabled={pending}
                  >
                    <SelectTrigger id="gender" className="w-full">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={form.phone}
                    onChange={(event) => change("phone", event.target.value)}
                    disabled={pending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Domicilio (opcional)</Label>
                  <Input
                    id="address"
                    autoComplete="street-address"
                    value={form.address}
                    onChange={(event) => change("address", event.target.value)}
                    disabled={pending}
                  />
                </div>
              </CardContent>
            </Card>
            <p className="text-muted-foreground px-1 text-sm leading-6">
              Este alta guarda identificación y contacto. La información clínica
              se gestiona desde el expediente del paciente.
            </p>
            {createdUserId && (
              <p
                role="status"
                className="border-border bg-muted rounded-2xl border p-4 text-sm"
              >
                El acceso ya fue creado. Completa el registro del paciente sin
                crear otra cuenta. Mantén esta vista abierta para reintentar.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="border-border bg-card rounded-2xl border p-4 text-sm"
              >
                {error}
              </p>
            )}
            <footer className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-3xl p-3">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => router.push("/dashboard/patients")}
              >
                Volver
              </Button>
              <Button type="submit" disabled={pending} aria-busy={pending}>
                <Save className="size-4" />
                {pending
                  ? "Guardando…"
                  : createdUserId
                    ? "Completar registro"
                    : "Guardar paciente"}
              </Button>
            </footer>
          </form>
        </main>
      </OperationsShell>
    </DashboardWrapper>
  );
}
