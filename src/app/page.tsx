import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  Clock3,
  MessageSquareText,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { LandingReveal } from "~/components/marketing/landing-reveal";

const features = [
  {
    icon: Calendar,
    title: "Agenda que entiende tu jornada",
    description:
      "Servicios, duración y horarios se coordinan para evitar dobles reservas.",
  },
  {
    icon: MessageSquareText,
    title: "Automatizaciones que sí ayudan",
    description:
      "Confirmaciones y recordatorios listos para conectarse con Sent cuando decidas activarlos.",
  },
  {
    icon: Users,
    title: "Pacientes en contexto",
    description:
      "Una vista clara de citas, notas y seguimiento para que la consulta empiece mejor.",
  },
];

const darkMetrics: Array<{ icon: LucideIcon; label: string; detail: string }> =
  [
    { icon: Clock3, label: "Horarios", detail: "Disponibilidad real" },
    { icon: ShieldCheck, label: "Confianza", detail: "Acceso por rol" },
    { icon: BarChart3, label: "Claridad", detail: "Métricas accionables" },
  ];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#171717]">
      <header className="sticky top-0 z-20 border-b border-[#ebebeb] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Dctoralia, inicio"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#171717] text-white">
              <Activity className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-[-0.03em]">Dctoralia</span>
          </Link>
          <nav
            className="flex items-center gap-2"
            aria-label="Navegación principal"
          >
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Crear cuenta</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <LandingReveal>
          <section className="relative isolate overflow-hidden border-b border-[#ebebeb] bg-white px-6 py-24 sm:py-32">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] opacity-70 [background:radial-gradient(circle_at_20%_10%,#dbeafe,transparent_34%),radial-gradient(circle_at_75%_0%,#ede9fe,transparent_32%),radial-gradient(circle_at_55%_45%,#fce7f3,transparent_28%)]"
            />
            <div className="mx-auto max-w-4xl text-center">
              <p
                data-reveal="hero"
                className="mb-5 font-mono text-[11px] tracking-[0.14em] text-[#6b6b6b] uppercase"
              >
                Plataforma operativa para consultorios.
              </p>
              <h1
                data-reveal="hero"
                className="text-5xl font-semibold tracking-[-0.065em] text-balance sm:text-7xl"
              >
                Menos coordinación. Más tiempo para cuidar.
              </h1>
              <p
                data-reveal="hero"
                className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#4d4d4d] sm:text-xl"
              >
                Dctoralia reúne agenda, pacientes y automatizaciones en una
                experiencia precisa para tu consultorio.
              </p>
              <div
                data-reveal="hero"
                className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"
              >
                <Link href="/register">
                  <Button size="lg" className="group h-12 rounded-full px-7">
                    Comenzar gratis
                    <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                  </Button>
                </Link>
                <Link href="/patient/doctors">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-full px-7"
                  >
                    Explorar un perfil
                  </Button>
                </Link>
              </div>
              <p
                data-reveal="hero"
                className="mt-4 font-mono text-xs text-[#888]"
              >
                Sin tarjeta · Configuración en minutos
              </p>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="mb-10 max-w-2xl">
              <p
                data-reveal
                className="font-mono text-[11px] tracking-[0.14em] text-[#888] uppercase"
              >
                El sistema completo.
              </p>
              <h2
                data-reveal
                className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl"
              >
                Cada parte de tu operación, en una sola vista.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <Card
                  key={title}
                  data-reveal
                  className="gap-4 border-[#ebebeb] p-2 transition-[border-color,transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:border-[#d4d4d4] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
                >
                  <CardHeader className="gap-4 p-5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#f5f5f5]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <CardTitle className="text-lg tracking-[-0.025em]">
                      {title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-6">
                      {description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>

          <section className="border-y border-[#ebebeb] bg-[#171717] px-6 py-20 text-white sm:py-24">
            <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <p
                  data-reveal
                  className="font-mono text-[11px] tracking-[0.14em] text-[#a3a3a3] uppercase"
                >
                  Diseñado para crecer.
                </p>
                <h2
                  data-reveal
                  className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl"
                >
                  Automatiza lo repetitivo sin perder el control.
                </h2>
                <p
                  data-reveal
                  className="mt-5 max-w-xl leading-7 text-[#b8b8b8]"
                >
                  Empieza con agenda y confirmaciones. Más adelante, Sent y los
                  agentes de voz podrán operar sobre las mismas reglas seguras.
                </p>
              </div>
              <div
                data-reveal
                className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-3"
              >
                {darkMetrics.map(({ icon: Icon, label, detail }) => (
                  <div key={label} className="bg-[#202020] p-5">
                    <Icon className="mb-8 h-4 w-4 text-[#c7c7c7]" />
                    <p className="font-medium">{label}</p>
                    <p className="mt-1 text-sm text-[#929292]">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-6 py-20 text-center sm:py-24">
            <h2
              data-reveal
              className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl"
            >
              Tu siguiente cita puede empezar aquí.
            </h2>
            <p data-reveal className="mx-auto mt-4 max-w-xl text-[#6b6b6b]">
              Construye una operación más tranquila para ti y más clara para tus
              pacientes.
            </p>
            <div data-reveal className="mt-7">
              <Link href="/register">
                <Button size="lg" className="group h-12 rounded-full px-7">
                  Crear mi consultorio
                  <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </section>
        </LandingReveal>
      </main>

      <footer className="border-t border-[#ebebeb] bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-sm text-[#6b6b6b] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Dctoralia</span>
          <span className="font-mono text-xs">
            Agenda · Pacientes · Automatizaciones
          </span>
        </div>
      </footer>
    </div>
  );
}
