"use client";

import { useId, useRef, useState } from "react";
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
import { SegmentedControl } from "~/components/ui/segmented-control";
import { PRIVACY_SECTIONS } from "~/lib/legal/privacy";
import { TERMS_SECTIONS } from "~/lib/legal/terms";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";
import { LegalDocument } from "./legal-document";

type LegalTab = "terms" | "privacy";

const TABS = [
  { value: "terms", label: "Términos" },
  { value: "privacy", label: "Aviso de privacidad" },
] as const;

/**
 * Modal bloqueante que se muestra una sola vez por versión de los documentos
 * legales. El layout del servidor decide si se renderiza; al aceptar, se
 * guarda en la base de datos y se refrescan los componentes del servidor.
 */
export function TermsAcceptanceDialog() {
  const router = useRouter();
  const utils = api.useUtils();
  const termsId = useId();
  const privacyId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<LegalTab>("terms");
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const acceptMutation = api.legal.acceptTerms.useMutation();

  const showTab = (next: LegalTab) => {
    setTab(next);
    scrollRef.current?.scrollTo({ top: 0 });
  };

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
          : "No se pudo registrar tu aceptación",
      );
    }
  };

  const docLink = (target: LegalTab, text: string) => (
    <button
      type="button"
      onClick={() => showTab(target)}
      className="text-foreground font-medium underline underline-offset-2"
    >
      {text}
    </button>
  );

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 data-[size=default]:sm:max-w-2xl"
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <AlertDialogHeader className="px-6 pt-6 pb-4">
          <AlertDialogMedia>
            <FileText aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Términos y aviso de privacidad</AlertDialogTitle>
          <AlertDialogDescription>
            Antes de continuar, lee y acepta los términos de uso y el aviso de
            privacidad de Dopilot. Podrás consultarlos cuando quieras desde tu
            perfil.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="border-border border-b px-6 pb-4">
          <SegmentedControl
            label="Documento"
            options={TABS}
            value={tab}
            onValueChange={showTab}
          />
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5"
          tabIndex={0}
          aria-label={
            tab === "terms"
              ? "Texto de los términos y condiciones"
              : "Texto del aviso de privacidad"
          }
        >
          <LegalDocument
            sections={tab === "terms" ? TERMS_SECTIONS : PRIVACY_SECTIONS}
          />
        </div>

        <div className="border-border space-y-3 border-t px-6 pt-4 pb-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id={termsId}
              checked={termsChecked}
              onCheckedChange={(value) => setTermsChecked(value === true)}
              className="mt-0.5"
            />
            <div className="text-sm leading-5">
              <Label htmlFor={termsId} className="inline font-normal">
                He leído y acepto los
              </Label>{" "}
              {docLink("terms", "términos y condiciones")}.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id={privacyId}
              checked={privacyChecked}
              onCheckedChange={(value) => setPrivacyChecked(value === true)}
              className="mt-0.5"
            />
            <div className="text-sm leading-5">
              <Label htmlFor={privacyId} className="inline font-normal">
                He leído el
              </Label>{" "}
              {docLink("privacy", "aviso de privacidad")}{" "}
              <Label htmlFor={privacyId} className="inline font-normal">
                y otorgo mi consentimiento expreso para el tratamiento de mis
                datos personales, incluidos los datos de salud.
              </Label>
            </div>
          </div>
          <AlertDialogFooter className="pt-2">
            <Button
              variant="ghost"
              disabled={acceptMutation.isPending}
              onClick={() => void signOut({ callbackUrl: "/" })}
            >
              No acepto, cerrar sesión
            </Button>
            <Button
              disabled={
                !termsChecked || !privacyChecked || acceptMutation.isPending
              }
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
