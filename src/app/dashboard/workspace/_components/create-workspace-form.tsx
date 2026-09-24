"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

export function CreateWorkspaceForm() {
  const [name, setName] = useState("");
  const mutation = api.workspace.create.useMutation();
  const utils = api.useUtils();
  return (
    <form
      className="mx-auto max-w-lg space-y-4 px-4 py-10"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          unwrapTrpcResult(await mutation.mutateAsync({ name }));
          await utils.invalidate();
          toast.success("Workspace creado. Elige tu plan para activarlo.");
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "No se pudo crear el workspace",
          );
        }
      }}
    >
      <div className="space-y-1">
        <h1 className="text-base font-medium">
          Tu consultorio, en un solo lugar
        </h1>
        <p className="text-muted-foreground text-sm">
          Crea tu workspace y selecciona Pro, Enterprise o Custom. No se
          realizará ningún cobro en este paso.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="workspace-name">Nombre del consultorio o clínica</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          minLength={2}
          maxLength={100}
          required
          autoComplete="organization"
          disabled={mutation.isPending}
        />
      </div>
      <Button
        type="submit"
        disabled={mutation.isPending || name.trim().length < 2}
      >
        {mutation.isPending ? "Creando…" : "Crear workspace"}
      </Button>
    </form>
  );
}
