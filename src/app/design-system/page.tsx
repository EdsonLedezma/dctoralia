import type { Metadata } from "next";
import { DesignPreview } from "./_components/design-preview";

export const metadata: Metadata = {
  title: "Materiales y componentes · Dctoralia",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return <DesignPreview />;
}
