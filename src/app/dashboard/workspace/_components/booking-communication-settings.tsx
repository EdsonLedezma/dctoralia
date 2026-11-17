"use client";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
type Settings = {
  supportPhone: string;
  publicBookingEnabled: boolean;
  sendConfirmation: boolean;
  inviteAfterConsultation: boolean;
  confirmationsReady: boolean;
  invitationsReady: boolean;
};
function SettingsForm({ initial }: { initial: Settings }) {
  const [value, setValue] = useState(initial);
  const mutation = api.patientPortal.configure.useMutation();
  const utils = api.useUtils();
  async function save() {
    try {
      unwrapTrpcResult(
        await mutation.mutateAsync({
          supportPhone: value.supportPhone,
          publicBookingEnabled: value.publicBookingEnabled,
          sendConfirmation: value.sendConfirmation,
          inviteAfterConsultation: value.inviteAfterConsultation,
        }),
      );
      await utils.patientPortal.getSettings.invalidate();
      toast.success("Preferencias guardadas.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar.",
      );
    }
  }
  return (
    <div className="space-y-4">
      <div className="max-w-sm space-y-2">
        <Label htmlFor="booking-support-phone">
          Teléfono para reagendar o cancelar
        </Label>
        <Input
          id="booking-support-phone"
          type="tel"
          value={value.supportPhone}
          onChange={(event) =>
            setValue({ ...value, supportPhone: event.target.value })
          }
        />
      </div>
      <div className="divide-border divide-y">
        <label className="flex min-h-12 items-center justify-between gap-4 py-2 text-sm">
          Permitir solicitudes desde el directorio público
          <Checkbox
            checked={value.publicBookingEnabled}
            onCheckedChange={(checked) =>
              setValue({ ...value, publicBookingEnabled: checked === true })
            }
          />
        </label>
        <label className="flex min-h-12 items-center justify-between gap-4 py-2 text-sm">
          Enviar confirmación al aprobar una cita
          <Checkbox
            checked={value.sendConfirmation}
            onCheckedChange={(checked) =>
              setValue({ ...value, sendConfirmation: checked === true })
            }
          />
        </label>
        <label className="flex min-h-12 items-center justify-between gap-4 py-2 text-sm">
          Invitar al portal al finalizar la consulta
          <Checkbox
            checked={value.inviteAfterConsultation}
            onCheckedChange={(checked) =>
              setValue({ ...value, inviteAfterConsultation: checked === true })
            }
          />
        </label>
      </div>
      <p className="text-muted-foreground text-xs leading-5">
        Confirmaciones:{" "}
        {initial.confirmationsReady
          ? "configuradas"
          : "requieren conectar mensajería"}
        . Invitaciones:{" "}
        {initial.invitationsReady
          ? "configuradas"
          : "requieren conectar mensajería"}
        . Solo se envían a pacientes que autorizaron el contacto.
      </p>
      <p className="text-muted-foreground text-xs">
        Cada consulta finalizada habilita hasta dos archivos de estudios. La
        cuenta se activa mediante el enlace enviado al paciente.
      </p>
      <Button
        type="button"
        onClick={() => void save()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? "Guardando…" : "Guardar preferencias"}
      </Button>
    </div>
  );
}
export function BookingCommunicationSettings() {
  const query = api.patientPortal.getSettings.useQuery();
  if (query.isLoading)
    return (
      <p className="text-muted-foreground py-4 text-sm">
        Cargando reservas y comunicación…
      </p>
    );
  const data = query.data?.result;
  if (!data)
    return (
      <p className="text-muted-foreground py-4 text-sm">
        {query.data?.message ?? "No se pudo cargar la configuración."}
      </p>
    );
  return (
    <section className="space-y-4 border-b py-5">
      <div>
        <h2 className="text-sm font-medium">Reservas y comunicación</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Las solicitudes quedan pendientes hasta que tú o recepción las
          confirmen.
        </p>
      </div>
      <SettingsForm key={JSON.stringify(data)} initial={data} />
    </section>
  );
}
