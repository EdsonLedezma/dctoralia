"use client";
import { useState } from "react";
import { ArrowUpRight, CalendarPlus, Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export function AppointmentDialog() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [date, setDate] = useState("2026-10-29");
  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <CalendarPlus /> Nueva cita
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Un espacio para tu próxima consulta.</DialogTitle>
            <DialogDescription>
              Formulario de demostración. No crea una cita real.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              setSaved(true);
              setOpen(false);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="preview-patient">Nombre del paciente</Label>
              <Input
                id="preview-patient"
                placeholder="Nombre y apellido"
                required
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Fecha</p>
              <DatePicker
                label="Fecha de la consulta"
                value={date}
                onValueChange={setDate}
                className="w-full"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Probar confirmación <ArrowUpRight />
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <p role="status" className="sr-only">
        {saved ? "Demostración completada. No se guardaron datos." : ""}
      </p>
      {saved && (
        <p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
          <Check className="size-3" /> Demostración completada
        </p>
      )}
    </div>
  );
}
