"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";
import { ProductShellView } from "./product-shell-view";

export function ProductShell({
  role,
  children,
}: {
  role: "DOCTOR" | "PATIENT";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null>(null);
  const currentUserId = session?.user?.id ?? null;
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      queryClient.clear();
      previousUserId.current = null;
      return;
    }
    if (sessionStatus !== "authenticated") return;
    if (previousUserId.current && currentUserId !== previousUserId.current)
      queryClient.clear();
    previousUserId.current = currentUserId;
  }, [currentUserId, queryClient, sessionStatus]);
  const workspacesQuery = api.workspace.listMine.useQuery(undefined, {
    enabled: role === "DOCTOR",
    staleTime: 60_000,
  });
  const { data: unreadCountRes } = api.notifications.unreadCount.useQuery(
    undefined,
    { staleTime: 30_000, refetchInterval: 60_000 },
  );
  const selectWorkspaceMutation = api.workspace.select.useMutation();
  const [switching, setSwitching] = useState(false);
  const workspaces = workspacesQuery.data?.result?.workspaces ?? [];
  const activeClinicId = workspacesQuery.data?.result?.activeClinicId ?? null;
  const selectWorkspace = async (clinicId: string) => {
    if (
      clinicId ===
        (
          workspaces.find(
            (workspace) => workspace.clinicId === activeClinicId,
          ) ?? workspaces[0]
        )?.clinicId ||
      switching
    )
      return;
    setSwitching(true);
    try {
      unwrapTrpcResult(await selectWorkspaceMutation.mutateAsync({ clinicId }));
      window.location.reload();
    } catch (cause) {
      setSwitching(false);
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No se pudo cambiar de consultorio",
      );
    }
  };
  return (
    <ProductShellView
      role={role}
      pathname={pathname}
      displayName={
        session?.user?.name ?? (role === "DOCTOR" ? "Consultorio" : "Paciente")
      }
      workspaces={workspaces}
      activeClinicId={activeClinicId}
      unreadCount={unreadCountRes?.result ?? 0}
      workspaceSwitching={switching}
      onWorkspaceSelect={(clinicId) => void selectWorkspace(clinicId)}
      onSignOut={() => void signOut({ callbackUrl: "/" })}
    >
      {children}
    </ProductShellView>
  );
}
