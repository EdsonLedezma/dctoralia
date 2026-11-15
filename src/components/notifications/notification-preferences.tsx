"use client";
import { toast } from "sonner";
import { Checkbox } from "~/components/ui/checkbox";
import { useInboxPreferences } from "./inbox-preferences";
export function NotificationPreferences() {
  const { preferences, save } = useInboxPreferences();
  const update = (patch: Parameters<typeof save>[0]) => {
    try {
      save(patch);
      toast.success("Preferencia guardada en este navegador.");
    } catch {
      toast.error("El navegador no permite guardar esta preferencia.");
    }
  };
  return (
    <section className="mx-auto max-w-3xl px-4 py-7 sm:px-7">
      <h1 className="text-2xl font-semibold tracking-tight">
        Preferencias de notificaciones
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Abre tus avisos desde la campana. Aquí ajustas cómo se muestran en este
        dispositivo.
      </p>
      <div className="divide-border mt-6 divide-y border-y">
        <label className="flex min-h-16 items-center justify-between gap-5 py-4 text-sm">
          <span>Abrir la bandeja con los avisos sin leer</span>
          <Checkbox
            checked={preferences.unreadOnly}
            onCheckedChange={(value) => update({ unreadOnly: value === true })}
          />
        </label>
        <label className="flex min-h-16 items-center justify-between gap-5 py-4 text-sm">
          <span>
            Mostrar el detalle de los avisos
            <span className="text-muted-foreground mt-1 block text-xs">
              Desactívalo para ocultar el mensaje al abrir la campana.
            </span>
          </span>
          <Checkbox
            checked={preferences.showDetails}
            onCheckedChange={(value) => update({ showDetails: value === true })}
          />
        </label>
        <label className="flex min-h-16 items-center justify-between gap-5 py-4 text-sm">
          <span>Avisos por bloque</span>
          <select
            className="border-border rounded-lg border bg-transparent px-3 py-2"
            value={preferences.pageSize}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (value === 8 || value === 15 || value === 25)
                update({ pageSize: value });
            }}
          >
            <option value={8}>8</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
          </select>
        </label>
      </div>
      <p className="text-muted-foreground mt-4 text-xs leading-5">
        Estos ajustes son de visualización local. No cambian el envío de
        correos, WhatsApp ni recordatorios del consultorio.
      </p>
    </section>
  );
}
