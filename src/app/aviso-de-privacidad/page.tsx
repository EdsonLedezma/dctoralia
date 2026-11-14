import type { Metadata } from "next";

import { LegalPage } from "~/components/legal/legal-page";
import { PRIVACY_SECTIONS } from "~/lib/legal/privacy";

export const metadata: Metadata = {
  title: "Aviso de privacidad · Dopilot",
};

export default function PrivacyNoticePage() {
  return <LegalPage title="Aviso de privacidad" sections={PRIVACY_SECTIONS} />;
}
