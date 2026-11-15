import { Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { NotificationBell } from "~/components/notifications/notification-bell";
export function WorkspaceDock({
  role,
  unreadCount,
}: {
  role: "DOCTOR" | "PATIENT";
  unreadCount: number;
}) {
  return (
    <div className="workspace-dock border-border/60 bg-card text-muted-foreground flex shrink-0 items-center justify-end gap-1 border-t px-3 py-1">
      <NotificationBell role={role} unreadCount={unreadCount} />
      {role === "DOCTOR" && (
        <span title="Agente del consultorio · Próximamente">
          <Button
            type="button"
            variant="ghost"
            disabled
            className="gap-2 px-2 text-xs disabled:opacity-70"
            aria-label="Agente del consultorio, próximamente"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Agente
            <span className="border-border rounded-full border px-1.5 py-0.5 text-[10px] font-normal">
              Próximamente
            </span>
          </Button>
        </span>
      )}
    </div>
  );
}
