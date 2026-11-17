import { Suspense } from "react";
import { PublicDoctors } from "./_components/public-doctors";
export default function DoctorsPage() {
  return (
    <Suspense fallback={<p className="p-5 text-sm">Cargando doctores…</p>}>
      <PublicDoctors />
    </Suspense>
  );
}
