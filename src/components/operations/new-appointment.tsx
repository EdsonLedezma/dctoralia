"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";
import { OperationsShell } from "./operations-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { DatePicker } from "~/components/ui/date-picker";
import { TimeSlotPicker } from "~/components/ui/time-slot-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export function NewAppointment() {
  const router = useRouter();
  const context = api.guestBooking.staffContext.useQuery();
  const doctors = context.data?.result?.doctors ?? [];
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const doctorId =
    selectedDoctor ||
    context.data?.result?.defaultDoctorId ||
    doctors[0]?.id ||
    "";
  const doctor = doctors.find((item) => item.id === doctorId);
  const serviceId = selectedService || doctor?.services[0]?.id || "";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [contactConsent, setContactConsent] = useState(false);
  const [existingPatientId, setExistingPatientId] = useState<
    string | undefined
  >();
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const contacts = api.guestBooking.contacts.useQuery(
    { search: searchTerm, doctorId },
    { enabled: searchTerm.length >= 2, retry: false },
  );
  const slots = api.schedule.getAvailableSlots.useQuery(
    { doctorId, serviceId, startDate: date, endDate: date },
    { enabled: !!doctorId && !!serviceId && !!date },
  );
  const available = (slots.data?.result ?? [])
    .filter((slot) => slot.date === date)
    .map((slot) => slot.time);
  const create = api.guestBooking.staffCreate.useMutation();
  const selectDoctor = api.agendaAdministrator.selectDoctor.useMutation();
  const utils = api.useUtils();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (create.isPending || !available.includes(time)) return;
    setError("");
    try {
      if (context.data?.result?.isReceptionist)
        unwrapTrpcResult(await selectDoctor.mutateAsync({ doctorId }));
      unwrapTrpcResult(
        await create.mutateAsync({
          name,
          phone,
          doctorId,
          serviceId,
          date,
          time,
          contactConsent,
          existingPatientId,
        }),
      );
      await utils.appointments.listMine.invalidate();
      toast.success(
        "Cita registrada. Confírmala desde la agenda para avisar al paciente.",
      );
      router.replace("/dashboard/appointments");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo registrar la cita.",
      );
      void slots.refetch();
    }
  }
  return (
    <OperationsShell>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !create.isPending)
            router.replace("/dashboard/appointments");
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva cita</DialogTitle>
            <DialogDescription>
              Nombre y teléfono son suficientes para abrir una ficha. No se crea
              acceso al portal.
            </DialogDescription>
          </DialogHeader>
          {context.isLoading ? (
            <p role="status" className="py-5 text-sm">
              Preparando agenda…
            </p>
          ) : context.isError || context.data?.error ? (
            <div role="alert" className="space-y-3">
              <p className="text-sm">No pudimos cargar el consultorio.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void context.refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(event) => void submit(event)}
              className="space-y-4"
            >
              <details className="border-border rounded-xl border px-3 py-2">
                <summary className="text-muted-foreground cursor-pointer py-1 text-xs">
                  Buscar una ficha existente
                </summary>
                <div className="mt-3 flex gap-2">
                  <Input
                    aria-label="Buscar por nombre, teléfono o correo"
                    placeholder="Nombre, teléfono o correo"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={search.trim().length < 2 || contacts.isFetching}
                    onClick={() => setSearchTerm(search.trim())}
                  >
                    Buscar
                  </Button>
                </div>
                <p className="text-muted-foreground my-2 text-xs">
                  Confirma con la persona por llamada o en recepción antes de
                  usar una coincidencia.
                </p>
                {contacts.isError || contacts.data?.error ? (
                  <p role="alert" className="text-xs">
                    No se pudo buscar. Intenta de nuevo.
                  </p>
                ) : contacts.data?.result?.length ? (
                  <ul className="divide-border divide-y">
                    {contacts.data.result.map((candidate) => (
                      <li
                        key={candidate.id}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <span className="min-w-0 text-xs">
                          <strong className="block truncate">
                            {candidate.user.name}
                          </strong>
                          {candidate.phone}
                          <span className="text-muted-foreground block truncate">
                            {candidate.user.email}
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setExistingPatientId(candidate.id);
                            setName(candidate.user.name);
                            setPhone(candidate.phone);
                          }}
                        >
                          Es esta persona
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : searchTerm && !contacts.isFetching ? (
                  <p className="text-muted-foreground text-xs">
                    Sin coincidencias en este consultorio. Puedes registrar una
                    ficha nueva.
                  </p>
                ) : null}
              </details>
              {existingPatientId && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span>Ficha existente seleccionada y confirmada.</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExistingPatientId(undefined)}
                  >
                    Crear otra ficha
                  </Button>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="quick-name">Nombre del paciente</Label>
                  <Input
                    id="quick-name"
                    autoComplete="name"
                    value={name}
                    required
                    minLength={2}
                    maxLength={120}
                    onChange={(event) => {
                      setName(event.target.value);
                      setExistingPatientId(undefined);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quick-phone">Teléfono</Label>
                  <Input
                    id="quick-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    required
                    maxLength={40}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setExistingPatientId(undefined);
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="quick-doctor">Doctor</Label>
                  <Select
                    value={doctorId}
                    onValueChange={(value) => {
                      setSelectedDoctor(value);
                      setExistingPatientId(undefined);
                      setSearchTerm("");
                      setExistingPatientId(undefined);
                      setSearchTerm("");
                      setSelectedService("");
                      setTime("");
                    }}
                  >
                    <SelectTrigger id="quick-doctor" className="w-full">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quick-service">Servicio</Label>
                  <Select
                    value={serviceId}
                    onValueChange={(value) => {
                      setSelectedService(value);
                      setTime("");
                    }}
                  >
                    <SelectTrigger id="quick-service" className="w-full">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctor?.services.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} · {item.duration} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DatePicker
                label="Fecha de la cita"
                value={date}
                min={today()}
                onValueChange={(value) => {
                  setDate(value);
                  setTime("");
                }}
              />
              {slots.isFetching ? (
                <p role="status" className="text-muted-foreground text-sm">
                  Consultando horarios…
                </p>
              ) : slots.isError || slots.data?.error ? (
                <div role="alert" className="space-y-2 text-sm">
                  <p>No se pudo consultar disponibilidad.</p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void slots.refetch()}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : (
                <TimeSlotPicker
                  selectedTime={time}
                  slots={available}
                  onSelectTime={setTime}
                />
              )}
              <label className="flex min-h-11 items-center gap-3 text-xs leading-5">
                <Checkbox
                  checked={contactConsent}
                  onCheckedChange={(value) => setContactConsent(value === true)}
                />
                <span>
                  El paciente autorizó avisos de su cita e invitación por
                  WhatsApp a este número.
                </span>
              </label>
              {error && (
                <p role="alert" className="text-sm">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.replace("/dashboard/appointments")}
                  disabled={create.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    create.isPending ||
                    slots.isFetching ||
                    !name.trim() ||
                    !phone.trim() ||
                    !serviceId ||
                    !available.includes(time)
                  }
                >
                  {create.isPending ? "Guardando…" : "Registrar cita"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </OperationsShell>
  );
}
