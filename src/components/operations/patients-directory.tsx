"use client";

import { useState } from "react";
import { ChevronRight, Plus, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { OperationsShell } from "./operations-shell";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

export function PatientsDirectory() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } =
    api.doctor.getMyPatients.useQuery({});
  const patients = data?.result ?? [];
  const query = normalize(search.trim());
  const filtered = patients.filter((patient) =>
    normalize(
      [
        patient.user.name,
        patient.phone,
        patient.user.email,
        patient.address,
      ].join(" "),
    ).includes(query),
  );

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <OperationsShell>
        <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-8 sm:py-10">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Tu consultorio</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Pacientes
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Un lugar para encontrar a tus pacientes y continuar su atención.
              </p>
            </div>
            <Button asChild className="self-start">
              <Link href="/dashboard/patients/new">
                <Plus className="size-4" />
                Nuevo paciente
              </Link>
            </Button>
          </header>
          <Card className="gap-0 overflow-hidden py-0">
            <div className="border-border flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Directorio de pacientes</h2>
                <p
                  className="text-muted-foreground mt-1 text-sm"
                  aria-live="polite"
                >
                  {isLoading
                    ? "Cargando pacientes…"
                    : isError || data?.error
                      ? "Lista sin actualizar"
                      : `${filtered.length} ${filtered.length === 1 ? "paciente" : "pacientes"}`}
                </p>
              </div>
              <div className="relative w-full sm:max-w-sm">
                <Search
                  aria-hidden
                  className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2"
                />
                <Input
                  aria-label="Buscar pacientes"
                  placeholder="Nombre, correo o teléfono"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-11 rounded-full pl-11"
                />
              </div>
            </div>
            {isError || data?.error ? (
              <div role="alert" className="space-y-4 p-6">
                <p>
                  No pudimos cargar tus pacientes. Puedes volver a intentarlo.
                </p>
                <Button variant="outline" onClick={() => void refetch()}>
                  Reintentar pacientes
                </Button>
              </div>
            ) : isLoading ? (
              <div aria-label="Cargando pacientes" className="space-y-3 p-5">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-20 rounded-2xl" />
                ))}
              </div>
            ) : !filtered.length ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <UsersRound
                  aria-hidden
                  className="text-muted-foreground mb-4 size-7"
                />
                <h3 className="font-semibold">
                  {query
                    ? "Sin resultados para esta búsqueda"
                    : "Tu directorio empieza aquí"}
                </h3>
                <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                  {query
                    ? "Prueba con otro nombre, correo o teléfono."
                    : "Registra a tu primer paciente para continuar su atención desde su expediente."}
                </p>
                {query ? (
                  <Button
                    variant="outline"
                    className="mt-5"
                    onClick={() => setSearch("")}
                  >
                    Limpiar búsqueda
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="mt-5">
                    <Link href="/dashboard/patients/new">
                      Registrar paciente
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <ul className="divide-border divide-y">
                {filtered.map((patient) => (
                  <li key={patient.id}>
                    <Link
                      href={`/dashboard/patients/${patient.id}`}
                      className="hover:bg-accent/50 focus-visible:outline-ring flex min-h-24 items-center gap-4 px-5 py-4 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
                    >
                      <span
                        aria-hidden
                        className="border-border bg-muted flex size-11 shrink-0 items-center justify-center rounded-full border text-sm font-medium"
                      >
                        {patient.user.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toLocaleUpperCase("es")}
                      </span>
                      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1.3fr_1fr_1fr] sm:items-center sm:gap-5">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {patient.user.name}
                          </p>
                          <p className="text-muted-foreground mt-1 truncate text-sm">
                            {patient.user.email}
                          </p>
                        </div>
                        <div className="min-w-0 text-sm">
                          <p className="truncate tabular-nums">
                            {patient.phone || "Sin teléfono"}
                          </p>
                          <p className="text-muted-foreground mt-1 truncate">
                            {patient.address || "Sin domicilio registrado"}
                          </p>
                        </div>
                        <div className="hidden text-sm sm:block">
                          <p className="text-muted-foreground">
                            Fecha de nacimiento
                          </p>
                          <p className="mt-1">
                            {patient.birthDate
                              ? new Intl.DateTimeFormat("es-MX", {
                                  dateStyle: "medium",
                                  timeZone: "UTC",
                                }).format(new Date(patient.birthDate))
                              : "Sin registrar"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        aria-hidden
                        className="text-muted-foreground size-4 shrink-0"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </main>
      </OperationsShell>
    </DashboardWrapper>
  );
}
