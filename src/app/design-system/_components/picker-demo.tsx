"use client";
import { useState } from "react";
import { Check, Clock3 } from "lucide-react";
import { Calendar } from "~/components/ui/calendar";
import { DatePicker } from "~/components/ui/date-picker";
import {
  calendarDateValue,
  parseCalendarDate,
} from "~/components/ui/date-picker.utils";
import { TimeSlotPicker } from "~/components/ui/time-slot-picker";
import { Card } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const slots = [
  "09:00",
  "09:45",
  "10:30",
  "11:15",
  "12:00",
  "12:45",
  "16:00",
  "16:45",
  "17:30",
];
export function PickerDemo() {
  const [date, setDate] = useState("2026-10-29");
  const [month, setMonth] = useState(() => parseCalendarDate("2026-10-29"));
  const [time, setTime] = useState<string | null>("10:30");
  const [service, setService] = useState("follow-up");
  const selected = parseCalendarDate(date);
  const updateDate = (next: string) => {
    setDate(next);
    setMonth(parseCalendarDate(next));
    setTime(null);
  };
  return (
    <Card id="picker-demo" className="scroll-mt-24 gap-0 overflow-hidden py-0">
      <div className="border-border flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Un buen momento para cuidar.
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Fecha, servicio y horario en la misma conversación.
          </p>
        </div>
        <DatePicker
          label="Fecha de disponibilidad"
          value={date}
          onValueChange={updateDate}
        />
      </div>
      <div className="grid lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="border-border grid justify-items-center border-b py-5 lg:border-r lg:border-b-0">
          <Calendar
            mode="single"
            selected={selected}
            month={month}
            onMonthChange={setMonth}
            onSelect={(next) => {
              if (next) {
                updateDate(calendarDateValue(next));
              }
            }}
          />
        </div>
        <div className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Clock3 className="size-4" />
              <span>45 minutos · Ciudad de México</span>
            </div>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger
                aria-label="Servicio de demostración"
                className="w-full sm:w-auto"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="follow-up">Seguimiento</SelectItem>
                <SelectItem value="first">Primera consulta</SelectItem>
                <SelectItem value="results">Revisión de resultados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TimeSlotPicker
            slots={slots}
            selectedTime={time}
            onSelectTime={setTime}
          />
          <p
            aria-live="polite"
            className="text-muted-foreground flex min-h-6 items-center gap-2 text-sm"
          >
            {time && selected ? (
              <>
                <Check className="size-4" />
                {new Intl.DateTimeFormat("es-MX", {
                  day: "numeric",
                  month: "long",
                }).format(selected)}{" "}
                · {time}
              </>
            ) : (
              "Elige un horario para esta fecha."
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}
