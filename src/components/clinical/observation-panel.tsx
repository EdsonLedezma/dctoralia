"use client";

import { useState, type FormEvent } from "react";
import { Activity, Plus, RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";

import {
  clinicalObservationCatalog,
  type ClinicalObservationCode,
} from "~/lib/clinical-observations";
import { api, type RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type Timeline = NonNullable<
  RouterOutputs["clinical"]["patientTimeline"]["result"]
>;
type Observation = Timeline["clinicalObservations"][number];
const codes = Object.keys(
  clinicalObservationCatalog,
) as ClinicalObservationCode[];

function localDateTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function observedDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function ObservationPanel({
  patientId,
  episodeId,
  observations,
}: {
  patientId: string;
  episodeId: string;
  observations: Observation[];
}) {
  const utils = api.useUtils();
  const reducedMotion = useReducedMotion();
  const [selectedCode, setSelectedCode] =
    useState<ClinicalObservationCode>("WEIGHT");
  const [code, setCode] = useState<ClinicalObservationCode>("WEIGHT");
  const [value, setValue] = useState("");
  const [context, setContext] = useState("");
  const [measuredAt, setMeasuredAt] = useState(localDateTime);
  const [open, setOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Observation | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const record = api.clinical.recordClinicalObservation.useMutation();
  const voidRecord = api.clinical.voidClinicalObservation.useMutation();

  const history = observations
    .filter(
      (item) =>
        item.code === selectedCode &&
        item.unit === clinicalObservationCatalog[selectedCode].unit,
    )
    .sort(
      (a, b) =>
        new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
    );
  const series = history.filter((item) => !item.voidedAt);
  const latest = series[0];
  const previous = series[1];
  const delta =
    latest && previous
      ? Number((latest.value - previous.value).toFixed(3))
      : null;
  const catalogItem = clinicalObservationCatalog[selectedCode];
  const chartPoints = [...series].reverse().slice(-12);
  const chartTimes = chartPoints.map((item) =>
    new Date(item.measuredAt).getTime(),
  );
  const chartValues = chartPoints.map((item) => item.value);
  const minTime = Math.min(...chartTimes);
  const maxTime = Math.max(...chartTimes);
  const minValue = Math.min(...chartValues);
  const maxValue = Math.max(...chartValues);
  const pointCoordinates = chartPoints.map((item, index) => {
    const time = new Date(item.measuredAt).getTime();
    const x =
      maxTime === minTime
        ? 12 + (index / Math.max(chartPoints.length - 1, 1)) * 296
        : 12 + ((time - minTime) / (maxTime - minTime)) * 296;
    const y =
      maxValue === minValue
        ? 40
        : 68 - ((item.value - minValue) / (maxValue - minValue)) * 56;
    return { x, y };
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericValue = Number(value);
    if (!value.trim() || !Number.isFinite(numericValue) || numericValue <= 0) {
      toast.error("Escribe un valor numérico mayor que cero.");
      return;
    }
    try {
      const response = await record.mutateAsync({
        patientId,
        episodeId: episodeId || undefined,
        code,
        value: numericValue,
        context: context.trim() || undefined,
        measuredAt: new Date(measuredAt),
      });
      if (response.error) {
        toast.error(response.message);
        return;
      }
      setSelectedCode(code);
      setValue("");
      setContext("");
      setMeasuredAt(localDateTime());
      setOpen(false);
      toast.success("Medición guardada en el expediente");
      await utils.clinical.patientTimeline.invalidate({ patientId });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la medición.",
      );
    }
  }

  async function submitVoid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!voidTarget || voidReason.trim().length < 5) return;
    try {
      const response = await voidRecord.mutateAsync({
        observationId: voidTarget.id,
        reason: voidReason.trim(),
      });
      if (response.error) {
        toast.error(response.message);
        return;
      }
      setVoidTarget(null);
      setVoidReason("");
      toast.success("Medición anulada; puedes registrar el valor correcto");
      await utils.clinical.patientTimeline.invalidate({ patientId });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo anular la medición.",
      );
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[#ebebeb] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity aria-hidden="true" className="size-4 text-[#525252]" />
            <h2 className="text-sm font-semibold text-[#171717]">
              Mediciones clínicas
            </h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#737373]">
            Valores registrados por el equipo médico, con fecha y unidad.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setOpen(true)}
          className="min-h-11 sm:min-h-9"
        >
          <Plus aria-hidden="true" className="mr-1.5 size-4" /> Registrar valor
        </Button>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="observation-series">Magnitud</Label>
            <Select
              value={selectedCode}
              onValueChange={(next) =>
                setSelectedCode(next as ClinicalObservationCode)
              }
            >
              <SelectTrigger
                id="observation-series"
                className="h-11 w-full sm:h-9"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {codes.map((item) => (
                  <SelectItem key={item} value={item}>
                    {clinicalObservationCatalog[item].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-[#ebebeb] bg-[#fafafa] p-4">
            <p className="text-[11px] font-medium tracking-wide text-[#737373] uppercase">
              Último registro
            </p>
            {latest ? (
              <>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-[#171717]">
                  {latest.value.toLocaleString("es-MX", {
                    maximumFractionDigits: 3,
                  })}
                  <span className="ml-2 text-sm font-normal text-[#737373]">
                    {latest.unit}
                  </span>
                </p>
                <p className="mt-2 text-xs text-[#737373]">
                  {observedDate(latest.measuredAt)}
                </p>
                <p className="mt-1 text-xs text-[#525252]">
                  {delta === null
                    ? "Primera medición de esta magnitud"
                    : `Cambio frente al registro anterior: ${delta > 0 ? "+" : ""}${delta} ${latest.unit}`}
                </p>
                {pointCoordinates.length > 1 && (
                  <svg
                    viewBox="0 0 320 80"
                    role="img"
                    aria-label={`Evolución de ${catalogItem.label}: ${pointCoordinates.length} mediciones entre ${minValue} y ${maxValue} ${catalogItem.unit}`}
                    className="mt-4 h-20 w-full overflow-visible"
                  >
                    <path
                      d={`M ${pointCoordinates.map((point) => `${point.x} ${point.y}`).join(" L ")}`}
                      fill="none"
                      stroke="#171717"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {pointCoordinates.map((point, index) => (
                      <circle
                        key={`${chartPoints[index]?.id ?? index}`}
                        cx={point.x}
                        cy={point.y}
                        r="3"
                        fill="white"
                        stroke="#171717"
                        strokeWidth="1.5"
                      />
                    ))}
                  </svg>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-[#737373]">
                Aún no hay valores de {catalogItem.label.toLowerCase()}.
              </p>
            )}
          </div>
          <p className="text-[11px] leading-5 text-[#888]">
            La variación es descriptiva. El sistema no interpreta si un cambio
            es favorable.
          </p>
        </div>
        <div className="min-w-0">
          <h3 className="mb-2 text-xs font-medium text-[#525252]">
            Historial · {catalogItem.unit}
          </h3>
          {history.length ? (
            <ol className="max-h-72 divide-y divide-[#f0f0f0] overflow-y-auto rounded-lg border border-[#ebebeb]">
              {history.map((item, index) => (
                <motion.li
                  key={item.id}
                  initial={
                    reducedMotion || index > 5 ? false : { opacity: 0, y: 5 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.18,
                    delay: Math.min(index, 5) * 0.025,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  className="flex items-center justify-between gap-3 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium tabular-nums ${item.voidedAt ? "text-[#888] line-through" : "text-[#171717]"}`}
                    >
                      {item.value}{" "}
                      <span className="font-normal text-[#737373]">
                        {item.unit}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#737373]">
                      {observedDate(item.measuredAt)} · {item.recordedBy.name}
                    </p>
                    {item.context && (
                      <p className="mt-1 text-xs break-words text-[#525252]">
                        {item.context}
                      </p>
                    )}
                    {item.voidedAt && (
                      <p className="mt-1 text-xs text-[#737373]">
                        Anulada · {item.voidReason}
                      </p>
                    )}
                  </div>
                  {item.canVoid && (
                    <button
                      type="button"
                      onClick={() => setVoidTarget(item)}
                      className="min-h-11 shrink-0 rounded-md px-2 text-xs text-[#737373] hover:bg-[#f5f5f5] hover:text-[#171717] focus-visible:ring-2 focus-visible:ring-[#171717] sm:min-h-9"
                      aria-label={`Corregir medición de ${observedDate(item.measuredAt)}`}
                    >
                      <RotateCcw aria-hidden="true" className="size-3.5" />
                    </button>
                  )}
                </motion.li>
              ))}
            </ol>
          ) : (
            <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-[#dedede] px-5 text-center text-sm text-[#888]">
              Registra el primer valor para comenzar la evolución.
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar medición clínica</DialogTitle>
            <DialogDescription>
              Elige la magnitud y registra el valor con su fecha. La unidad se
              asigna automáticamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="observation-code">Magnitud</Label>
              <Select
                value={code}
                onValueChange={(next) =>
                  setCode(next as ClinicalObservationCode)
                }
              >
                <SelectTrigger id="observation-code" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {codes.map((item) => (
                    <SelectItem key={item} value={item}>
                      {clinicalObservationCatalog[item].label} ·{" "}
                      {clinicalObservationCatalog[item].unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="observation-value">
                  Valor · {clinicalObservationCatalog[code].unit}
                </Label>
                <Input
                  id="observation-value"
                  type="number"
                  min="0.001"
                  step="0.001"
                  inputMode="decimal"
                  required
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="observation-date">Fecha y hora</Label>
                <Input
                  id="observation-date"
                  type="datetime-local"
                  required
                  max={localDateTime()}
                  value={measuredAt}
                  onChange={(event) => setMeasuredAt(event.target.value)}
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="observation-context">Contexto opcional</Label>
              <Input
                id="observation-context"
                maxLength={240}
                placeholder="Ej. Control en consulta"
                value={context}
                onChange={(event) => setContext(event.target.value)}
                className="h-11"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={record.isPending}>
                {record.isPending ? "Guardando…" : "Guardar medición"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(voidTarget)}
        onOpenChange={(next) => {
          if (!next) setVoidTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corregir medición</DialogTitle>
            <DialogDescription>
              La medición original quedará anulada y auditada. Después podrás
              registrar el valor correcto.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => void submitVoid(event)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="observation-void-reason">
                Motivo de corrección
              </Label>
              <Input
                id="observation-void-reason"
                minLength={5}
                maxLength={500}
                required
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
                placeholder="Ej. Error de captura"
                className="h-11"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setVoidTarget(null)}
              >
                Conservar registro
              </Button>
              <Button
                type="submit"
                disabled={voidRecord.isPending || voidReason.trim().length < 5}
              >
                Anular registro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
