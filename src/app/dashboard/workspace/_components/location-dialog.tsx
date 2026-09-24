"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type LocationDraft = {
  id?: string;
  name: string;
  address: string;
  timezone: string;
};

type LocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  location?: LocationDraft | null;
  onSubmit: (draft: LocationDraft) => Promise<void>;
};

const emptyDraft: LocationDraft = {
  name: "",
  address: "",
  timezone: "America/Mexico_City",
};

export function LocationDialog({
  open,
  onOpenChange,
  isPending,
  location,
  onSubmit,
}: LocationDialogProps) {
  const [draft, setDraft] = useState<LocationDraft>(emptyDraft);
  const id = location?.id;
  const name = location?.name;
  const address = location?.address;
  const timezone = location?.timezone;

  useEffect(() => {
    if (open) {
      setDraft(
        id
          ? {
              id,
              name: name ?? "",
              address: address ?? "",
              timezone: timezone ?? "",
            }
          : emptyDraft,
      );
    }
  }, [id, name, address, timezone, open]);

  const update = (key: keyof LocationDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-[#ebebeb] bg-white p-0 shadow-[0_20px_60px_rgba(0,0,0,0.14)] sm:max-w-md">
        <DialogHeader className="border-b border-[#ebebeb] px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-[#737373]" />
            {location ? "Editar ubicación" : "Nueva ubicación"}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#737373]">
            Define dónde atiende el equipo. Puedes cambiarlo después.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5 px-5 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            return void onSubmit(draft);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="location-name">Nombre</Label>
            <Input
              id="location-name"
              required
              maxLength={80}
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Consultorio Roma Norte"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location-address">Dirección (opcional)</Label>
            <Input
              id="location-address"
              maxLength={180}
              value={draft.address}
              onChange={(event) => update("address", event.target.value)}
              placeholder="Av. Insurgentes Sur 123"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location-timezone">Zona horaria</Label>
            <Input
              id="location-timezone"
              maxLength={80}
              value={draft.timezone}
              onChange={(event) => update("timezone", event.target.value)}
              placeholder="America/Mexico_City"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Guardando…"
                : location
                  ? "Guardar cambios"
                  : "Crear ubicación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
