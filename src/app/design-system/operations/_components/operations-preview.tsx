"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SessionContext } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { observable } from "@trpc/server/observable";
import { api } from "~/trpc/react";
import { OperationsPreviewContext } from "~/components/operations/operations-shell";
import { Button } from "~/components/ui/button";
import { createOperationsFixture } from "./operations-fixture";

const Overview = dynamic(() =>
  import("~/components/operations/doctor-overview").then(
    (module) => module.DoctorOverview,
  ),
);
const Agenda = dynamic(() =>
  import("~/components/operations/doctor-agenda").then(
    (module) => module.DoctorAgenda,
  ),
);
const Patients = dynamic(() =>
  import("~/components/operations/patients-directory").then(
    (module) => module.PatientsDirectory,
  ),
);
const NewAppointment = dynamic(() =>
  import("~/components/operations/new-appointment").then(
    (module) => module.NewAppointment,
  ),
);
const NewPatient = dynamic(() =>
  import("~/components/operations/new-patient").then(
    (module) => module.NewPatient,
  ),
);
const PatientOverview = dynamic(() =>
  import("~/components/operations/patient-overview").then(
    (module) => module.PatientOverview,
  ),
);
const views = [
  {
    id: "patient-overview",
    label: "Inicio paciente",
    path: "/patient/dashboard",
  },
  { id: "overview", label: "Resumen", path: "/dashboard" },
  { id: "agenda", label: "Agenda", path: "/dashboard/appointments" },
  { id: "patients", label: "Pacientes", path: "/dashboard/patients" },
  {
    id: "new-appointment",
    label: "Nueva cita",
    path: "/dashboard/appointments/new",
  },
  {
    id: "new-patient",
    label: "Nuevo paciente",
    path: "/dashboard/patients/new",
  },
];
const doctorSession = {
  user: { id: "demo-doctor", name: "Elena Rivera", role: "DOCTOR" as const },
  expires: "2099-01-01T00:00:00Z",
};

export function OperationsPreview() {
  const params = useSearchParams();
  const view =
    views.find((item) => item.id === params.get("view")) ?? views[1]!;
  const scenario = params.get("scenario") ?? "ready";
  return (
    <LocalPreview
      key={`${view.id}:${scenario}`}
      view={view}
      scenario={scenario}
    />
  );
}

function LocalPreview({
  view,
  scenario,
}: {
  view: (typeof views)[number];
  scenario: string;
}) {
  const demoSession =
    view.id === "patient-overview"
      ? {
          user: {
            id: "demo-patient-user",
            name: "María López",
            role: "PATIENT" as const,
          },
          expires: "2099-01-01T00:00:00Z",
        }
      : doctorSession;
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );
  const [client] = useState(() => {
    const fixture = createOperationsFixture(
      scenario,
      view.id === "patient-overview",
    );
    return api.createClient({
      links: [
        () =>
          ({ op }) =>
            observable((observer) => {
              const timer = setTimeout(() => {
                observer.next({ result: { data: fixture(op.path, op.input) } });
                observer.complete();
              }, 120);
              return () => clearTimeout(timer);
            }),
      ],
    });
  });
  return (
    <SessionContext.Provider
      value={{
        data: demoSession,
        status: "authenticated",
        update: async () => demoSession,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <api.Provider client={client} queryClient={queryClient}>
          <OperationsPreviewContext.Provider value={view.path}>
            <div
              className="border-border bg-background relative z-20 flex flex-wrap items-center gap-2 border-b p-3 text-sm md:pl-72"
              data-operations-preview
            >
              <span className="text-muted-foreground mr-2">
                Diseño · Datos ficticios
              </span>
              {views.map((item) => (
                <Button
                  key={item.id}
                  asChild
                  variant={view.id === item.id ? "default" : "ghost"}
                >
                  <Link href={`?view=${item.id}&scenario=${scenario}`}>
                    {item.label}
                  </Link>
                </Button>
              ))}
              <Button asChild variant="ghost">
                <Link href="/design-system">Componentes</Link>
              </Button>
            </div>
            {view.id === "patient-overview" ? (
              <PatientOverview />
            ) : view.id === "overview" ? (
              <Overview />
            ) : view.id === "agenda" ? (
              <Agenda />
            ) : view.id === "patients" ? (
              <Patients />
            ) : view.id === "new-appointment" ? (
              <NewAppointment />
            ) : (
              <NewPatient />
            )}
          </OperationsPreviewContext.Provider>
        </api.Provider>
      </QueryClientProvider>
    </SessionContext.Provider>
  );
}
