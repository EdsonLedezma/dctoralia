import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  FileHeart,
  FileText,
  HeartPulse,
  LogIn,
  MessageSquareText,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

import { DopilotBrand } from "~/components/brand/dopilot-brand";
import { DopilotHeroBackground } from "~/components/liquid-glass/dopilot-hero-background";
import { GlassSurface } from "~/components/liquid-glass/glass-surface";
import { LandingReveal } from "~/components/marketing/landing-reveal";
import { AppearanceMenu } from "~/components/shared/appearance-menu";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

const capabilities = [
  {
    icon: CalendarDays,
    eyebrow: "01 · Agenda",
    title: "Tu jornada, siempre clara.",
    description:
      "Organiza servicios, horarios y citas desde una agenda pensada para el trabajo diario del consultorio.",
    points: ["Vista por día o semana", "Disponibilidad por servicio"],
  },
  {
    icon: FileHeart,
    eyebrow: "02 · Expediente",
    title: "Cada consulta con contexto.",
    description:
      "Reúne notas profesionales, episodios, recetas, documentos y mediciones en el recorrido clínico de cada paciente.",
    points: ["Notas y recetas vinculadas", "Documentos y resultados"],
  },
  {
    icon: ClipboardList,
    eyebrow: "03 · Seguimiento",
    title: "El siguiente paso no se pierde.",
    description:
      "Convierte una indicación en una tarea con responsable y fecha para mantener continuidad entre consultas.",
    points: ["Pendientes por paciente", "Fechas y estado visibles"],
  },
  {
    icon: Users,
    eyebrow: "04 · Consultorio",
    title: "Un equipo en el mismo espacio.",
    description:
      "Administra profesionales, ubicaciones y servicios desde un espacio de trabajo compartido.",
    points: ["Miembros y permisos", "Servicios y ubicaciones"],
  },
];

const workflow = [
  {
    number: "01",
    icon: CalendarDays,
    title: "Prepara la consulta",
    description:
      "Consulta la agenda, revisa quién viene y abre su expediente desde la cita.",
  },
  {
    number: "02",
    icon: FileText,
    title: "Documenta con calma",
    description:
      "Registra la consulta y deja diferenciados los borradores, las notas firmadas y las recetas.",
  },
  {
    number: "03",
    icon: Check,
    title: "Mantén la continuidad",
    description:
      "Deja tareas de seguimiento y encuentra después su estado en la ficha del paciente.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <header className="border-border bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b backdrop-blur-2xl">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center" aria-label="Dopilot, inicio">
            <DopilotBrand />
          </Link>
          <nav
            className="flex items-center gap-1.5 sm:gap-2"
            aria-label="Navegación principal"
          >
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="size-11 px-0 sm:w-auto sm:px-3"
            >
              <Link href="/login" aria-label="Iniciar sesión">
                <LogIn className="size-4 sm:hidden" />
                <span className="hidden sm:inline">Iniciar sesión</span>
              </Link>
            </Button>
            <Button asChild size="sm" backdrop="content">
              <Link href="/register">Crear cuenta</Link>
            </Button>
            <AppearanceMenu />
          </nav>
        </div>
      </header>

      <main>
        <LandingReveal>
          <section className="border-border bg-background relative isolate overflow-hidden border-b px-5 pt-8 pb-20 sm:px-6 sm:pt-10 sm:pb-28">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-[radial-gradient(ellipse_at_50%_20%,var(--muted),transparent_68%)] opacity-70"
            />
            <DopilotHeroBackground />
            <div className="relative z-10 mx-auto max-w-4xl text-center">
              <GlassSurface
                backdrop="content"
                className="mx-auto mb-6 w-fit"
                contentClassName="px-4 py-2 text-xs font-medium"
              >
                Tecnología para cuidar mejor tu consulta.
              </GlassSurface>
              <h1
                data-reveal="hero"
                className="text-4xl leading-[1.02] font-semibold tracking-[-0.065em] text-balance sm:text-6xl md:text-7xl"
              >
                Menos coordinación.
                <br className="hidden sm:block" /> Más tiempo para cuidar.
              </h1>
              <p
                data-reveal="hero"
                className="text-muted-foreground mx-auto mt-6 max-w-2xl text-base leading-7 text-balance sm:text-lg sm:leading-8"
              >
                Agenda, expediente clínico y seguimiento conectados en un mismo
                lugar para que tu consultorio avance con claridad.
              </p>
              <div
                data-reveal="hero"
                className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"
              >
                <Button asChild size="lg" className="group h-12 px-7">
                  <Link href="/register">
                    Comenzar gratis
                    <ArrowRight className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-7">
                  <Link href="/patient/doctors">Explorar doctores</Link>
                </Button>
              </div>
              <p
                data-reveal="hero"
                className="text-muted-foreground mt-4 text-xs"
              >
                Agenda · pacientes · continuidad clínica
              </p>
            </div>
            <a
              href="#funcionalidades"
              className="text-muted-foreground hover:text-foreground mx-auto mt-10 flex min-h-11 w-fit items-center gap-2 text-sm transition-colors"
            >
              Conoce Dopilot <ArrowRight className="size-4 rotate-90" />
            </a>
          </section>

          <section
            id="funcionalidades"
            className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:px-6 sm:py-28"
          >
            <div className="mb-10 grid gap-4 md:mb-12 md:grid-cols-[1fr_0.7fr] md:items-end">
              <div className="max-w-2xl">
                <p data-reveal className="text-muted-foreground text-sm">
                  Todo el consultorio, conectado
                </p>
                <h2
                  data-reveal
                  className="mt-3 text-3xl leading-tight font-semibold tracking-[-0.05em] text-balance sm:text-4xl"
                >
                  Lo importante de tu práctica, en su lugar.
                </h2>
              </div>
              <p
                data-reveal
                className="text-muted-foreground max-w-lg leading-7 md:justify-self-end"
              >
                De la primera cita al seguimiento posterior: cada herramienta
                está cerca del momento en que la necesitas.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map(({ icon: Icon, eyebrow, title, description, points }) => (
                <Card
                  key={eyebrow}
                  data-reveal
                  className="border-border gap-0 rounded-[24px] p-0 transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg"
                >
                  <CardHeader className="gap-5 p-5 sm:p-7">
                    <div className="flex items-center justify-between gap-3">
                      <span className="bg-muted flex size-11 items-center justify-center rounded-2xl">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {eyebrow}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-xl tracking-[-0.035em] sm:text-2xl">
                        {title}
                      </CardTitle>
                      <CardDescription className="mt-2 max-w-lg text-sm leading-6">
                        {description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="border-border text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 border-t px-5 py-4 text-xs sm:px-7">
                    {points.map((point) => (
                      <span key={point} className="inline-flex items-center gap-2">
                        <span className="bg-foreground size-1 rounded-full" />
                        {point}
                      </span>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="border-border border-y bg-foreground text-background px-5 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16">
              <div>
                <p data-reveal className="text-background/65 text-sm">
                  Un recorrido, sin perder el hilo
                </p>
                <h2
                  data-reveal
                  className="mt-3 text-3xl leading-tight font-semibold tracking-[-0.05em] text-balance sm:text-4xl"
                >
                  De la agenda al seguimiento, con contexto.
                </h2>
                <p
                  data-reveal
                  className="text-background/75 mt-5 max-w-lg leading-7"
                >
                  La información y las herramientas acompañan el trabajo del
                  profesional antes, durante y después de cada consulta.
                </p>
              </div>
              <div
                data-reveal
                className="border-background/15 bg-background/5 overflow-hidden rounded-[28px] border p-4 sm:p-6"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-background/60 text-xs">
                      Vista ilustrativa
                    </p>
                    <h3 className="mt-1 text-lg font-semibold tracking-tight">
                      Una jornada en orden
                    </h3>
                  </div>
                  <CalendarDays className="text-background/75 size-5" />
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                  <div className="border-background/15 bg-background/10 rounded-2xl border p-4">
                    <p className="text-background/65 text-xs">Agenda de hoy</p>
                    <div className="mt-4 space-y-3">
                      <PreviewAppointment time="09:00" label="Consulta" />
                      <PreviewAppointment time="10:30" label="Seguimiento" />
                      <PreviewAppointment time="12:00" label="Consulta" />
                    </div>
                  </div>
                  <div className="text-background/50 hidden items-center sm:flex">
                    <ArrowRight className="size-5" />
                  </div>
                  <div className="border-background/15 bg-background/10 rounded-2xl border p-4">
                    <p className="text-background/65 text-xs">Continuidad</p>
                    <div className="mt-4 space-y-3">
                      <PreviewTask icon={FileText} label="Nota de consulta" />
                      <PreviewTask icon={MessageSquareText} label="Seguimiento" />
                      <PreviewTask icon={ShieldCheck} label="Acceso autorizado" />
                    </div>
                  </div>
                </div>
                <p className="text-background/55 mt-4 text-xs leading-5">
                  La ilustración muestra el recorrido del producto; no contiene
                  información de pacientes.
                </p>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
            <div className="mb-10 max-w-2xl">
              <p data-reveal className="text-muted-foreground text-sm">
                Para quienes participan en la atención
              </p>
              <h2
                data-reveal
                className="mt-3 text-3xl leading-tight font-semibold tracking-[-0.05em] text-balance sm:text-4xl"
              >
                Una experiencia clara para el equipo y sus pacientes.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card data-reveal className="border-border rounded-[24px] p-0">
                <CardHeader className="gap-5 p-6 sm:p-8">
                  <span className="bg-muted flex size-12 items-center justify-center rounded-2xl">
                    <Stethoscope className="size-5" />
                  </span>
                  <div>
                    <CardTitle className="text-xl tracking-tight">
                      Para el profesional
                    </CardTitle>
                    <CardDescription className="mt-2 text-sm leading-6">
                      Administra la agenda, abre expedientes, documenta consultas,
                      emite recetas y organiza las tareas que siguen.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="border-border text-muted-foreground grid gap-3 border-t px-6 py-5 text-sm sm:grid-cols-2 sm:px-8">
                  <CapabilityLine icon={CalendarDays} text="Agenda y servicios" />
                  <CapabilityLine icon={FileHeart} text="Expedientes clínicos" />
                  <CapabilityLine icon={ClipboardList} text="Tareas de seguimiento" />
                  <CapabilityLine icon={Activity} text="Mediciones y resultados" />
                </CardContent>
              </Card>
              <Card data-reveal className="border-border rounded-[24px] p-0">
                <CardHeader className="gap-5 p-6 sm:p-8">
                  <span className="bg-muted flex size-12 items-center justify-center rounded-2xl">
                    <HeartPulse className="size-5" />
                  </span>
                  <div>
                    <CardTitle className="text-xl tracking-tight">
                      Para el paciente
                    </CardTitle>
                    <CardDescription className="mt-2 text-sm leading-6">
                      Encuentra profesionales, administra sus citas y consulta la
                      información clínica que el equipo comparte.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="border-border text-muted-foreground grid gap-3 border-t px-6 py-5 text-sm sm:grid-cols-2 sm:px-8">
                  <CapabilityLine icon={Users} text="Buscar profesionales" />
                  <CapabilityLine icon={CalendarDays} text="Consultar sus citas" />
                  <CapabilityLine icon={FileText} text="Historial compartido" />
                  <CapabilityLine icon={MessageSquareText} text="Avisos y preferencias" />
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="border-border border-t px-5 py-20 text-center sm:px-6 sm:py-28">
            <div className="mx-auto max-w-2xl">
              <GlassSurface
                backdrop="content"
                className="mx-auto mb-6 w-fit"
                contentClassName="px-4 py-2 text-xs font-medium"
              >
                Una práctica más ordenada empieza aquí.
              </GlassSurface>
              <h2
                data-reveal
                className="text-3xl leading-tight font-semibold tracking-[-0.05em] text-balance sm:text-4xl"
              >
                Más claridad para tu equipo. Más continuidad para tus pacientes.
              </h2>
              <p
                data-reveal
                className="text-muted-foreground mx-auto mt-4 max-w-xl leading-7"
              >
                Crea el espacio de tu consultorio y conoce una manera más
                tranquila de organizar la atención.
              </p>
              <div data-reveal className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="group h-12 px-7">
                  <Link href="/register">
                    Crear mi consultorio
                    <ArrowRight className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-7">
                  <Link href="/patient/doctors">Buscar un doctor</Link>
                </Button>
              </div>
            </div>
          </section>
        </LandingReveal>
      </main>

      <footer className="border-border bg-card border-t px-5 py-7 sm:px-6">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Dopilot</span>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <span>Agenda</span>
            <span>Expedientes</span>
            <span>Seguimiento</span>
          </div>
          <Link href="/login" className="min-h-11 inline-flex items-center hover:text-foreground">
            Iniciar sesión
          </Link>
        </div>
      </footer>
    </div>
  );
}

function PreviewAppointment({ time, label }: { time: string; label: string }) {
  return (
    <div className="border-background/10 flex items-center gap-3 border-b pb-3 last:border-0 last:pb-0">
      <span className="text-background/75 w-12 font-mono text-xs tabular-nums">
        {time}
      </span>
      <span className="bg-background/15 size-1.5 rounded-full" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function PreviewTask({
  icon: Icon,
  label,
}: {
  icon: typeof FileText;
  label: string;
}) {
  return (
    <div className="border-background/10 flex items-center gap-3 rounded-xl border px-3 py-2.5">
      <Icon className="text-background/70 size-4 shrink-0" aria-hidden="true" />
      <span className="text-sm">{label}</span>
      <Check className="text-background/55 ml-auto size-3.5" aria-hidden="true" />
    </div>
  );
}

function CapabilityLine({
  icon: Icon,
  text,
}: {
  icon: typeof FileText;
  text: string;
}) {
  return (
    <span className="flex min-h-10 items-center gap-2.5">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {text}
    </span>
  );
}
