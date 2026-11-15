import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Bot,
  Building2,
  Check,
  LockKeyhole,
  Server,
  Stethoscope,
} from "lucide-react";
import { LEGAL_ENTITY } from "~/lib/legal/company";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { GlassSurface } from "~/components/liquid-glass/glass-surface";

function proposalHref(subject: string) {
  const body =
    "Hola, quiero conocer una propuesta para mi consultorio o clínica.\n\nNombre de la clínica:\nNúmero de profesionales:\nModalidad de interés:\nTeléfono de contacto:\n";
  return `mailto:${LEGAL_ENTITY.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
export function AutomationSection() {
  return (
    <section
      id="automatizacion"
      aria-labelledby="automation-title"
      className="border-border bg-muted/40 scroll-mt-24 border-y px-5 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-2xl" data-reveal>
          <p className="text-muted-foreground text-sm">
            Más apoyo para la operación diaria
          </p>
          <h2
            id="automation-title"
            className="mt-3 text-3xl leading-tight font-semibold tracking-[-0.05em] text-balance sm:text-4xl"
          >
            Que una nueva cita no se pierda entre mensajes.
          </h2>
          <p className="text-muted-foreground mt-4 leading-7">
            La agenda es el centro. Los módulos de comunicación y asistencia te
            permitirán atender solicitudes y enterarte de los cambios sin
            revisar todo manualmente.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card data-reveal className="gap-0 rounded-[24px]">
            <CardHeader className="gap-4">
              <Bell className="size-6" aria-hidden="true" />
              <p className="text-muted-foreground text-xs font-medium">
                WhatsApp · Módulo en preparación
              </p>
              <CardTitle className="text-2xl tracking-tight">
                Tu agenda te avisa.
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm leading-7">
                Recibe en tu WhatsApp un aviso cuando se registre una cita
                nueva. La propuesta incluye avisos de cambios y cancelaciones
                para que tú y tu equipo puedan actuar a tiempo.
              </p>
              <GlassSurface backdrop="content" contentClassName="p-4">
                <p className="text-muted-foreground text-xs">
                  Ejemplo de aviso · No es un envío real
                </p>
                <p className="mt-2 text-sm font-semibold">
                  Nueva cita en tu agenda
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Mañana, 10:30 · Consulta
                </p>
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  Consulta los detalles desde tu cuenta. Sin información clínica
                  en el mensaje.
                </p>
              </GlassSurface>
              <p className="text-muted-foreground text-xs leading-6">
                Requiere activar y configurar el canal. Los mensajes, plantillas
                y límites se definen en la propuesta; no se incluyen envíos
                ilimitados.
              </p>
            </CardContent>
          </Card>
          <Card data-reveal className="gap-0 rounded-[24px]">
            <CardHeader className="gap-4">
              <Bot className="size-6" aria-hidden="true" />
              <p className="text-muted-foreground text-xs font-medium">
                Asistente de IA · Ampliación prevista
              </p>
              <CardTitle className="text-2xl tracking-tight">
                Una secretaria de agenda, cuando la necesites.
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm leading-7">
                Un módulo opcional para atender solicitudes, consultar
                disponibilidad y ayudar con la gestión de tus citas, con las
                reglas de tu consultorio.
              </p>
              <ul className="space-y-3 text-sm">
                {[
                  "Consultar servicios y horarios disponibles.",
                  "Crear, reprogramar y cancelar citas: funciones previstas.",
                  "Confirmar cambios y dejar un registro de las acciones.",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Check
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-xs leading-6">
                La integración actual consulta servicios y disponibilidad y
                ofrece enlaces de reserva. La gestión completa requiere
                desarrollo y validación antes de activarse. El consumo y los
                canales se cotizan aparte.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

const offers = [
  {
    name: "Pro",
    icon: Stethoscope,
    audience: "Para tu consulta independiente",
    description:
      "El punto de partida para organizar tu agenda y dar continuidad a tus pacientes.",
    price: "Suscripción mensual",
    features: [
      "Agenda, servicios y horarios.",
      "Expediente y seguimiento de la atención.",
      "Un profesional y un consultorio.",
      "Módulos opcionales según disponibilidad.",
    ],
    href: "/register",
    action: "Crear mi consultorio",
    private: false,
  },
  {
    name: "Enterprise",
    icon: Building2,
    audience: "Para clínicas y equipos",
    description:
      "Coordina profesionales, ubicaciones y permisos desde un mismo sistema.",
    price: "Cotización por equipo",
    features: [
      "Varios profesionales y ubicaciones.",
      "Administración y permisos por consultorio.",
      "Alcance de implementación acordado.",
      "Comunicación e IA como módulos opcionales.",
    ],
    href: proposalHref("Propuesta Dopilot Enterprise para mi clínica"),
    action: "Solicitar propuesta",
    private: false,
  },
  {
    name: "Enterprise Privado",
    icon: Server,
    audience: "Tu marca. Tu entorno de atención.",
    description:
      "Una propuesta de instalación exclusiva para clínicas que necesitan una experiencia propia y un entorno aislado.",
    price: "Licencia e implementación a medida",
    features: [
      "Marca propia dentro del sistema.",
      "Instancia y base de datos dedicadas.",
      "Nube privada o instalación on-premise.",
      "Mantenimiento e integraciones por contrato.",
    ],
    href: proposalHref("Propuesta Dopilot Enterprise Privado / On-premise"),
    action: "Cotizar solución privada",
    private: true,
  },
] as const;

export function LicensingSection() {
  return (
    <section
      id="licencias"
      aria-labelledby="licensing-title"
      className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:px-6 sm:py-28"
    >
      <div className="mb-10 max-w-2xl" data-reveal>
        <p className="text-muted-foreground text-sm">
          Una solución que acompaña tu crecimiento
        </p>
        <h2
          id="licensing-title"
          className="mt-3 text-3xl leading-tight font-semibold tracking-[-0.05em] text-balance sm:text-4xl"
        >
          Desde tu consultorio hasta una clínica con identidad propia.
        </h2>
        <p className="text-muted-foreground mt-4 leading-7">
          Empieza en Dopilot o solicita un proyecto privado. La modalidad, el
          número de profesionales y el soporte se acuerdan antes de contratar.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {offers.map(
          ({
            name,
            icon: Icon,
            audience,
            description,
            price,
            features,
            href,
            action,
            private: isPrivate,
          }) => (
            <Card
              key={name}
              data-reveal
              className="flex h-full flex-col gap-0 rounded-[24px]"
            >
              <CardHeader className="gap-4">
                <Icon className="size-6" aria-hidden="true" />
                <p className="text-muted-foreground text-xs font-medium">
                  {audience}
                </p>
                <CardTitle className="text-2xl tracking-tight">
                  {name}
                </CardTitle>
                <p className="text-muted-foreground text-sm leading-6">
                  {description}
                </p>
                <p className="text-sm font-semibold">{price}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <ul className="flex-1 space-y-3 text-sm">
                  {features.map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <Check
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {isPrivate && (
                  <p className="text-muted-foreground text-xs leading-6">
                    Modalidad bajo proyecto, sujeta a evaluación técnica. No es
                    una instalación automática disponible al crear una cuenta.
                  </p>
                )}
                <Button
                  asChild
                  variant={isPrivate ? "default" : "outline"}
                  className="min-h-11 w-full"
                >
                  <Link href={href}>
                    {action}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                {href.startsWith("mailto:") && (
                  <p className="text-muted-foreground text-xs">
                    Abre tu aplicación de correo para solicitar la propuesta.
                  </p>
                )}
              </CardContent>
            </Card>
          ),
        )}
      </div>
      <div
        className="border-border bg-muted/40 mt-6 flex gap-3 rounded-2xl border p-5 text-sm"
        data-reveal
      >
        <LockKeyhole className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="text-muted-foreground leading-7">
          <strong className="text-foreground font-medium">
            Privado también significa definir quién opera el sistema.
          </strong>{" "}
          En on-premise se instala en infraestructura de tu clínica; en nube
          dedicada, en un entorno exclusivo. Se acuerdan instalación, respaldos,
          actualizaciones y soporte. WhatsApp e IA siguen requiriendo sus
          conexiones y servicios externos.
        </p>
      </div>
    </section>
  );
}

const faqs = [
  [
    "¿Puedo empezar solo y después sumar a mi equipo?",
    "Sí. Pro está orientado al médico independiente. Si necesitas varios profesionales o ubicaciones, podemos definir una propuesta Enterprise para tu operación.",
  ],
  [
    "¿WhatsApp y el asistente de IA vienen activados?",
    "No. Son módulos opcionales. Los avisos al doctor están en preparación; la gestión completa de citas con IA es una ampliación prevista. La activación, los canales y el consumo se acuerdan por separado.",
  ],
  [
    "¿Qué recibirán mis pacientes?",
    "Pueden consultar sus citas y la información compartida disponible. Estamos desarrollando el portal por invitación para reunir recetas, documentos y estudios en un espacio de atención por doctor. No se publica todo el expediente automáticamente.",
  ],
  [
    "¿Puedo tener el sistema con la marca de mi clínica?",
    "Enterprise Privado contempla adaptar la identidad del sistema y desplegar una instancia exclusiva. El sitio web y el dominio comercial se tratan por separado. La propuesta se define según tus requisitos.",
  ],
  [
    "¿On-premise significa que todo funciona sin internet?",
    "No necesariamente. La agenda y los datos pueden operar en la infraestructura acordada, pero WhatsApp, correo, llamadas e IA externa requieren conectividad y configuración. El alcance sin conexión se evalúa en el proyecto.",
  ],
  [
    "¿La licencia privada incluye cualquier personalización?",
    "No. La implementación, la licencia, el mantenimiento y los desarrollos adicionales tienen alcances separados. Las integraciones y los niveles de soporte se especifican en la propuesta.",
  ],
] as const;

export function ProductFaq() {
  return (
    <section
      aria-labelledby="faq-title"
      className="border-border border-t px-5 py-20 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-3xl">
        <h2
          id="faq-title"
          data-reveal
          className="mb-8 text-3xl font-semibold tracking-[-0.05em]"
        >
          Elige cómo quieres trabajar.
        </h2>
        <div className="divide-border divide-y">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group py-2">
              <summary className="focus-visible:outline-ring min-h-11 cursor-pointer rounded-lg py-3 pr-4 text-sm font-medium focus-visible:outline-2">
                {question}
              </summary>
              <p className="text-muted-foreground pb-4 text-sm leading-7">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
