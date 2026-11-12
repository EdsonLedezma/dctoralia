"use client";

import { PhoneCall } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

export function VoiceAgentSettings() {
  const query = api.voiceAgent.getMine.useQuery();
  const requestLine = api.voiceAgent.requestLine.useMutation();
  const utils = api.useUtils();
  const data = query.data?.result;
  const status = data?.line?.status;

  const request = async () => {
    try {
      unwrapTrpcResult(await requestLine.mutateAsync());
      await utils.voiceAgent.getMine.invalidate();
      toast.success("Solicitud de línea registrada");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la solicitud",
      );
    }
  };

  return (
    <Card className="border-border bg-card overflow-hidden rounded-xl shadow-none">
      <div className="border-border flex items-center gap-2 border-b px-5 py-4">
        <PhoneCall
          className="text-muted-foreground size-4"
          aria-hidden="true"
        />
        <h2 className="text-foreground text-sm font-semibold">Agente de voz</h2>
      </div>
      <div className="text-muted-foreground space-y-4 p-5 text-sm">
        {query.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : query.error || query.data?.error ? (
          <p>No pudimos consultar la línea. Intenta actualizar la página.</p>
        ) : (
          <>
            <p>
              Número de tu perfil:{" "}
              <strong>{data?.profilePhone ?? "Sin registrar"}</strong>
            </p>
            <p className="max-w-2xl leading-6">
              Solicita conectar este número para que un agente atienda llamadas
              normales y consulte servicios y horarios. La línea requiere
              portabilidad o desvío con el operador; registrar el número aquí no
              activa las llamadas por sí solo.
            </p>
            {status === "ACTIVE" ? (
              <p className="bg-secondary text-foreground rounded-lg px-3 py-2 font-medium">
                Línea activa: {data?.line?.phoneNumber}
              </p>
            ) : status === "PENDING" ? (
              <p className="bg-muted text-foreground rounded-lg px-3 py-2 font-medium">
                Solicitud recibida para {data?.line?.phoneNumber}. Falta
                conectar el operador y publicar el asistente en Vapi.
              </p>
            ) : (
              <Button
                type="button"
                onClick={() => void request()}
                disabled={requestLine.isPending || !data?.profilePhone}
                className="min-h-11"
              >
                {requestLine.isPending
                  ? "Registrando…"
                  : "Solicitar conexión del número"}
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
