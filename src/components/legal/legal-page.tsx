import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DopilotBrand } from "~/components/brand/dopilot-brand";
import type { LegalSection } from "~/lib/legal/company";
import { auth } from "~/server/auth";
import { LegalDocument } from "./legal-document";

/** Página pública para consultar un documento legal. */
export async function LegalPage({
  title,
  sections,
}: {
  title: string;
  sections: LegalSection[];
}) {
  const session = await auth();
  const back =
    session?.user.role === "DOCTOR"
      ? { href: "/dashboard/profile", label: "Volver al perfil" }
      : session?.user.role === "PATIENT"
        ? { href: "/patient/profile", label: "Volver a mi perfil" }
        : { href: "/", label: "Volver a Dopilot" };

  return (
    <main className="bg-background text-foreground min-h-dvh px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-[720px] space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={back.href}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -ml-2 inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {back.label}
          </Link>
          <DopilotBrand className="h-8 w-[82px]" />
        </div>

        <article className="border-border bg-card rounded-[20px] border p-6 sm:p-8">
          <h1 className="mb-6 text-[28px] leading-[1.15] font-semibold tracking-[-0.035em]">
            {title}
          </h1>
          <LegalDocument sections={sections} />
        </article>
      </div>
    </main>
  );
}
