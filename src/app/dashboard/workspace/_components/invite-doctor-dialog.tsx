"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Mail } from "lucide-react";

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

type InviteDoctorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  inviteToken: string | null;
  onSubmit: (email: string, expiresInDays: number) => Promise<void>;
  onClearToken: () => void;
};

export function InviteDoctorDialog({
  open,
  onOpenChange,
  isPending,
  inviteToken,
  onSubmit,
  onClearToken,
}: InviteDoctorDialogProps) {
  const [email, setEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setExpiresInDays("7");
      setCopied(false);
      onClearToken();
    }
  }, [onClearToken, open]);

  const handleCopy = async () => {
    if (!inviteToken) return;
    await navigator.clipboard.writeText(inviteToken);
    setCopied(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-[#ebebeb] bg-white p-0 shadow-[0_20px_60px_rgba(0,0,0,0.14)] sm:max-w-md">
        <DialogHeader className="border-b border-[#ebebeb] px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-[#737373]" />
            Invitar doctor
          </DialogTitle>
          <DialogDescription className="text-xs text-[#737373]">
            El doctor debe aceptar con una cuenta cuyo correo coincida.
          </DialogDescription>
        </DialogHeader>

        {inviteToken ? (
          <div className="space-y-4 px-5 py-5">
            <div className="border-l-2 border-emerald-500 bg-[#fafafa] px-3 py-2 text-sm text-[#404040]">
              Invitación creada. Este token sólo se muestra una vez mientras se
              conecta el envío por Sent.
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-token">Token de invitación</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-token"
                  readOnly
                  value={inviteToken}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleCopy()}
                  aria-label="Copiar token"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="space-y-5 px-5 py-5"
            onSubmit={(event) => {
              event.preventDefault();
              return void onSubmit(email, Number(expiresInDays));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="doctor-email">Correo del doctor</Label>
              <Input
                id="doctor-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="doctor@consultorio.mx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-expiration">Expira en</Label>
              <select
                id="invite-expiration"
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(event.target.value)}
                className="border-input focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2"
              >
                <option value="1">24 horas</option>
                <option value="7">7 días</option>
                <option value="14">14 días</option>
                <option value="30">30 días</option>
              </select>
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
                {isPending ? "Creando…" : "Crear invitación"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
