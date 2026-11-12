import { PublicHeader } from "~/components/marketing/public-header";
import { Skeleton } from "~/components/ui/skeleton";
export function DoctorProfileLoading() {
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <PublicHeader />
      <main
        className="mx-auto max-w-5xl space-y-6 px-5 py-8"
        role="status"
        aria-label="Cargando perfil"
      >
        <Skeleton className="h-44 rounded-[24px]" />
        <Skeleton className="h-80 rounded-[24px]" />
      </main>
    </div>
  );
}
