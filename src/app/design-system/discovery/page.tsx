import { Suspense } from "react";
import { DiscoveryPreview } from "./_components/discovery-preview";
export default function DiscoveryPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8">
          Preparando vista…
        </p>
      }
    >
      <DiscoveryPreview />
    </Suspense>
  );
}
