import { Suspense } from "react";
import { FollowUpsView } from "./_components/follow-ups-view";
export default function FollowUpsPage() {
  return (
    <Suspense fallback={<p className="p-5 text-sm">Cargando seguimiento…</p>}>
      <FollowUpsView />
    </Suspense>
  );
}
