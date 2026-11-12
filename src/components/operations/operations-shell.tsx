"use client";

import { createContext, useContext } from "react";
import { toast } from "sonner";
import { ProductShell } from "~/components/shell/product-shell";
import { ProductShellView } from "~/components/shell/product-shell-view";

// Only the explicit design laboratory provides this context. Product routes
// retain their server layout authorization and the real session/query shell.
export const OperationsPreviewContext = createContext<string | null>(null);

export function OperationsShell({
  children,
  role = "DOCTOR",
}: {
  children: React.ReactNode;
  role?: "DOCTOR" | "PATIENT";
}) {
  const previewPath = useContext(OperationsPreviewContext);
  if (previewPath)
    return (
      <ProductShellView
        role={role}
        pathname={previewPath}
        displayName={
          role === "DOCTOR"
            ? "Dra. Elena Rivera · Muestra"
            : "María López · Muestra"
        }
        workspaces={[]}
        activeClinicId={null}
        unreadCount={0}
        workspaceSwitching={false}
        onWorkspaceSelect={() => undefined}
        onSignOut={() =>
          toast("Vista de muestra: no hay una sesión real que cerrar.")
        }
      >
        {children}
      </ProductShellView>
    );
  return <ProductShell role={role}>{children}</ProductShell>;
}
