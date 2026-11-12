"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { useCompactOverlay } from "~/hooks/use-compact-overlay";
import { DoctorCard } from "./doctor-card";
import {
  defaultDirectoryFilters,
  directoryFilterQuery,
  filterDirectory,
  readDirectoryFilters,
  specialtyLabel,
  type DirectoryDoctor,
  type DirectoryFilters,
} from "./directory-model";
import type { MapDoctor } from "./doctor-locations-map";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";

const DoctorsMap = dynamic(
  () => import("./doctor-locations-map").then((module) => module.DoctorsMap),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="text-muted-foreground p-6 text-sm">
        Cargando mapa…
      </p>
    ),
  },
);
function DirectorySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-full sm:w-auto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([id, title]) => (
          <SelectItem key={id} value={id}>
            {title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
const sorting = [
  ["rating", "Mejor calificados"],
  ["availability", "Próxima disponibilidad"],
  ["price", "Precio menor"],
  ["experience", "Más experiencia"],
  ["reviews", "Más reseñas"],
] as const;

export function DoctorsDirectory({
  doctors,
  loading = false,
  error = false,
  onRetry,
}: {
  doctors: readonly DirectoryDoctor[];
  loading?: boolean;
  error?: boolean;
  onRetry: () => void;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const filters = readDirectoryFilters(new URLSearchParams(params.toString()));
  const update = (patch: Partial<DirectoryFilters>) => {
    const query = directoryFilterQuery({ ...filters, ...patch });
    window.history.replaceState(
      null,
      "",
      `${pathname}${query ? `?${query}` : ""}`,
    );
  };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const compact = useCompactOverlay();
  const sorted = filterDirectory(doctors, filters);
  const specialties = [
    ...new Set([
      ...doctors.map((doctor) => doctor.specialty),
      ...(filters.specialty !== "all" ? [filters.specialty] : []),
    ]),
  ]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es-MX"));
  const cities = [
    ...new Set([
      ...doctors
        .map((doctor) => doctor.city)
        .filter((city): city is string => Boolean(city)),
      ...(filters.city !== "all" ? [filters.city] : []),
    ]),
  ].sort((a, b) => a.localeCompare(b, "es-MX"));
  const locations = sorted.flatMap<MapDoctor>((doctor) =>
    typeof doctor.latitude === "number" &&
    typeof doctor.longitude === "number" &&
    Number.isFinite(doctor.latitude) &&
    Number.isFinite(doctor.longitude) &&
    doctor.latitude >= 14 &&
    doctor.latitude <= 33.5 &&
    doctor.longitude >= -118 &&
    doctor.longitude <= -86
      ? [
          {
            id: doctor.id,
            name: doctor.user?.name ?? "Profesional de salud",
            specialty: specialtyLabel(doctor.specialty),
            city: doctor.city ?? "",
            state: doctor.state ?? "",
            address: doctor.address ?? "",
            googleMapsUrl: doctor.googleMapsUrl ?? "",
            latitude: doctor.latitude,
            longitude: doctor.longitude,
          },
        ]
      : [],
  );
  const count =
    Number(filters.specialty !== "all") + Number(filters.city !== "all");
  const hasFilters = Boolean(
    filters.search || count || filters.sort !== "rating",
  );
  const controls = (
    <>
      <DirectorySelect
        label="Filtrar por especialidad"
        value={filters.specialty}
        options={[
          ["all", "Todas las especialidades"],
          ...specialties.map(
            (value) => [value, specialtyLabel(value)] as const,
          ),
        ]}
        onChange={(value) => update({ specialty: value })}
      />
      <DirectorySelect
        label="Filtrar por ciudad"
        value={filters.city}
        options={[
          ["all", "Todas las ciudades"],
          ...cities.map((value) => [value, value] as const),
        ]}
        onChange={(value) => update({ city: value })}
      />
      <DirectorySelect
        label="Ordenar resultados"
        value={filters.sort}
        options={sorting}
        onChange={(value) =>
          update({
            sort: readDirectoryFilters(new URLSearchParams({ sort: value }))
              .sort,
          })
        }
      />
    </>
  );
  const query = directoryFilterQuery(filters);
  const directoryHref = `/patient/doctors${query ? `?${query}` : ""}`;
  return (
    <div className="bg-background text-foreground min-h-dvh px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-7">
        <div>
          <p className="text-muted-foreground text-xs">Encuentra atención</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
            Un profesional para tu próxima consulta.
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
            Compara especialidad, ubicación y disponibilidad antes de reservar.
          </p>
        </div>
        <div role="search" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                aria-label="Buscar doctor, especialidad o ciudad"
                placeholder="Doctor, especialidad o ciudad"
                value={filters.search}
                onChange={(event) => update({ search: event.target.value })}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              className="shrink-0 sm:hidden"
              onClick={() => setFiltersOpen(true)}
              aria-label={count ? `Filtros, ${count} activos` : "Abrir filtros"}
            >
              <SlidersHorizontal />
              {count > 0 && <span>{count}</span>}
            </Button>
            <Button
              variant="outline"
              className="shrink-0"
              disabled={!locations.length}
              onClick={() => setMapOpen(true)}
              aria-label={`Ver mapa con ${locations.length} ubicaciones`}
            >
              <MapPin />
              <span className="hidden sm:inline">Ver mapa</span>
            </Button>
          </div>
          <div className="hidden flex-wrap gap-3 sm:flex">{controls}</div>
        </div>
        <div className="border-border flex min-h-11 items-center justify-between gap-3 border-b pb-3">
          <p aria-live="polite" className="text-muted-foreground text-sm">
            {loading
              ? "Buscando doctores…"
              : error && doctors.length === 0
                ? "Resultados no disponibles"
                : `${sorted.length} ${sorted.length === 1 ? "profesional encontrado" : "profesionales encontrados"}`}
          </p>
          {hasFilters && (
            <Button
              variant="ghost"
              onClick={() => update(defaultDirectoryFilters)}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
        {error && (
          <Card role="alert" className="gap-3 p-6">
            <h2 className="font-semibold">
              No pudimos actualizar los doctores.
            </h2>
            <p className="text-muted-foreground text-sm">
              {doctors.length
                ? "Mostramos los últimos resultados disponibles."
                : "Revisa tu conexión e intenta de nuevo."}
            </p>
            <Button className="w-fit" variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          </Card>
        )}
        {loading ? (
          <div
            role="status"
            aria-label="Cargando resultados"
            className="grid gap-5"
          >
            {[0, 1, 2].map((index) => (
              <Card key={index} className="p-6">
                <div className="flex gap-4">
                  <Skeleton className="size-14 shrink-0 rounded-full" />
                  <div className="w-full space-y-3">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-5">
            {sorted.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                directoryHref={directoryHref}
              />
            ))}
          </div>
        )}
        {!loading && !error && sorted.length === 0 && (
          <Card className="items-center gap-3 p-8 text-center">
            <Search className="text-muted-foreground size-7" />
            <h2 className="text-lg font-semibold">
              No encontramos profesionales con estos filtros.
            </h2>
            <p className="text-muted-foreground max-w-md text-sm leading-6">
              Prueba con otra ciudad o especialidad para ampliar los resultados.
            </p>
            {hasFilters && (
              <Button
                variant="outline"
                onClick={() => update(defaultDirectoryFilters)}
              >
                Mostrar todos
              </Button>
            )}
          </Card>
        )}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent
            side="bottom"
            className="gap-5 rounded-t-[28px] px-5 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <SheetHeader className="p-0 pr-12">
              <SheetTitle>Filtrar doctores</SheetTitle>
              <SheetDescription>
                Especialidad, ciudad y orden de los resultados.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4">{controls}</div>
            <SheetFooter className="p-0">
              <Button onClick={() => setFiltersOpen(false)}>
                Ver {sorted.length} resultados
              </Button>
              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={() => update(defaultDirectoryFilters)}
                >
                  Limpiar filtros
                </Button>
              )}
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Sheet open={mapOpen} onOpenChange={setMapOpen}>
          <SheetContent
            side={compact ? "bottom" : "right"}
            className="gap-4 rounded-t-[28px] px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-2xl sm:rounded-l-[28px] sm:rounded-tr-none"
          >
            <SheetHeader className="p-0 pr-12">
              <SheetTitle>Mapa de consultorios</SheetTitle>
              <SheetDescription>
                Ubicaciones de los resultados de tu búsqueda.
              </SheetDescription>
            </SheetHeader>
            {mapOpen && <DoctorsMap doctors={locations} />}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
