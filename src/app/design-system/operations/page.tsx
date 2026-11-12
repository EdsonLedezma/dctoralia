import { Suspense } from "react";
import type { Metadata } from "next";
import { OperationsPreview } from "./_components/operations-preview";

export const metadata: Metadata = {
  title: "Operación del consultorio · Diseño",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<p className="p-8">Cargando vista de diseño…</p>}>
      <OperationsPreview />
    </Suspense>
  );
}
