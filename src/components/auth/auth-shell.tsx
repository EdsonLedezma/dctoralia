import { DopilotBrand } from "~/components/brand/dopilot-brand";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Stethoscope, Users } from "lucide-react";
import { AppearanceSwitcher } from "~/components/shared/appearance-switcher";
import { GlassSurface } from "~/components/liquid-glass/glass-surface";
import { Card } from "~/components/ui/card";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="focus-visible:outline-ring inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <ArrowLeft className="size-4" />
          <DopilotBrand />
        </Link>
        <AppearanceSwitcher />
      </header>
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-14 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-2">
        <aside
          className="hidden max-w-md space-y-8 lg:block"
          aria-label="Una consulta más simple"
        >
          <span className="glass-bubble inline-flex size-14 items-center justify-center">
            <Stethoscope className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-5xl leading-[1.08] font-semibold tracking-[-0.045em]">
              Más claridad.
              <br />
              Más tiempo para cuidar.
            </h2>
            <p className="text-muted-foreground mt-5 max-w-sm text-base leading-7">
              Tu agenda, tus pacientes y el contexto que necesitas para cada
              consulta.
            </p>
          </div>
          <GlassSurface contentClassName="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <CalendarDays className="text-muted-foreground size-5" />
              <div>
                <p className="text-sm font-semibold">Un día en orden</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Citas y disponibilidad en un mismo lugar.
                </p>
              </div>
            </div>
            <div className="border-border border-t" />
            <div className="flex items-center gap-3">
              <Users className="text-muted-foreground size-5" />
              <div>
                <p className="text-sm font-semibold">
                  Cada persona, en contexto
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Información para dar continuidad al cuidado.
                </p>
              </div>
            </div>
          </GlassSurface>
        </aside>
        <Card className="mx-auto w-full max-w-[460px] gap-6 p-6 sm:p-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.035em]">
              {title}
            </h1>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              {description}
            </p>
          </div>
          {children}
        </Card>
      </main>
      <footer className="text-muted-foreground px-5 py-6 text-center text-xs">
        Dopilot · Tu consulta, en calma.
      </footer>
    </div>
  );
}

export function AuthFormLoading() {
  return (
    <div
      role="status"
      aria-label="Cargando formulario"
      className="space-y-5 py-4"
    >
      <div className="bg-muted h-11 animate-pulse rounded-xl motion-reduce:animate-none" />
      <div className="bg-muted h-11 animate-pulse rounded-xl motion-reduce:animate-none" />
    </div>
  );
}
