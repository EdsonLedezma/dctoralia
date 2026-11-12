import { ProductShell } from "~/components/shell/product-shell";
import { PublicHeader } from "~/components/marketing/public-header";

export function BookingFrame({
  authenticated,
  role,
  portalHref,
  children,
}: {
  authenticated: boolean;
  role: "DOCTOR" | "PATIENT";
  portalHref: string;
  children: React.ReactNode;
}) {
  return authenticated ? (
    <ProductShell role={role}>{children}</ProductShell>
  ) : (
    <div className="bg-background text-foreground min-h-dvh">
      <PublicHeader portalHref={portalHref} />
      <main>{children}</main>
    </div>
  );
}
