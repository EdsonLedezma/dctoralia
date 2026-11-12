"use client";

import { useState } from "react";
import { ArrowUpRight, Bell, Check, LoaderCircle } from "lucide-react";
import { GlassSurface } from "~/components/liquid-glass/glass-surface";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { DatePicker } from "~/components/ui/date-picker";
import { SearchableSelect } from "~/components/ui/searchable-select";

const clinicians = [
  {
    value: "sofia",
    label: "Dra. Sofía Méndez",
    description: "Medicina general",
  },
  { value: "diego", label: "Dr. Diego Navarro", description: "Cardiología" },
  { value: "elena", label: "Dra. Elena Ríos", description: "Dermatología" },
];

export function MaterialSamples() {
  const [birthdate, setBirthdate] = useState("1989-04-15");
  const [clinician, setClinician] = useState("sofia");
  const [confirmed, setConfirmed] = useState(false);
  return (
    <section aria-labelledby="materials-title" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs">
            El material se adapta al contexto
          </p>
          <h2
            id="materials-title"
            className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
          >
            La misma burbuja. Distintos fondos.
          </h2>
        </div>
        <p className="text-muted-foreground max-w-sm text-sm leading-6">
          Más claridad sobre contenido. Más ligereza donde hay espacio.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Card
          className="min-h-56 justify-between gap-8 p-6"
          data-material-sample="plain"
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              01 / Fondo liso
            </span>
            <Bell className="text-muted-foreground size-4" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild backdrop="plain">
              <a href="#picker-demo">
                Elegir un horario <ArrowUpRight />
              </a>
            </Button>
            <span className="text-muted-foreground text-xs">
              Sin ruido detrás.
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            Luz de borde y volumen suave.
          </p>
        </Card>
        <div
          className="border-border bg-muted relative isolate flex min-h-56 items-center overflow-hidden rounded-[24px] border px-6 py-8"
          data-material-sample="content"
        >
          <div
            aria-hidden="true"
            className="text-foreground/65 absolute inset-0 space-y-3 p-6 text-sm leading-7"
          >
            <p>09:30 — Consulta de seguimiento</p>
            <p>10:15 — Revisión de resultados</p>
            <p>11:00 — Primera consulta</p>
            <p>11:45 — Consulta de seguimiento</p>
          </div>
          <GlassSurface
            backdrop="content"
            className="w-full"
            contentClassName="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="text-xs font-semibold">02 / Sobre contenido</p>
              <p className="text-muted-foreground mt-1 text-xs">
                El fondo acompaña, el control se lee.
              </p>
            </div>
            <Button asChild>
              <a href="#picker-demo">
                Elegir un horario <ArrowUpRight />
              </a>
            </Button>
          </GlassSurface>
        </div>
      </div>
      <div
        className="border-border flex flex-wrap items-center gap-3 rounded-[24px] border px-5 py-5"
        aria-label="Estados de los botones"
      >
        <span className="text-muted-foreground mr-2 text-xs">
          Cada estado conserva su forma
        </span>
        <Button onClick={() => setConfirmed(true)}>
          <Check /> {confirmed ? "Confirmado" : "Confirmar"}
        </Button>
        <Button variant="outline" onClick={() => setConfirmed(false)}>
          Restablecer
        </Button>
        <Button disabled aria-busy="true">
          <LoaderCircle className="animate-spin motion-reduce:animate-none" />{" "}
          Guardando
        </Button>
        <Button disabled>No disponible</Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {confirmed ? "Confirmación de muestra completada." : ""}
      </p>
      <Card className="grid gap-6 p-6 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-semibold">Buscar y elegir</p>
          <SearchableSelect
            id="sample-clinician"
            label="Profesional de muestra"
            value={clinician}
            onValueChange={setClinician}
            options={clinicians}
            placeholder="Elegir profesional"
            searchPlaceholder="Nombre o especialidad"
          />
          <p className="text-muted-foreground text-xs">
            Búsqueda, selección y teclado en el mismo control.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold">Una fecha de otra época</p>
          <DatePicker
            purpose="birthdate"
            label="Fecha de nacimiento de muestra"
            value={birthdate}
            onValueChange={setBirthdate}
            className="w-full"
          />
          <p className="text-muted-foreground text-xs">
            Mes y año accesibles sin recorrer décadas.
          </p>
        </div>
      </Card>
    </section>
  );
}
