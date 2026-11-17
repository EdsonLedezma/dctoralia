import { Suspense } from "react";
import { ActivatePatientView } from "./_components/activate-patient-view";
export const metadata = {
  title: "Activar mi acceso · Dopilot",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function ActivatePatientPage() {
  return (
    <Suspense fallback={<p className="p-5 text-sm">Revisando invitación…</p>}>
      <ActivatePatientView />
    </Suspense>
  );
}
