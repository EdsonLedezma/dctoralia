"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PublicHeader } from "~/components/marketing/public-header";
import { SegmentedControl } from "~/components/ui/segmented-control";
import { DoctorsDirectory } from "~/components/doctors/doctors-directory";
import { discoveryDoctors } from "./discovery-data";
const options = [
  { value: "ready", label: "Resultados" },
  { value: "empty", label: "Vacío" },
  { value: "error", label: "Error" },
  { value: "loading", label: "Carga" },
] as const;
export function DiscoveryPreview() {
  const [state, setState] =
    useState<(typeof options)[number]["value"]>("ready");
  return (
    <>
      <PublicHeader />
      <main>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 pt-7 sm:px-8">
          <div>
            <Link
              href="/design-system"
              className="text-muted-foreground inline-flex min-h-11 items-center gap-2 text-sm"
            >
              <ArrowLeft className="size-4" />
              Volver al laboratorio
            </Link>
            <p className="text-muted-foreground mt-1 text-xs">
              Datos ficticios · Los enlaces abren destinos reales.
            </p>
          </div>
          <SegmentedControl
            label="Estado de muestra"
            options={options}
            value={state}
            onValueChange={setState}
            className="max-w-full flex-wrap"
          />
        </div>
        <DoctorsDirectory
          doctors={state === "ready" ? discoveryDoctors : []}
          loading={state === "loading"}
          error={state === "error"}
          onRetry={() => setState("ready")}
        />
      </main>
    </>
  );
}
