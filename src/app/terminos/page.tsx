import type { Metadata } from "next";

import { LegalPage } from "~/components/legal/legal-page";
import { TERMS_SECTIONS } from "~/lib/legal/terms";

export const metadata: Metadata = {
  title: "Términos y condiciones · Dopilot",
};

export default function TermsPage() {
  return <LegalPage title="Términos y condiciones" sections={TERMS_SECTIONS} />;
}
