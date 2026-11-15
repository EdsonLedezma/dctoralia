import type { Metadata } from "next";
import { LandingView } from "./_components/landing/landing-view";

export const metadata: Metadata = {
  title: "Dopilot | Agenda y gestión para médicos y clínicas",
  description:
    "Organiza tu agenda, expediente y seguimiento. Conoce los módulos opcionales de WhatsApp e IA y la propuesta Enterprise Privado para clínicas con marca propia.",
};

export default function LandingPage() {
  return <LandingView />;
}
