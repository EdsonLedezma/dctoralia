"use client";

import { Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { NotificationBell } from "~/components/notifications/notification-bell";
import { ValidationFeedback } from "~/components/validation/validation-feedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export function WorkspaceDock({
  role,
  unreadCount,
  isReceptionist = false,
}: {
  role: "DOCTOR" | "PATIENT";
  unreadCount: number;
  isReceptionist?: boolean;
}) {
  return (
    <div className="workspace-dock border-border/60 bg-card text-muted-foreground flex shrink-0 items-center justify-end gap-1 border-t px-3 py-1">
      <ValidationFeedback />
      <NotificationBell role={role} unreadCount={unreadCount} />
      {role === "DOCTOR" && !isReceptionist && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="gap-2 px-2 text-xs"
              aria-label="Conoce la visión del agente de Dopilot"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Agente
              <span className="border-border rounded-full border px-1.5 py-0.5 text-[10px] font-normal">
                Próximamente
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tu consultorio, con más claridad</DialogTitle>
              <DialogDescription className="pt-2 leading-7">
                Dopilot busca unir tu agenda, los avisos por WhatsApp y los
                expedientes para que tú y recepción trabajen en el mismo lugar.
                Más adelante, este agente te ayudará a entender qué pasa en tu
                consultorio y qué requiere atención. Hoy estamos validando los
                flujos contigo: deja tus ideas o problemas en Feedback. Tus
                notas son visibles para todos los usuarios de prueba.
              </DialogDescription>
            </DialogHeader>
            <p className="text-muted-foreground text-xs">
              El agente todavía no está conectado y no consulta información
              clínica.
            </p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
