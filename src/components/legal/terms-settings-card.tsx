"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";

const DOCUMENTS = [
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/aviso-de-privacidad", label: "Aviso de privacidad" },
] as const;

/** Tarjeta del perfil para consultar los documentos legales aceptados. */
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
  const detail =
    acceptedAt && status?.isCurrent
      ? `Aceptado el ${acceptedAt}`
      : "Documento vigente de Dopilot";

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="border-border border-b px-5 py-4 sm:px-6">
        <CardTitle className="flex items-center text-base">
          <FileText className="text-muted-foreground mr-2 h-4 w-4" />
          Legal y privacidad
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-border divide-y p-0">
        {DOCUMENTS.map((doc) => (
          <Link
            key={doc.href}
            href={doc.href}
            className="hover:bg-accent focus-visible:ring-ring flex min-h-11 items-center justify-between gap-4 px-5 py-4 transition-colors last:rounded-b-[inherit] focus-visible:ring-2 focus-visible:outline-none sm:px-6"
          >
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">{doc.label}</span>
              <span className="text-muted-foreground block text-[13px]">
                {detail}
              </span>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0"
            />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
