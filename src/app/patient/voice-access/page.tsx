import { Suspense } from "react";
import { VoiceAccessView } from "./_components/voice-access-view";
export default function VoiceAccessPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8" role="status">
          Preparando autorización…
        </p>
      }
    >
      <VoiceAccessView />
    </Suspense>
  );
}
