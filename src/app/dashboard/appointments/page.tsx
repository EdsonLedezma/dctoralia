import { Suspense } from "react";
import { DoctorAgenda } from "~/components/operations/doctor-agenda";
export default function Page() {
  return (
    <Suspense fallback={<p className="p-5 text-sm">Cargando historial…</p>}>
      <DoctorAgenda />
    </Suspense>
  );
}
