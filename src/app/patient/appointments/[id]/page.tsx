"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileText,
  Mail,
  Phone,
  Stethoscope,
} from "lucide-react";
import { ProductShell } from "~/components/shell/product-shell";
import { MotionList } from "~/components/shared/motion-list";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { api, type RouterOutputs } from "~/trpc/react";
import DashboardWrapper from "~/components/auth/DashboardWrapper";

type Appointment = Exclude<
  RouterOutputs["appointments"]["getById"]["result"],
  null
>;

const statusLabels: Record<Appointment["status"], string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

const statusClasses: Record<Appointment["status"], string> = {
  PENDING: "border-border bg-background text-muted-foreground",
  CONFIRMED: "border-border bg-card text-foreground",
  COMPLETED: "border-border bg-muted text-muted-foreground",
  CANCELLED: "border-border bg-background text-muted-foreground",
  NO_SHOW: "border-border bg-background text-muted-foreground",
};

function formatDate(value: Date | string) {
  const date = new Date(value);
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function PatientAppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const appointmentId = params?.id;
  const { data, isLoading, isError } = api.appointments.getById.useQuery(
    { id: appointmentId ?? "" },
    { enabled: Boolean(appointmentId) },
  );
  const appointment = data?.result;

  return (
    <DashboardWrapper allowedRoles={["PATIENT"]}>
      <ProductShell role="PATIENT">
        <div className="bg-background min-h-screen px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <Link
              href="/patient/appointments"
              className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:outline-none"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a mis citas
            </Link>

            {isLoading && <AppointmentSkeleton />}

            {(isError ||
              Boolean(data?.error) ||
              (!isLoading && !appointment)) && (
              <section className="border-border bg-card border-y px-5 py-12 text-center">
                <Stethoscope className="text-muted-foreground mx-auto h-8 w-8" />
                <h1 className="mt-4 text-xl font-semibold tracking-tight">
                  Cita no disponible
                </h1>
                <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
                  No pudimos encontrar esta cita o ya no tienes acceso a ella.
                </p>
                <Link href="/patient/appointments" className="mt-5 inline-flex">
                  <Button variant="outline">Ver mis citas</Button>
                </Link>
              </section>
            )}

            {appointment && <AppointmentContent appointment={appointment} />}
          </div>
        </div>
      </ProductShell>
    </DashboardWrapper>
  );
}

function AppointmentContent({ appointment }: { appointment: Appointment }) {
  const doctorName = appointment.doctor?.user?.name ?? "Doctor";
  const doctorEmail = appointment.doctor?.user?.email;
  const doctorPhone = appointment.doctor?.phone;

  return (
    <MotionList className="space-y-6">
      <section className="border-border bg-card border-y px-5 py-6 sm:px-7 sm:py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
              Detalle de cita
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {appointment.service?.name ?? appointment.reason ?? "Consulta"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              con {doctorName}
            </p>
          </div>
          <Badge className={statusClasses[appointment.status]}>
            {statusLabels[appointment.status]}
          </Badge>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <InfoSection title="Fecha y hora">
          <InfoRow icon={CalendarDays}>{formatDate(appointment.date)}</InfoRow>
          <InfoRow icon={Clock3}>
            {appointment.time} ·{" "}
            {appointment.duration ?? appointment.service?.duration ?? "—"} min
          </InfoRow>
        </InfoSection>

        <InfoSection title="Profesional">
          <InfoRow icon={Stethoscope}>{doctorName}</InfoRow>
          <p className="text-muted-foreground pl-6 text-xs">
            {appointment.doctor?.specialty ?? "Especialidad no registrada"}
          </p>
        </InfoSection>
      </div>

      <InfoSection title="Motivo y notas">
        <div className="text-muted-foreground flex items-start gap-2 text-sm">
          <FileText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-6">
            {appointment.reason ?? "Sin motivo registrado"}
          </p>
        </div>
        {appointment.notes && (
          <p className="border-border text-muted-foreground mt-3 border-t pt-3 text-sm leading-6">
            {appointment.notes}
          </p>
        )}
      </InfoSection>

      {appointment.intakeSymptoms && (
        <InfoSection title="Información que compartiste antes de la consulta">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium">Síntomas</dt>
              <dd className="text-muted-foreground mt-1 whitespace-pre-wrap">
                {appointment.intakeSymptoms}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Alergias</dt>
              <dd className="text-muted-foreground mt-1 whitespace-pre-wrap">
                {appointment.intakeAllergies || "No reportadas"}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Medicamentos</dt>
              <dd className="text-muted-foreground mt-1 whitespace-pre-wrap">
                {appointment.intakeMedications || "No reportados"}
              </dd>
            </div>
            {appointment.intakeContext && (
              <div>
                <dt className="font-medium">Contexto adicional</dt>
                <dd className="text-muted-foreground mt-1 whitespace-pre-wrap">
                  {appointment.intakeContext}
                </dd>
              </div>
            )}
          </dl>
        </InfoSection>
      )}

      <InfoSection title="Contacto del consultorio">
        <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {doctorPhone && (
            <a
              href={`tel:${doctorPhone}`}
              className="hover:text-foreground inline-flex min-h-11 items-center gap-2"
            >
              <Phone className="text-muted-foreground h-4 w-4" />
              {doctorPhone}
            </a>
          )}
          {doctorEmail && (
            <a
              href={`mailto:${doctorEmail}`}
              className="hover:text-foreground inline-flex min-h-11 items-center gap-2"
            >
              <Mail className="text-muted-foreground h-4 w-4" />
              {doctorEmail}
            </a>
          )}
          {!doctorPhone && !doctorEmail && (
            <p className="text-muted-foreground">
              No hay datos de contacto publicados.
            </p>
          )}
        </div>
      </InfoSection>

      {(appointment.status === "PENDING" ||
        appointment.status === "CONFIRMED") && (
        <div className="border-border flex flex-wrap gap-2 border-t pt-5">
          <Link href="/patient/appointments">
            <Button variant="outline">Gestionar cita</Button>
          </Link>
          <Link href="/patient/appointments/book">
            <Button>Agendar otra cita</Button>
          </Link>
        </div>
      )}
    </MotionList>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-card border-y px-4 py-4 sm:px-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function InfoRow({
  icon: Icon,
  children,
}: {
  icon: typeof CalendarDays;
  children: React.ReactNode;
}) {
  return (
    <div className="text-muted-foreground flex items-start gap-2 text-sm">
      <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function AppointmentSkeleton() {
  return (
    <div className="space-y-6" aria-label="Cargando detalle de cita">
      <div className="border-border bg-card h-36 animate-pulse border-y" />
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="border-border bg-card h-28 animate-pulse border-y" />
        <div className="border-border bg-card h-28 animate-pulse border-y" />
      </div>
      <span className="sr-only">Cargando detalle de cita</span>
    </div>
  );
}
