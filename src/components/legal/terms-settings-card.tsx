"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";

/** Tarjeta del perfil para consultar los términos aceptados. */
export function TermsSettingsCard() {
  const { data } = api.legal.termsStatus.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });
  const status = data?.result;
  const acceptedAt = status?.acceptedAt
    ? new Date(status.acceptedAt).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="border-border border-b px-5 py-4 sm:px-6">
        <CardTitle className="flex items-center text-base">
          <FileText className="text-muted-foreground mr-2 h-4 w-4" />
          Términos y condiciones
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Link
          href="/terminos"
          className="hover:bg-accent focus-visible:ring-ring flex min-h-11 items-center justify-between gap-4 px-5 py-4 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-6"
        >
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">
              Consultar términos y condiciones
            </span>
            <span className="text-muted-foreground block text-[13px]">
              {acceptedAt && status?.isCurrent
                ? `Aceptados el ${acceptedAt}`
                : "Documento vigente de uso de Dopilot"}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0"
          />
        </Link>
      </CardContent>
    </Card>
  );
}
