"use client";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";
export function OperatingDoctorSelector() {
  const query = api.agendaAdministrator.operatingDoctors.useQuery();
  const select = api.agendaAdministrator.selectDoctor.useMutation();
  const [changing, setChanging] = useState(false);
  const result = query.data?.result;
  if (!result?.isReceptionist) return null;
  if (!result.doctors.length)
    return (
      <p className="text-muted-foreground px-1 text-xs leading-5">
        El médico debe habilitar tu acceso de recepción.
      </p>
    );
  return (
    <label className="text-muted-foreground block space-y-1 text-[11px]">
      Agenda del médico
      <select
        aria-label="Agenda del médico"
        className="border-border text-foreground min-h-11 w-full rounded-xl border bg-transparent px-2 text-xs"
        value={result.selectedDoctorId ?? ""}
        disabled={changing}
        onChange={(event) => {
          if (!event.target.value) return;
          setChanging(true);
          void select
            .mutateAsync({ doctorId: event.target.value })
            .then((response) => {
              unwrapTrpcResult(response);
              window.location.reload();
            })
            .catch((error: unknown) => {
              setChanging(false);
              toast.error(
                error instanceof Error
                  ? error.message
                  : "No se pudo cambiar de agenda.",
              );
            });
        }}
      >
        <option value="" disabled>
          Selecciona una agenda
        </option>
        {result.doctors.map((doctor) => (
          <option key={doctor.id} value={doctor.id}>
            {doctor.name}
          </option>
        ))}
      </select>
    </label>
  );
}
