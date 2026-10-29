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
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la solicitud");
    }
  };

  return (
    <Card className="overflow-hidden rounded-xl border-[#dce9df] bg-white shadow-none">
      <div className="flex items-center gap-2 border-b border-[#e4eee5] px-5 py-4">
        <PhoneCall className="size-4 text-[#278263]" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-[#183b30]">Agente de voz</h2>
      </div>
      <div className="space-y-4 p-5 text-sm text-[#365747]">
        {query.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : query.error || query.data?.error ? (
          <p>No pudimos consultar la línea. Intenta actualizar la página.</p>
        ) : (
          <>
            <p>
              Número de tu perfil: <strong>{data?.profilePhone ?? "Sin registrar"}</strong>
            </p>
            <p className="max-w-2xl leading-6">
              Solicita conectar este número para que un agente atienda llamadas normales y consulte servicios y horarios. La línea requiere portabilidad o desvío con el operador; registrar el número aquí no activa las llamadas por sí solo.
            </p>
            {status === "ACTIVE" ? (
              <p className="rounded-lg bg-[#eaf7ee] px-3 py-2 font-medium text-[#1b6549]">
                Línea activa: {data?.line?.phoneNumber}
              </p>
            ) : status === "PENDING" ? (
              <p className="rounded-lg bg-[#fff5e7] px-3 py-2 font-medium text-[#835326]">
                Solicitud recibida para {data?.line?.phoneNumber}. Falta conectar el operador y publicar el asistente en Vapi.
              </p>
            ) : (
              <Button
                type="button"
                onClick={() => void request()}
                disabled={requestLine.isPending || !data?.profilePhone}
                className="bg-[#1f7257] text-white hover:bg-[#185941]"
              >
                {requestLine.isPending ? "Registrando…" : "Solicitar conexión del número"}
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
