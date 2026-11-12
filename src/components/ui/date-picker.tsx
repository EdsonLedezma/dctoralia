"use client";

import { useId, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { type Matcher } from "react-day-picker";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import {
  calendarDateValue,
  isCalendarDateInRange,
  parseCalendarDate,
  typedCalendarDate,
} from "./date-picker.utils";
import { cn } from "~/lib/utils";
import { useCompactOverlay } from "~/hooks/use-compact-overlay";

export function DatePicker({
  value,
  onValueChange,
  label = "Fecha",
  min,
  max,
  purpose = "date",
  disabled = false,
  className,
  availableDates,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  min?: string;
  max?: string;
  purpose?: "date" | "birthdate";
  disabled?: boolean;
  className?: string;
  availableDates?: readonly string[];
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const mobile = useCompactOverlay();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const selected = parseCalendarDate(value);
  const lowerBound =
    min ?? (purpose === "birthdate" ? "1900-01-01" : undefined);
  const upperBound =
    max ??
    (purpose === "birthdate" ? calendarDateValue(new Date()) : undefined);
  const disabledDays: Matcher[] = [];
  const available = availableDates ? new Set(availableDates) : undefined;
  const first = lowerBound ? parseCalendarDate(lowerBound) : undefined;
  const last = upperBound ? parseCalendarDate(upperBound) : undefined;
  if (first) disabledDays.push({ before: first });
  if (last) disabledDays.push({ after: last });
  if (available)
    disabledDays.push((day) => !available.has(calendarDateValue(day)));
  const updateOpen = (next: boolean) => {
    if (next) {
      setDraft(
        selected
          ? `${String(selected.getDate()).padStart(2, "0")}/${String(selected.getMonth() + 1).padStart(2, "0")}/${selected.getFullYear()}`
          : "",
      );
      setError("");
    }
    setOpen(next);
  };
  const choose = (date: Date | undefined) => {
    if (!date) return;
    if (available && !available.has(calendarDateValue(date))) return;
    onValueChange(calendarDateValue(date));
    setOpen(false);
  };
  const applyTyped = () => {
    const next = typedCalendarDate(draft);
    if (!next) {
      setError("Escribe una fecha válida: día/mes/año.");
      return;
    }
    if (!isCalendarDateInRange(next, lowerBound, upperBound)) {
      setError("Esta fecha está fuera del rango disponible.");
      return;
    }
    if (available && !available.has(next)) {
      setError("Esta fecha no tiene horarios disponibles.");
      return;
    }
    onValueChange(next);
    setOpen(false);
  };
  const trigger = (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      aria-label={`${label}: ${selected ? new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(selected) : "Seleccionar fecha"}`}
      className={cn("justify-start gap-2.5", className)}
    >
      <CalendarDays className="size-4" aria-hidden="true" />
      <span>
        {selected
          ? new Intl.DateTimeFormat("es-MX", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(selected)
          : "Seleccionar fecha"}
      </span>
      <ChevronDown
        aria-hidden="true"
        className="text-muted-foreground ml-auto size-3.5"
      />
    </Button>
  );
  const content = (
    <div className="mx-auto w-fit max-w-full">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={choose}
        disabled={disabledDays}
        defaultMonth={
          selected ?? parseCalendarDate(availableDates?.[0] ?? "") ?? first
        }
        startMonth={first}
        endMonth={last}
        captionLayout={purpose === "birthdate" ? "dropdown" : "label"}
        autoFocus
      />
      <div className="border-border mx-3 space-y-2 border-t pt-3 pb-4">
        <Label htmlFor={id} className="text-xs">
          Escribir fecha
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id={id}
            value={draft}
            placeholder="dd/mm/aaaa"
            inputMode="numeric"
            maxLength={10}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : `${id}-help`}
            onChange={(event) => {
              setDraft(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyTyped();
              }
            }}
            className="min-w-0 flex-1"
          />
          <Button type="button" size="sm" onClick={applyTyped}>
            Aplicar
          </Button>
        </div>
        <p id={`${id}-help`} className="text-muted-foreground text-xs">
          Día / mes / año
        </p>
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-foreground text-xs font-medium"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
  if (mobile)
    return (
      <Sheet open={open} onOpenChange={updateOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="bg-popover text-popover-foreground gap-1 rounded-t-[28px] px-3 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetTitle className="px-3 text-base">{label}</SheetTitle>
          <SheetDescription className="px-3 text-xs">
            Selecciona un día o escribe la fecha.
          </SheetDescription>
          {content}
        </SheetContent>
      </Sheet>
    );
  return (
    <Popover open={open} onOpenChange={updateOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto max-w-[calc(100vw-1rem)] p-0"
        aria-label={label}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
