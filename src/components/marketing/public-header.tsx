import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { AppearanceSwitcher } from "~/components/shared/appearance-switcher";
import { Button } from "~/components/ui/button";

export function PublicHeader({
  homeHref = "/",
  portalHref = "/login",
  portalLabel = "Iniciar sesión",
}: {
  homeHref?: string;
  portalHref?: string;
  portalLabel?: string;
}) {
  return (
    <header className="border-border bg-background/90 border-b backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-8">
        <Link
          href={homeHref}
          aria-label="Dctoralia, inicio"
          className="text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold tracking-tight focus-visible:ring-2"
        >
          <span className="glass-bubble flex size-9 items-center justify-center">
            <Stethoscope className="size-4" />
          </span>
          Dctoralia
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href={portalHref}>{portalLabel}</Link>
          </Button>
          <AppearanceSwitcher />
        </div>
      </div>
    </header>
  );
}
