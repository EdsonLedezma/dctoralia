"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { authPageHref } from "~/components/auth/auth-navigation";

export function VoiceCallAccess({ doctorId }: { doctorId: string }) {
  const { data: session } = useSession();
  const query = api.voiceAgent.availability.useQuery(
    { doctorId },
    { staleTime: 30_000 },
  );
  if (!query.data?.result?.enabled || session?.user.role === "DOCTOR")
    return null;
  const target = "/patient/voice-access?" + new URLSearchParams({ doctorId });
  return (
    <div className="border-border mt-4 space-y-2 border-t pt-4">
      <p className="text-sm font-medium">Asistente telefónico disponible</p>
      <p className="text-muted-foreground text-xs leading-6">
        Autoriza tu llamada para consultar o gestionar tus citas con este
        consultorio.
      </p>
      <Button asChild variant="outline" className="min-h-11 w-full">
        <Link href={session ? target : authPageHref("/login", target)}>
          Autorizar mi llamada
        </Link>
      </Button>
    </div>
  );
}
