"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Search,
  Plus,
  Phone,
  MapPin,
  UserRound,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import DashboardWrapper from "../../../components/auth/DashboardWrapper";
import { ProductShell } from "~/components/shell/product-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";

gsap.registerPlugin(useGSAP);

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const pageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { data: patientsData, isLoading } = api.doctor.getMyPatients.useQuery(
    {},
  );
  const patients = patientsData?.result ?? [];
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("es");
  const filteredPatients = patients.filter((patient) => {
    const searchable = [
      patient.user.name,
      patient.phone,
      patient.address ?? "",
      patient.gender ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase("es");

    return searchable.includes(normalizedSearch);
  });

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.fromTo(
        "[data-page-intro]",
        { autoAlpha: 0, y: 6 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.18,
          stagger: 0.035,
          ease: "power2.out",
          clearProps: "all",
        },
      );
    },
    { scope: pageRef, dependencies: [reducedMotion], revertOnUpdate: true },
  );

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <main
          ref={pageRef}
          className="min-h-[calc(100dvh-3.5rem)] bg-[#fafafa] px-4 py-8 sm:px-8"
        >
          <div className="mx-auto max-w-6xl">
            <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div data-page-intro>
                <p className="mb-2 font-mono text-[11px] tracking-[0.08em] text-[#888] uppercase">
                  Consultorio
                </p>
                <h1 className="text-[26px] leading-8 font-semibold tracking-[-0.8px] text-[#171717]">
                  Pacientes
                </h1>
                <p className="mt-2 text-sm text-[#6b6b6b]">
                  Consulta y administra la información de tus pacientes.
                </p>
              </div>
              <div data-page-intro>
                <Link href="/dashboard/patients/new">
                  <Button className="h-9 rounded-md bg-[#171717] px-3 text-[13px] font-medium text-white hover:bg-[#333]">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Nuevo paciente
                  </Button>
                </Link>
              </div>
            </header>

            <section
              aria-labelledby="patients-list-title"
              className="overflow-hidden rounded-lg border border-[#ebebeb] bg-white"
            >
              <div className="flex flex-col gap-4 border-b border-[#ebebeb] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div data-page-intro>
                  <h2
                    id="patients-list-title"
                    className="text-sm font-medium text-[#171717]"
                  >
                    Directorio
                  </h2>
                  <p className="mt-1 text-xs text-[#888]">
                    {isLoading
                      ? "Cargando pacientes…"
                      : `${filteredPatients.length} ${filteredPatients.length === 1 ? "paciente" : "pacientes"}`}
                  </p>
                </div>
                <div data-page-intro className="relative w-full sm:max-w-xs">
                  <Search
                    aria-hidden="true"
                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#888]"
                  />
                  <Input
                    aria-label="Buscar pacientes"
                    placeholder="Buscar pacientes…"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="h-9 rounded-md border-[#ebebeb] bg-white pl-9 text-sm shadow-none placeholder:text-[#999] focus-visible:border-[#a1a1a1] focus-visible:ring-0"
                  />
                </div>
              </div>

              {patientsData?.error ? (
                <div
                  className="m-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  role="alert"
                >
                  No se pudo cargar la lista de pacientes.
                </div>
              ) : isLoading ? (
                <div className="space-y-3 p-5" aria-label="Cargando pacientes">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#ebebeb] bg-[#fafafa]">
                    <UserRound className="h-4 w-4 text-[#737373]" />
                  </div>
                  <p className="text-sm font-medium text-[#171717]">
                    {normalizedSearch
                      ? "No encontramos pacientes con esa búsqueda."
                      : "Todavía no hay pacientes."}
                  </p>
                  <p className="mt-1 text-sm text-[#737373]">
                    {normalizedSearch
                      ? "Prueba con otro nombre o teléfono."
                      : "Agrega un paciente para comenzar tu directorio."}
                  </p>
                </div>
              ) : (
                <Table className="min-w-[680px]">
                  <TableHeader>
                    <TableRow className="border-b border-[#ebebeb] bg-[#fafafa] hover:bg-[#fafafa]">
                      <TableHead className="h-10 px-5 text-[11px] font-medium tracking-[0.04em] text-[#737373] uppercase">
                        Paciente
                      </TableHead>
                      <TableHead className="h-10 text-[11px] font-medium tracking-[0.04em] text-[#737373] uppercase">
                        Teléfono
                      </TableHead>
                      <TableHead className="h-10 text-[11px] font-medium tracking-[0.04em] text-[#737373] uppercase">
                        Género
                      </TableHead>
                      <TableHead className="h-10 text-[11px] font-medium tracking-[0.04em] text-[#737373] uppercase">
                        Domicilio
                      </TableHead>
                      <TableHead className="h-10 px-5 text-[11px] font-medium tracking-[0.04em] text-[#737373] uppercase">
                        Nacimiento
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence initial={false} mode="popLayout">
                      {filteredPatients.map((patient, index) => (
                        <motion.tr
                          key={patient.id}
                          layout={!reducedMotion}
                          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={
                            reducedMotion ? undefined : { opacity: 0, y: -3 }
                          }
                          transition={{
                            duration: reducedMotion ? 0 : 0.14,
                            ease: [0.23, 1, 0.32, 1],
                            delay: reducedMotion
                              ? 0
                              : Math.min(index * 0.018, 0.09),
                          }}
                          className="border-b border-[#ebebeb] transition-colors hover:bg-[#fafafa]"
                        >
                          <TableCell className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ebebeb] bg-[#f5f5f5] text-[11px] font-medium text-[#525252]">
                                {patient.user.name
                                  .split(/\s+/)
                                  .slice(0, 2)
                                  .map((part) => part[0])
                                  .join("")
                                  .toLocaleUpperCase("es")}
                              </span>
                              <span className="font-medium text-[#171717]">
                                {patient.user.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-[#525252]">
                            <span className="inline-flex items-center gap-2">
                              <Phone
                                aria-hidden="true"
                                className="h-3.5 w-3.5 text-[#888]"
                              />
                              {patient.phone || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-[#525252]">
                            {patient.gender || "—"}
                          </TableCell>
                          <TableCell className="max-w-64 truncate text-[#737373]">
                            {patient.address ? (
                              <span className="inline-flex items-center gap-2">
                                <MapPin
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5 shrink-0 text-[#888]"
                                />
                                <span className="truncate">
                                  {patient.address}
                                </span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="px-5 text-[#737373]">
                            {patient.birthDate ? (
                              <span className="inline-flex items-center gap-2">
                                <CalendarDays
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5 text-[#888]"
                                />
                                {new Date(patient.birthDate).toLocaleDateString(
                                  "es-MX",
                                  { dateStyle: "medium", timeZone: "UTC" },
                                )}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
            </section>
          </div>
        </main>
      </ProductShell>
    </DashboardWrapper>
  );
}
