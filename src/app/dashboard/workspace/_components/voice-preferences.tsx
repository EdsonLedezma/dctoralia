"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

export function VoicePreferences({
  enabled,
  mutationsEnabled,
}: {
  enabled: boolean;
  mutationsEnabled: boolean;
}) {
  const [changes, setChanges] = useState(mutationsEnabled);
  const configure = api.voiceAgent.configure.useMutation();
  const utils = api.useUtils();
  async function save(nextEnabled: boolean) {
    try {
      const response = await configure.mutateAsync({
        enabled: nextEnabled,
        mutationsEnabled: changes,
      });
      unwrapTrpcResult(response);
      await utils.voiceAgent.getMine.invalidate();
      toast.success(response.message);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar.",
      );
    }
  }
  return (
    <div className="border-border space-y-4 rounded-xl border p-4">
      <p className="text-foreground font-medium">
        {enabled ? "Asistente habilitado" : "Asistente desactivado"}
      </p>
      <p className="text-muted-foreground text-sm leading-6">
        Este complemento es opcional y requiere una licencia habilitada. Puedes
        permitir solo consultas de horarios o autorizar que gestione citas de
        pacientes verificados.
      </p>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <Checkbox
          checked={changes}
          onCheckedChange={(value) => setChanges(value === true)}
          disabled={configure.isPending}
        />
        Permitir crear, reprogramar y cancelar citas
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void save(true)}
          disabled={configure.isPending}
        >
          {enabled ? "Guardar preferencias" : "Activar asistente"}
        </Button>
        {enabled && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void save(false)}
            disabled={configure.isPending}
          >
            Desactivar
          </Button>
        )}
      </div>
    </div>
  );
}
