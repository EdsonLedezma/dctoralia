"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";
import { DopilotBrand } from "~/components/brand/dopilot-brand";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { PasswordInput } from "~/components/auth/password-input";
export function ActivatePatientView() {
  const params = useSearchParams();
  const [token] = useState(() => params.get("token") ?? "");
  const {
    mutate: inspectToken,
    data: inspection,
    isPending: inspecting,
  } = api.patientPortal.inspect.useMutation();
  const claim = api.patientPortal.claim.useMutation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!token) return;
    inspectToken({ token });
    window.history.replaceState(window.history.state, "", "/activar");
  }, [token, inspectToken]);
  const info = inspection?.result;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accepted || claim.isPending) return;
    setError("");
    try {
      unwrapTrpcResult(
        await claim.mutateAsync({
          token,
          username,
          password,
          acceptedTerms: true,
        }),
      );
      setPassword("");
      setDone(true);
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "No se pudo activar el acceso.",
      );
    }
  }
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-4 py-8">
      <section className="border-border bg-card w-full max-w-md space-y-5 rounded-3xl border p-6">
        <DopilotBrand />
        <h1 className="text-xl font-semibold">
          Tu espacio de salud está listo
        </h1>
        {done ? (
          <>
            <p className="text-muted-foreground text-sm">
              El expediente quedó vinculado a tu cuenta. Inicia sesión para ver
              tus doctores y documentos.
            </p>
            <Button asChild className="w-full">
              <Link href="/login?callbackUrl=%2Fpatient%2Fstudies">
                Iniciar sesión
              </Link>
            </Button>
          </>
        ) : inspecting ? (
          <p className="text-sm" role="status">
            Revisando tu invitación…
          </p>
        ) : !token || !info ? (
          <>
            <p role="alert" className="text-sm">
              {inspection?.message ??
                "Abre el enlace que te envió el consultorio. Si venció, solicita una nueva invitación."}
            </p>
            <Button asChild variant="outline">
              <Link href="/login">Ya tengo acceso</Link>
            </Button>
          </>
        ) : info.alreadyActive ? (
          <>
            <p className="text-sm">Ya tienes acceso. Usa tu cuenta habitual.</p>
            <Button asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-sm leading-6">
              Hola, {info.name}. {info.doctorName} te invitó a consultar tus
              documentos y subir los estudios solicitados. No necesitas volver a
              capturar los datos de tu consulta.
            </p>
            <p className="text-muted-foreground text-xs">
              Invitación enviada al teléfono terminado en {info.phoneSuffix}.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="activation-user">Usuario</Label>
                <Input
                  id="activation-user"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  minLength={3}
                  maxLength={128}
                />
                <p className="text-muted-foreground text-xs">
                  Si ya tienes cuenta, usa tu usuario o correo habitual y su
                  contraseña para vincular este expediente.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="activation-password">Contraseña</Label>
                <PasswordInput
                  id="activation-password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  maxLength={128}
                  required
                />
              </div>
              <label className="flex min-h-11 items-center gap-3 text-xs leading-5">
                <Checkbox
                  checked={accepted}
                  onCheckedChange={(value) => setAccepted(value === true)}
                />
                <span>
                  Acepto los{" "}
                  <Link
                    className="underline"
                    href="/terminos"
                    target="_blank"
                    rel="noreferrer"
                  >
                    términos
                  </Link>{" "}
                  y el{" "}
                  <Link
                    className="underline"
                    href="/aviso-de-privacidad"
                    target="_blank"
                    rel="noreferrer"
                  >
                    aviso de privacidad
                  </Link>
                  .
                </span>
              </label>
              {error && (
                <p role="alert" className="text-sm">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={!accepted || claim.isPending}
                className="w-full"
              >
                {claim.isPending ? "Activando…" : "Activar mi acceso"}
              </Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
