"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";
import { TermsContent } from "./terms-content";

/**
 * Modal bloqueante que se muestra una sola vez por versión de los términos.
 * El layout del servidor decide si se renderiza; al aceptar, se guarda en la
 * base de datos y se refrescan los componentes del servidor para retirarlo.
 */
export function TermsAcceptanceDialog() {
  const router = useRouter();
  const utils = api.useUtils();
  const checkboxId = useId();
  const [open, setOpen] = useState(true);
  const [checked, setChecked] = useState(false);
  const acceptMutation = api.legal.acceptTerms.useMutation();

  const accept = async () => {
    try {
      unwrapTrpcResult(await acceptMutation.mutateAsync());
      setOpen(false);
      await utils.legal.termsStatus.invalidate();
      router.refresh();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No se pudo registrar la aceptación de los términos",
      );
    }
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 data-[size=default]:sm:max-w-2xl"
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <AlertDialogHeader className="border-border border-b px-6 pt-6 pb-4">
          <AlertDialogMedia>
            <FileText aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Términos y condiciones</AlertDialogTitle>
          <AlertDialogDescription>
            Antes de continuar, lee y acepta los términos de uso de Dopilot.
            Podrás consultarlos cuando quieras desde tu perfil.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5"
          tabIndex={0}
          aria-label="Texto de los términos y condiciones"
        >
          <TermsContent />
        </div>

        <div className="border-border space-y-4 border-t px-6 pt-4 pb-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id={checkboxId}
              checked={checked}
              onCheckedChange={(value) => setChecked(value === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor={checkboxId}
              className="text-sm leading-5 font-normal"
            >
              He leído y acepto los términos y condiciones.
            </Label>
          </div>
          <AlertDialogFooter>
            <Button
              variant="ghost"
              disabled={acceptMutation.isPending}
              onClick={() => void signOut({ callbackUrl: "/" })}
            >
              No acepto, cerrar sesión
            </Button>
            <Button
              disabled={!checked || acceptMutation.isPending}
              onClick={() => void accept()}
            >
              {acceptMutation.isPending && (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              )}
              Aceptar y continuar
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
