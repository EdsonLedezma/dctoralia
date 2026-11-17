"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";

export function AgendaAdministratorSettings() {
  const query = api.agendaAdministrator.getMine.useQuery();
  const configure = api.agendaAdministrator.configure.useMutation();
  const create = api.agendaAdministrator.create.useMutation();
  const disable = api.agendaAdministrator.disable.useMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [error, setError] = useState("");
  const data = query.data?.result;
  const active =
    data?.administrators.filter((administrator) => administrator.active) ?? [];
  const toggle = async () => {
    try {
      unwrapTrpcResult(
        await configure.mutateAsync({ enabled: !data?.enabled }),
      );
      await query.refetch();
      toast.success(
        data?.enabled
          ? "Acceso de recepción desactivado."
          : "Recepción habilitada.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      unwrapTrpcResult(await create.mutateAsync(form));
      setForm({ name: "", username: "", password: "" });
      setOpen(false);
      await query.refetch();
      toast.success("Usuario de recepción creado.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el usuario.");
    }
  }
  if (query.isLoading)
    return (
      <p className="text-muted-foreground py-4 text-xs">
        Cargando acceso de recepción…
      </p>
    );
  if (!data) return null;
  return (
    <section
      className="border-border space-y-3 border-b py-4"
      aria-label="Administrador de agenda"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">Administrador de agenda</h2>
          <p className="text-muted-foreground mt-1 max-w-xl text-xs leading-5">
            Crea un acceso personal para recepción. Puede agendar, confirmar,
            registrar llegadas y contactar pacientes; no puede abrir
            expedientes, estudios ni notas clínicas.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.enabled}
          aria-label="Habilitar administrador de agenda"
          disabled={configure.isPending}
          onClick={() => void toggle()}
          className="focus-visible:ring-ring flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          <span
            className={`relative block h-5 w-9 rounded-full transition-colors ${data.enabled ? "bg-foreground" : "bg-muted-foreground/35"}`}
          >
            <span
              className={`bg-background absolute top-0.5 size-4 rounded-full shadow-sm transition-transform ${data.enabled ? "translate-x-[18px]" : "translate-x-0.5"}`}
            />
          </span>
        </button>
      </div>
      {data.enabled && (
        <div className="space-y-2">
          {active.map((administrator) => (
            <div
              key={administrator.id}
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <span>
                {administrator.user.name}
                <span className="text-muted-foreground ml-2 text-xs">
                  {administrator.user.username}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disable.isPending}
                onClick={() => {
                  void disable
                    .mutateAsync({ id: administrator.id })
                    .then((response) => {
                      unwrapTrpcResult(response);
                      return query.refetch();
                    })
                    .catch((e: unknown) =>
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : "No se pudo desactivar.",
                      ),
                    );
                }}
              >
                Desactivar acceso
              </Button>
            </div>
          ))}
          {!active.length && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
            >
              Crear usuario de recepción
            </Button>
          )}
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!create.isPending) {
            setOpen(value);
            if (!value) setForm({ name: "", username: "", password: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Acceso de recepción</DialogTitle>
            <DialogDescription>
              Es una cuenta independiente del médico. Comparte estas
              credenciales solo con la persona autorizada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Nombre</Label>
              <Input
                id="staff-name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="off"
                value={form.name}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-username">Usuario</Label>
              <Input
                id="staff-username"
                required
                pattern="[a-z0-9._-]{3,40}"
                minLength={3}
                maxLength={40}
                autoCapitalize="none"
                autoComplete="off"
                value={form.username}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    username: event.target.value.toLowerCase(),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">Contraseña</Label>
              <Input
                id="staff-password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
              />
              <p className="text-muted-foreground text-xs">
                Mínimo 12 caracteres.
              </p>
            </div>
            {error && (
              <p role="alert" className="text-sm">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={create.isPending}
                onClick={() => {
                  setOpen(false);
                  setForm({ name: "", username: "", password: "" });
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creando…" : "Crear acceso"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
