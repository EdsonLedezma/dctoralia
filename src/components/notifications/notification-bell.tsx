"use client";
import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "~/components/ui/dialog";
import { NotificationInbox } from "./notification-inbox";
export function NotificationBell({
  role,
  unreadCount,
}: {
  role: "DOCTOR" | "PATIENT";
  unreadCount: number;
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  return (
    <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ""}`}
        >
          <Bell className="size-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="bg-foreground text-background absolute top-0.5 right-0.5 min-w-4 rounded-full px-1 text-[9px] leading-4"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(44rem,85dvh)] gap-0 p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Avisos de tu cuenta</DialogTitle>
        <DialogDescription className="sr-only">
          Abre un aviso para consultar el registro al que corresponde.
        </DialogDescription>
        <div className="max-h-[min(39rem,75dvh)] overflow-y-auto pt-7">
          <NotificationInbox
            role={role}
            compact
            onNavigate={() => setNotificationsOpen(false)}
          />
        </div>
        <Link
          className="border-border text-muted-foreground hover:text-foreground flex min-h-11 items-center justify-center border-t px-4 text-xs"
          href={
            role === "DOCTOR"
              ? "/dashboard/notifications"
              : "/patient/notifications"
          }
          onClick={() => setNotificationsOpen(false)}
        >
          Preferencias de notificaciones
        </Link>
      </DialogContent>
    </Dialog>
  );
}
