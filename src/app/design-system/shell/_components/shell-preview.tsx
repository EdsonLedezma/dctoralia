"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, UserRound } from "lucide-react";
import {
  ProductShellView,
  type WorkspaceOption,
} from "~/components/shell/product-shell-view";
import { SegmentedControl } from "~/components/ui/segmented-control";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

const workspaces: WorkspaceOption[] = [
  {
    clinicId: "demo-reforma",
    name: "Consultorio Reforma",
    slug: "demo-reforma",
    plan: "PRO",
    membershipRole: "OWNER",
  },
  {
    clinicId: "demo-norte",
    name: "Consultorio Norte",
    slug: "demo-norte",
    plan: "PRO",
    membershipRole: "OWNER",
  },
];
const roles = [
  { value: "DOCTOR", label: "Doctor" },
  { value: "PATIENT", label: "Paciente" },
] as const;

export function ShellPreview() {
  const [role, setRole] = useState<"DOCTOR" | "PATIENT">("DOCTOR");
  const [clinic, setClinic] = useState("demo-reforma");
  const [notice, setNotice] = useState("");
  return (
    <ProductShellView
      role={role}
      pathname={
        role === "DOCTOR" ? "/dashboard/appointments" : "/patient/appointments"
      }
      displayName="Andrea Soto"
      workspaces={role === "DOCTOR" ? workspaces : []}
      activeClinicId={clinic}
      unreadCount={4}
      onWorkspaceSelect={setClinic}
      onSignOut={() =>
        setNotice("Vista de diseño: no hay una sesión de muestra que cerrar.")
      }
    >
      <div className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/design-system"
            className="text-muted-foreground inline-flex min-h-11 items-center gap-2 text-sm"
          >
            <ArrowLeft className="size-4" />
            Volver al laboratorio
          </Link>
          <SegmentedControl
            label="Rol de muestra"
            value={role}
            onValueChange={setRole}
            options={roles}
          />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">
            Vista de diseño · Datos ficticios
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
            Tu día, con espacio para cuidar.
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
            Prueba el colapso, la búsqueda, el consultorio y la navegación
            móvil. Los enlaces conservan sus destinos protegidos.
          </p>
        </div>
        {notice && (
          <p
            role="status"
            className="border-border bg-card rounded-xl border p-4 text-sm"
          >
            {notice}
          </p>
        )}
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <Card className="gap-0 overflow-hidden py-0">
            <div className="border-border flex items-center justify-between border-b px-6 py-5">
              <h2 className="font-semibold">La agenda, en orden.</h2>
              <CalendarDays className="text-muted-foreground size-5" />
            </div>
            {["09:30", "10:15", "11:00"].map((time, index) => (
              <div
                key={time}
                className="border-border mx-6 flex min-h-24 items-center gap-4 border-b last:border-0"
              >
                <span className="text-muted-foreground text-sm tabular-nums">
                  {time}
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    Consulta de muestra {index + 1}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Seguimiento · 45 minutos
                  </p>
                </div>
                <span className="text-muted-foreground ml-auto text-xs">
                  Confirmada
                </span>
              </div>
            ))}
          </Card>
          <Card className="self-start p-6">
            <span className="glass-bubble flex size-11 items-center justify-center">
              <UserRound className="size-5" />
            </span>
            <h2 className="font-semibold">Una navegación familiar.</h2>
            <p className="text-muted-foreground text-sm leading-6">
              Cada sección conserva su lugar. El cristal destaca la selección y
              deja espacio al contenido.
            </p>
            <Button asChild>
              <Link href="/design-system">Explorar controles</Link>
            </Button>
          </Card>
        </div>
      </div>
    </ProductShellView>
  );
}
