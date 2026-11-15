"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { ProductShell } from "~/components/shell/product-shell";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

export function VoiceAccessView() {
  const doctorId = useSearchParams().get("doctorId") ?? "";
  const issue = api.voiceAgent.issueAccessCode.useMutation();
  const [error, setError] = useState("");
  const [grant, setGrant] = useState<{
    code: string;
    expiresAt: Date;
    phoneNumber: string;
  } | null>(null);
  const doctor = api.doctor.getById.useQuery(
    { id: doctorId },
    { enabled: !!doctorId },
  );
  async function create() {
    setError("");
    setGrant(null);
    try {
      setGrant(unwrapTrpcResult(await issue.mutateAsync({ doctorId })));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo autorizar.");
    }
  }
  return (
    <ProductShell role="PATIENT">
      <div className="mx-auto max-w-xl space-y-5 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Autorizar mi llamada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-muted-foreground text-sm leading-7">
              Genera un código para que el asistente telefónico del consultorio
              pueda consultar y gestionar tus citas. No permite leer tu
              expediente.
            </p>
            {doctor.data?.result && (
              <p className="font-medium">
                Consultorio de {doctor.data.result.user.name}
              </p>
            )}
            {!doctorId && (
              <p>
                Abre esta opción desde el perfil del médico con el que quieres
                hablar.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm">
                {error}
              </p>
            )}
            <Button
              type="button"
              onClick={() => void create()}
              disabled={!doctorId || !doctor.data?.result || issue.isPending}
            >
              {issue.isPending ? "Generando…" : "Generar código de llamada"}
            </Button>
            {grant && (
              <div
                className="border-border space-y-3 rounded-xl border p-4"
                aria-live="polite"
              >
                <p className="font-mono text-3xl tracking-widest">
                  {grant.code}
                </p>
                <p className="text-sm">
                  Válido hasta{" "}
                  {new Date(grant.expiresAt).toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  . Un solo uso.
                </p>
                <p className="text-muted-foreground text-sm">
                  Compártelo solo al llamar al {grant.phoneNumber}. Permite
                  gestionar tus citas de este consultorio durante esa llamada.
                </p>
                <Button asChild variant="outline">
                  <a href={"tel:" + grant.phoneNumber}>Llamar al consultorio</a>
                </Button>
              </div>
            )}
            <Link
              href="/patient/appointments"
              className="inline-flex min-h-11 items-center text-sm underline"
            >
              Volver a mis citas
            </Link>
          </CardContent>
        </Card>
      </div>
    </ProductShell>
  );
}
