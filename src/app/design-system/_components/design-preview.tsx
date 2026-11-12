"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Layers3,
} from "lucide-react";
import { AppearanceSwitcher } from "~/components/shared/appearance-switcher";
import { SegmentedControl } from "~/components/ui/segmented-control";
import { GlassSurface } from "~/components/liquid-glass/glass-surface";
import { LiquidGlassArtwork } from "~/components/liquid-glass/liquid-glass-artwork";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { AppointmentDialog } from "./appointment-dialog";
import { MaterialSamples } from "./material-samples";
import { PickerDemo } from "./picker-demo";

const periods = [
  { value: "today", label: "Hoy" },
  { value: "tomorrow", label: "Mañana" },
  { value: "week", label: "Semana" },
] as const;
type Period = (typeof periods)[number]["value"];
const agenda: Record<
  Period,
  { time: string; name: string; service: string }[]
> = {
  today: [
    { time: "09:30", name: "María López", service: "Consulta de seguimiento" },
    { time: "10:15", name: "Carlos Ruiz", service: "Primera consulta" },
    { time: "11:00", name: "Ana Torres", service: "Revisión de resultados" },
  ],
  tomorrow: [
    { time: "10:00", name: "Luis García", service: "Consulta de seguimiento" },
  ],
  week: [
    {
      time: "Lun · 09:30",
      name: "María López",
      service: "Consulta de seguimiento",
    },
    { time: "Mar · 10:00", name: "Luis García", service: "Primera consulta" },
  ],
};

export function DesignPreview() {
  const [period, setPeriod] = useState<Period>("today");
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft className="size-4" />
            <span>Dctoralia</span>
          </Link>
          <span className="text-muted-foreground hidden text-xs md:inline">
            Estudio de interfaz · Datos de muestra
          </span>
          <AppearanceSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-10 px-5 py-10 sm:space-y-12 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Layers3 className="size-3.5" /> Materiales y componentes / 01
            </p>
            <h1 className="mt-4 text-4xl leading-[1.08] font-semibold tracking-[-0.045em] sm:text-5xl">
              Claridad en cada detalle.
            </h1>
            <p className="text-muted-foreground mt-4 max-w-xl text-base leading-7">
              Luz suave, controles que invitan al tacto y espacio para lo
              importante.
            </p>
          </div>
          <p className="text-muted-foreground max-w-48 text-xs leading-5">
            Una vista de diseño para probar la próxima experiencia de Dctoralia.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="w-fit">
            <Link href="/design-system/shell">
              Probar sidebar y navegación <ArrowUpRight />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-fit">
            <Link href="/design-system/discovery">
              Explorar directorio y filtros <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <section aria-labelledby="agenda-title" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <SegmentedControl
                label="Periodo de agenda"
                value={period}
                options={periods}
                onValueChange={setPeriod}
              />
              <AppointmentDialog />
            </div>
            <Card className="gap-0 overflow-hidden py-0">
              <div className="border-border flex items-center justify-between border-b px-6 py-5">
                <div>
                  <p className="text-muted-foreground text-xs">
                    Tu consultorio
                  </p>
                  <h2
                    id="agenda-title"
                    className="mt-1 text-lg font-semibold tracking-tight"
                  >
                    La agenda, en orden.
                  </h2>
                </div>
                <CalendarDays className="text-muted-foreground size-5" />
              </div>
              <div className="divide-border divide-y px-6">
                {agenda[period].map((item) => (
                  <div
                    key={item.name}
                    className="flex min-h-24 items-center gap-4 py-4"
                  >
                    <span className="text-muted-foreground min-w-12 text-sm tabular-nums">
                      {item.time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {item.name}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {item.service}
                      </p>
                    </div>
                    <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:inline-flex">
                      <Check className="size-3.5" /> Confirmada
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground border-border border-t px-6 py-4 text-xs">
                Datos de muestra · Ninguna acción guarda información clínica.
              </p>
            </Card>
          </section>
          <section
            aria-label="Material sobre escena GPU"
            className="material-card relative isolate overflow-hidden rounded-[24px] border"
            data-material-sample="media"
          >
            <LiquidGlassArtwork className="aspect-[1.12] w-full" />
            <div className="absolute inset-x-4 bottom-4">
              <GlassSurface backdrop="media" contentClassName="p-4">
                <p className="text-muted-foreground text-xs">
                  03 / Sobre luz y movimiento
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Una capa de calma.</p>
                  <Button asChild>
                    <a href="#picker-demo">
                      Elegir un horario <ArrowUpRight />
                    </a>
                  </Button>
                </div>
              </GlassSurface>
            </div>
          </section>
        </div>
        <PickerDemo />
        <MaterialSamples />
        <footer className="text-muted-foreground border-border flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-xs">
          <span>Materiales web inspirados en Liquid Glass.</span>
          <a
            href="https://vgpu.sh/examples/typegpu-liquid-glass"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1 underline underline-offset-4"
          >
            Escena original: TypeGPU Liquid Glass{" "}
            <ArrowUpRight className="size-3" />
          </a>
        </footer>
      </main>
    </div>
  );
}
