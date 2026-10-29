"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Stethoscope,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

type ShellRole = "DOCTOR" | "PATIENT";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const doctorNav: NavItem[] = [
  { label: "Resumen", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agenda", href: "/dashboard/appointments", icon: CalendarDays },
  { label: "Pacientes", href: "/dashboard/patients", icon: Users },
  {
    label: "Seguimiento",
    href: "/dashboard/follow-ups",
    icon: Activity,
  },
  { label: "Workspace", href: "/dashboard/workspace", icon: Building2 },
  { label: "Servicios", href: "/dashboard/services", icon: WalletCards },
  { label: "Horarios", href: "/dashboard/schedule", icon: Clock3 },
  { label: "Notificaciones", href: "/dashboard/notifications", icon: Bell },
  { label: "Perfil", href: "/dashboard/profile", icon: Settings },
];

const patientNav: NavItem[] = [
  { label: "Inicio", href: "/patient/dashboard", icon: LayoutDashboard },
  { label: "Mis citas", href: "/patient/appointments", icon: CalendarDays },
  { label: "Buscar doctores", href: "/patient/doctors", icon: Search },
  {
    label: "Historial médico",
    href: "/patient/medical-history",
    icon: FileText,
  },
  { label: "Notificaciones", href: "/patient/notifications", icon: Bell },
  { label: "Mi perfil", href: "/patient/profile", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" || href === "/patient/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  notificationCount = 0,
  collapsed = false,
}: {
  item: NavItem;
  pathname: string;
  notificationCount?: number;
  collapsed?: boolean;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
      className={`group relative flex min-h-10 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-[13px] transition-[background-color,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-[#b7edc9] focus-visible:outline-none active:scale-[0.97] ${collapsed ? "justify-center px-0" : ""} ${
        active
          ? "bg-[#235a49] text-[#f0fff4] shadow-[inset_0_0_0_1px_rgba(153,235,187,0.14)]"
          : "text-[#9ec3b0] hover:bg-[#193d33] hover:text-[#f0fff4]"
      }`}
    >
      <Icon
        className="h-[18px] w-[18px] shrink-0"
        strokeWidth={active ? 2.1 : 1.8}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {item.icon === Bell &&
        notificationCount > 0 &&
        (collapsed ? (
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#f3b47f]" />
        ) : (
          <span className="ml-auto min-w-5 rounded-full bg-[#d6f3df] px-1 text-center text-[10px] leading-5 font-semibold text-[#1a513b]">
            {notificationCount > 9 ? "9+" : notificationCount}
          </span>
        ))}
    </Link>
  );
}

function MobileNavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  const compactLabel: Record<string, string> = {
    "/dashboard": "Inicio",
    "/dashboard/follow-ups": "Seguimiento",
    "/patient/appointments": "Citas",
    "/patient/doctors": "Buscar",
    "/patient/medical-history": "Historial",
  };

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:outline-none active:bg-[#f5f5f5] ${active ? "text-[#171717]" : "text-[#737373]"}`}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
      <span className="max-w-full truncate">
        {compactLabel[item.href] ?? item.label}
      </span>
    </Link>
  );
}

type WorkspaceOption = {
  clinicId: string;
  name: string;
  slug: string;
  plan: "PRO" | "ENTERPRISE" | "CUSTOM" | null;
  membershipRole: "OWNER" | "ADMIN" | "DOCTOR" | "RECEPTIONIST";
};

function WorkspaceSwitcher({
  workspaces,
  activeClinicId,
  compact = false,
}: {
  workspaces: WorkspaceOption[];
  activeClinicId: string | null;
  compact?: boolean;
}) {
  const [switching, setSwitching] = useState(false);
  const selectWorkspaceMutation = api.workspace.select.useMutation();
  const activeWorkspace =
    workspaces.find((workspace) => workspace.clinicId === activeClinicId) ??
    workspaces[0];

  if (!activeWorkspace || workspaces.length < 2) return null;

  const selectWorkspace = async (clinicId: string) => {
    if (clinicId === activeWorkspace.clinicId || switching) return;
    setSwitching(true);
    try {
      unwrapTrpcResult(await selectWorkspaceMutation.mutateAsync({ clinicId }));
      window.location.reload();
    } catch (error) {
      setSwitching(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar de workspace",
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={switching}
          className={`flex min-h-10 w-full items-center gap-2 rounded-xl px-2 text-left transition-colors hover:bg-[#193d33] focus-visible:ring-2 focus-visible:ring-[#b7edc9] focus-visible:outline-none ${compact ? "justify-center" : ""}`}
          aria-label={`Cambiar espacio de trabajo, actual: ${activeWorkspace.name}`}
          title={compact ? activeWorkspace.name : undefined}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2f775c] text-[11px] font-semibold text-white">
            {activeWorkspace.name.slice(0, 1).toUpperCase()}
          </span>
          {!compact && (
            <>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#f4f4f5]">
                {activeWorkspace.name}
              </span>
              <span className="rounded border border-[#376651] px-1.5 py-0.5 text-[10px] text-[#b9ddc7]">
                {activeWorkspace.plan ?? "Workspace"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#9ec3b0]" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Espacios de trabajo</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.clinicId}
            onSelect={() => void selectWorkspace(workspace.clinicId)}
            className="gap-3 py-2"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f5f5f5] text-xs font-medium">
              {workspace.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
            {workspace.clinicId === activeWorkspace.clinicId && (
              <span className="text-xs text-[#737373]">Actual</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProductShell({
  role,
  children,
}: {
  role: ShellRole;
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
    if (previousUserId.current && currentUserId !== previousUserId.current) {
      queryClient.clear();
    }
    previousUserId.current = currentUserId;
  }, [currentUserId, queryClient, sessionStatus]);
  const workspacesQuery = api.workspace.listMine.useQuery(undefined, {
    enabled: role === "DOCTOR",
    staleTime: 60_000,
  });
  const items = role === "DOCTOR" ? doctorNav : patientNav;
  const displayName =
    session?.user?.name ?? (role === "DOCTOR" ? "Consultorio" : "Paciente");
  const initial = displayName.slice(0, 1).toUpperCase();
  const workspaceOptions = workspacesQuery.data?.result?.workspaces ?? [];
  const activeClinicId = workspacesQuery.data?.result?.activeClinicId ?? null;
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [moreNavOpen, setMoreNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setSidebarCollapsed(
      window.localStorage.getItem("dctoralia-sidebar-collapsed") === "true",
    );
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      window.localStorage.setItem(
        "dctoralia-sidebar-collapsed",
        String(!current),
      );
      return !current;
    });
  };
  const { data: unreadCountRes } = api.notifications.unreadCount.useQuery(
    undefined,
    { staleTime: 30_000, refetchInterval: 60_000 },
  );
  const unreadCount = unreadCountRes?.result ?? 0;
  const primaryMobileItems = items.slice(0, 4);
  const secondaryMobileItems = items.slice(4);
  const notificationHref =
    role === "DOCTOR" ? "/dashboard/notifications" : "/patient/notifications";

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const commandItems = useMemo(() => {
    const normalizedQuery = commandQuery.trim().toLowerCase();
    if (!normalizedQuery) return items;
    return items.filter((item) =>
      item.label.toLowerCase().includes(normalizedQuery),
    );
  }, [commandQuery, items]);

  const openCommandMenu = () => {
    setCommandQuery("");
    setCommandOpen(true);
  };

  return (
    <div className="min-h-[100dvh] bg-[#f6f9f5] text-[#183b30] md:flex">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-[#171717] px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Saltar al contenido
      </a>

      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 220 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 420, damping: 42 }
        }
        className="hidden shrink-0 overflow-hidden border-r border-[#255343] bg-[#0d2924] text-[#b3d1be] md:flex md:flex-col"
        aria-label="Barra lateral"
      >
        <div
          className={`flex border-b border-[#285144] p-2 ${sidebarCollapsed ? "flex-col items-center gap-1" : "items-center justify-between gap-2"}`}
        >
          <Link
            href={role === "DOCTOR" ? "/dashboard" : "/patient/dashboard"}
            className={`flex min-h-10 items-center gap-2 rounded-xl px-2 text-[#effff2] focus-visible:ring-2 focus-visible:ring-[#b7edc9] focus-visible:outline-none ${sidebarCollapsed ? "justify-center" : ""}`}
            aria-label="Dctoralia, inicio"
            title={sidebarCollapsed ? "Dctoralia, inicio" : undefined}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#b9e9c8] text-[#164932] shadow-[0_4px_14px_rgba(115,221,153,0.18)]">
              {role === "DOCTOR" ? (
                <Stethoscope className="size-[17px]" />
              ) : (
                <Activity className="size-[17px]" />
              )}
            </span>
            {!sidebarCollapsed && (
              <span className="text-sm font-semibold tracking-[-0.03em]">
                Dctoralia<span className="ml-1 text-[#f2b787]">.</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={
              sidebarCollapsed
                ? "Expandir barra lateral"
                : "Colapsar barra lateral"
            }
            aria-expanded={!sidebarCollapsed}
            title={
              sidebarCollapsed
                ? "Expandir barra lateral"
                : "Colapsar barra lateral"
            }
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[#a5cdb7] transition-colors hover:bg-[#1d4839] hover:text-white focus-visible:ring-2 focus-visible:ring-[#b7edc9] focus-visible:outline-none"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="size-[18px]" />
            ) : (
              <PanelLeftClose className="size-[18px]" />
            )}
          </button>
        </div>
        <div className="border-b border-[#285144] p-2">
          {role === "DOCTOR" && workspaceOptions.length > 1 ? (
            <WorkspaceSwitcher
              workspaces={workspaceOptions}
              activeClinicId={activeClinicId}
              compact={sidebarCollapsed}
            />
          ) : (
            <button
              type="button"
              className={`flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-xl px-2 text-left transition-colors duration-150 hover:bg-[#193d33] focus-visible:ring-2 focus-visible:ring-[#b7edc9] focus-visible:outline-none ${sidebarCollapsed ? "justify-center" : ""}`}
              aria-label="Espacio de trabajo"
              title={sidebarCollapsed ? displayName : undefined}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2f775c] text-[11px] font-semibold text-white">
                {initial}
              </span>
              {!sidebarCollapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#f4f4f5]">
                    {displayName}
                  </span>
                  <span className="rounded border border-[#376651] px-1.5 py-0.5 text-[10px] text-[#b9ddc7]">
                    {role === "DOCTOR" ? "Pro" : "Paciente"}
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="px-2 pt-2">
          <button
            type="button"
            onClick={openCommandMenu}
            className={`flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-xl border border-[#32634e] bg-[#15372f] px-2.5 text-left text-[13px] text-[#b6d9c4] transition-colors duration-150 hover:border-[#78b591] hover:text-white focus-visible:ring-2 focus-visible:ring-[#b7edc9] focus-visible:outline-none ${sidebarCollapsed ? "justify-center px-0" : ""}`}
            aria-label="Buscar en Dctoralia"
            title={sidebarCollapsed ? "Buscar en Dctoralia" : undefined}
          >
            <Search className="h-4 w-4" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1">Buscar</span>
                <kbd className="rounded border border-[#376651] px-1 text-[10px] text-[#b6d9c4]">
                  ⌘ K
                </kbd>
              </>
            )}
          </button>
        </div>

        <nav
          className="flex-1 space-y-1 overflow-y-auto px-2 py-3"
          aria-label="Navegación principal"
        >
          {items.slice(0, 3).map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              notificationCount={unreadCount}
              collapsed={sidebarCollapsed}
            />
          ))}
          <div className="my-3 border-t border-[#285144]" />
          {items.slice(3).map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              notificationCount={unreadCount}
              collapsed={sidebarCollapsed}
            />
          ))}
        </nav>

        <div className="space-y-1 border-t border-[#285144] p-2">
          <button
            type="button"
            className={`flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-[13px] text-[#b3d1be] transition-colors duration-150 hover:bg-[#193d33] hover:text-white focus-visible:ring-2 focus-visible:ring-[#b7edc9] focus-visible:outline-none ${sidebarCollapsed ? "justify-center px-0" : ""}`}
            aria-label="Ayuda"
            title={sidebarCollapsed ? "Ayuda" : undefined}
          >
            <CircleHelp className="h-[18px] w-[18px]" />
            {!sidebarCollapsed && "Ayuda"}
          </button>
          <div
            className={`flex items-center gap-2 rounded-xl px-2 py-2 ${sidebarCollapsed ? "flex-col" : ""}`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2f775c] text-[11px] font-semibold text-white">
              {initial}
            </span>
            {!sidebarCollapsed && (
              <span className="min-w-0 flex-1 truncate text-[12px] text-[#d4e9d8]">
                {displayName}
              </span>
            )}
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#99bdab] transition-colors duration-150 hover:bg-[#1d4839] hover:text-white focus-visible:ring-2 focus-visible:ring-[#b7edc9] focus-visible:outline-none"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
          <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
            <DialogContent className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-lg border-[#ebebeb] bg-white p-0 shadow-[0_20px_60px_rgba(0,0,0,0.16)] sm:top-[20%]">
              <DialogTitle className="sr-only">Buscar en Dctoralia</DialogTitle>
              <DialogDescription className="sr-only">
                Busca una sección y navega con el teclado.
              </DialogDescription>
              <div className="flex items-center gap-3 border-b border-[#ebebeb] px-4">
                <Search className="h-4 w-4 shrink-0 text-[#737373]" />
                <Input
                  autoFocus
                  value={commandQuery}
                  onChange={(event) => setCommandQuery(event.target.value)}
                  placeholder="Buscar una sección..."
                  className="h-12 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                />
                <kbd className="hidden rounded border border-[#e5e5e5] px-1.5 py-0.5 text-[10px] text-[#737373] sm:inline-flex">
                  ESC
                </kbd>
              </div>
              <nav
                className="max-h-[min(22rem,60vh)] overflow-y-auto p-2"
                aria-label="Resultados de búsqueda"
              >
                {commandItems.length > 0 ? (
                  commandItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setCommandOpen(false)}
                        className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-[#525252] transition-colors hover:bg-[#f5f5f5] hover:text-[#171717] focus-visible:bg-[#f5f5f5] focus-visible:text-[#171717] focus-visible:outline-none"
                      >
                        <Icon className="h-4 w-4 text-[#737373]" />
                        <span>{item.label}</span>
                        <span className="ml-auto text-xs text-[#a3a3a3]">
                          {item.href}
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <p className="px-3 py-8 text-center text-sm text-[#737373]">
                    No encontramos una sección con ese nombre.
                  </p>
                )}
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </motion.aside>

      <div className="min-w-0 flex-1">
        <div className="mobile-shell-header border-b border-[#dce9df] bg-[#fbfdfa] md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link
              href={role === "DOCTOR" ? "/dashboard" : "/patient/dashboard"}
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1f7257] text-[#f0fff4]">
                {role === "DOCTOR" ? (
                  <Stethoscope className="h-4 w-4" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
              </span>
              <span className="text-[#183b30]">
                Dctoralia<span className="text-[#d78c59]">.</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              {role === "DOCTOR" && workspaceOptions.length > 1 && (
                <div className="mr-1 w-10">
                  <WorkspaceSwitcher
                    workspaces={workspaceOptions}
                    activeClinicId={activeClinicId}
                    compact
                  />
                </div>
              )}
              <Link
                href={notificationHref}
                aria-label={
                  unreadCount > 0
                    ? `Notificaciones, ${unreadCount} sin leer`
                    : "Notificaciones"
                }
                className="relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md p-2 text-[#6b6b6b] transition-colors hover:bg-[#f5f5f5] hover:text-[#171717] focus-visible:ring-2 focus-visible:ring-[#0070f3] focus-visible:outline-none"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1f7257] px-1 text-[9px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={openCommandMenu}
                className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md p-2 text-[#6b6b6b] transition-colors hover:bg-[#f5f5f5] hover:text-[#171717] focus-visible:ring-2 focus-visible:ring-[#0070f3] focus-visible:outline-none"
                aria-label="Buscar en Dctoralia"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md p-2 text-[#6b6b6b] focus-visible:ring-2 focus-visible:ring-[#0070f3] focus-visible:outline-none"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <Dialog open={moreNavOpen} onOpenChange={setMoreNavOpen}>
          <DialogContent className="top-auto bottom-0 left-0 max-h-[min(75dvh,38rem)] w-full max-w-none translate-x-0 translate-y-0 gap-4 rounded-t-2xl rounded-b-none px-4 pt-7 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:bottom-1/2 sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:translate-y-1/2 sm:rounded-xl sm:p-6">
            <DialogTitle className="text-base">Más secciones</DialogTitle>
            <DialogDescription>
              Accesos secundarios de tu cuenta.
            </DialogDescription>
            <nav className="grid gap-1" aria-label="Más secciones">
              {secondaryMobileItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreNavOpen(false)}
                    className={`flex min-h-12 items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:outline-none ${active ? "bg-[#f1f1f1] font-medium text-[#171717]" : "text-[#525252] hover:bg-[#f5f5f5]"}`}
                  >
                    <Icon className="h-4 w-4 text-[#737373]" />
                    <span className="flex-1">{item.label}</span>
                    {item.icon === Bell && unreadCount > 0 && (
                      <span className="rounded-full bg-[#171717] px-2 py-0.5 text-xs text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </DialogContent>
        </Dialog>
        <nav
          className="fixed right-0 bottom-0 left-0 z-40 flex border-t border-[#e5e5e5] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.04)] backdrop-blur md:hidden"
          aria-label="Navegación móvil"
        >
          {primaryMobileItems.map((item) => (
            <MobileNavLink key={item.href} item={item} pathname={pathname} />
          ))}
          <button
            type="button"
            onClick={() => setMoreNavOpen(true)}
            className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:outline-none active:bg-[#f5f5f5] ${moreNavOpen || secondaryMobileItems.some((item) => isActive(pathname, item.href)) ? "text-[#171717]" : "text-[#737373]"}`}
            aria-haspopup="dialog"
            aria-expanded={moreNavOpen}
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
            <span>Más</span>
          </button>
        </nav>
        <main
          id="main-content"
          className="min-w-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
