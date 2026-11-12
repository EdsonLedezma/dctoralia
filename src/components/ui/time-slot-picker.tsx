"use client";
import { useId, useState, type ReactNode } from "react";
import { RadioGroup, Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown, Clock3, Moon, Sun, Sunset } from "lucide-react";
import { useCompactOverlay } from "~/hooks/use-compact-overlay";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { cn } from "~/lib/utils";

export interface TimeSlotPickerProps {
  slots: string[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  className?: string;
  emptyMessage?: string;
}

export function TimeSlotPicker({
  slots,
  selectedTime,
  onSelectTime,
  className,
  emptyMessage = "No hay horarios disponibles para esta fecha.",
}: TimeSlotPickerProps) {
  const mobile = useCompactOverlay();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const id = useId();
  const available = [...new Set(slots)];
  const selected =
    selectedTime && available.includes(selectedTime) ? selectedTime : undefined;
  const groups = [
    {
      title: "Mañana",
      Icon: Sun,
      slots: available.filter((time) => Number(time.split(":")[0]) < 12),
    },
    {
      title: "Tarde",
      Icon: Sunset,
      slots: available.filter((time) => {
        const hour = Number(time.split(":")[0]);
        return hour >= 12 && hour < 18;
      }),
    },
    {
      title: "Noche",
      Icon: Moon,
      slots: available.filter((time) => Number(time.split(":")[0]) >= 18),
    },
  ].filter((group) => group.slots.length > 0);
  if (available.length === 0)
    return (
      <div
        role="status"
        className={cn(
          "border-border bg-muted flex items-start gap-3 rounded-2xl border border-dashed p-5",
          className,
        )}
      >
        <Clock3 className="text-muted-foreground size-5 shrink-0" />
        <p className="text-muted-foreground text-sm leading-6">
          {emptyMessage}
        </p>
      </div>
    );
  const trigger = (value: ReactNode) => (
    <button
      type="button"
      aria-label="Horario de consulta"
      className="group border-input bg-card text-foreground focus-visible:ring-ring hover:border-foreground/35 flex min-h-20 w-full cursor-pointer items-center gap-4 rounded-[20px] border px-4 py-3 text-left shadow-xs transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <span className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-2xl">
        <Clock3 className="text-muted-foreground size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-muted-foreground block text-xs">
          Hora de la consulta
        </span>
        <span className="mt-1 block text-xl font-semibold tracking-tight tabular-nums">
          {value}
        </span>
      </span>
      <ChevronDown
        className="text-muted-foreground size-4 transition-transform group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </button>
  );
  return (
    <div className={cn("space-y-3", className)} data-slot="time-picker">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Elige tu horario</p>
        <p className="text-muted-foreground text-xs">
          {available.length} disponibles
        </p>
      </div>
      {mobile ? (
        <Sheet
          open={open}
          onOpenChange={(next) => {
            if (next) setDraft(selected ?? null);
            setOpen(next);
          }}
        >
          <SheetTrigger asChild>
            {trigger(selected ?? "Elegir una hora")}
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="gap-0 rounded-t-[28px] px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <SheetTitle className="px-2 pr-12 text-lg">
              Horarios disponibles
            </SheetTitle>
            <SheetDescription className="px-2 pt-2 pb-4 text-sm">
              Selecciona una hora para esta fecha.
            </SheetDescription>
            <RadioGroup.Root
              aria-label="Horas disponibles"
              value={draft ?? ""}
              onValueChange={setDraft}
              className="max-h-[45dvh] overflow-y-auto overscroll-contain px-1"
            >
              {groups.map((group) => (
                <div key={group.title}>
                  <div
                    id={`${id}-${group.title}`}
                    className="text-muted-foreground bg-popover sticky top-0 z-10 flex items-center gap-2 px-3 py-3 text-xs font-medium"
                  >
                    <group.Icon className="size-3.5" />
                    {group.title}
                  </div>
                  {group.slots.map((time) => (
                    <RadioGroup.Item
                      key={time}
                      value={time}
                      aria-label={`${time}, ${group.title}`}
                      className="text-foreground hover:bg-accent focus-visible:ring-ring data-[state=checked]:bg-accent flex min-h-12 w-full cursor-pointer items-center justify-between rounded-xl px-4 text-base tabular-nums focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                    >
                      {time}
                      <RadioGroup.Indicator>
                        <Check className="size-4" aria-hidden="true" />
                      </RadioGroup.Indicator>
                    </RadioGroup.Item>
                  ))}
                </div>
              ))}
            </RadioGroup.Root>
            <div className="border-border mt-3 border-t pt-4">
              <Button
                className="w-full"
                disabled={!draft || !available.includes(draft)}
                onClick={() => {
                  if (draft && available.includes(draft)) {
                    onSelectTime(draft);
                    setOpen(false);
                  }
                }}
              >
                Elegir horario
                {draft && <span className="tabular-nums">· {draft}</span>}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Select
          value={selected ?? ""}
          onValueChange={(time) => {
            if (available.includes(time)) onSelectTime(time);
          }}
        >
          <SelectPrimitive.Trigger asChild>
            {trigger(<SelectValue placeholder="Elegir una hora" />)}
          </SelectPrimitive.Trigger>
          <SelectContent
            align="start"
            className="max-h-80 min-w-(--radix-select-trigger-width) p-1"
          >
            {groups.map((group) => (
              <SelectGroup key={group.title}>
                <SelectLabel className="flex items-center gap-2 px-3 pt-3">
                  <group.Icon className="size-3.5" />
                  {group.title}
                </SelectLabel>
                {group.slots.map((time) => (
                  <SelectItem
                    key={time}
                    value={time}
                    className="min-h-12 rounded-xl px-3 text-base tabular-nums"
                  >
                    {time}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      )}
      <p className="text-muted-foreground text-xs leading-5">
        Los horarios corresponden a la fecha seleccionada.
      </p>
    </div>
  );
}
