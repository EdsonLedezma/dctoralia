"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { AppearanceSwitcher } from "~/components/shared/appearance-switcher";
import { GlassSurface } from "~/components/liquid-glass/glass-surface";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

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
  { label: "Consultorio", href: "/dashboard/workspace", icon: Building2 },
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
      className={`sidebar-link group focus-visible:ring-sidebar-ring relative flex min-h-11 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-[13px] transition-[background-color,color,transform] duration-150 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] ${collapsed ? "justify-center px-0" : ""} ${
        active
          ? "text-sidebar-primary-foreground font-semibold"
          : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground"
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
          <span className="bg-card absolute top-1.5 right-1.5 size-1.5 rounded-full" />
        ) : (
          <span className="bg-sidebar-foreground text-sidebar ml-auto min-w-5 rounded-full px-1 text-center text-[10px] leading-5 font-semibold">
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
      className={`focus-visible:ring-ring active:bg-accent flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${active ? "glass-bubble text-foreground" : "text-muted-foreground"}`}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
      <span className="max-w-full truncate">
        {compactLabel[item.href] ?? item.label}
      </span>
    </Link>
  );
}

export type WorkspaceOption = {
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
  switching,
  onSelect,
}: {
  workspaces: WorkspaceOption[];
  activeClinicId: string | null;
  compact?: boolean;
  switching: boolean;
  onSelect: (clinicId: string) => void;
}) {
  const activeWorkspace =
    workspaces.find((workspace) => workspace.clinicId === activeClinicId) ??
    workspaces[0];

  if (!activeWorkspace || workspaces.length < 2) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={switching}
          className={`hover:bg-sidebar-accent focus-visible:ring-sidebar-ring flex min-h-10 w-full items-center gap-2 rounded-xl px-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none ${compact ? "justify-center" : ""}`}
          aria-label={`Cambiar consultorio, actual: ${activeWorkspace.name}`}
          title={compact ? activeWorkspace.name : undefined}
        >
          <span className="bg-sidebar-foreground/20 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white">
            {activeWorkspace.name.slice(0, 1).toUpperCase()}
          </span>
          {!compact && (
            <>
              <span className="text-sidebar-foreground min-w-0 flex-1 truncate text-[13px] font-medium">
                {activeWorkspace.name}
              </span>
              <span className="border-sidebar-foreground/25 text-sidebar-foreground/85 rounded border px-1.5 py-0.5 text-[10px]">
                {activeWorkspace.plan ?? "Consultorio"}
              </span>
              <ChevronDown className="text-sidebar-foreground/65 h-3.5 w-3.5 shrink-0" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Tus consultorios</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.clinicId}
            onSelect={() => onSelect(workspace.clinicId)}
            className="gap-3 py-2"
          >
            <span className="bg-accent flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
              {workspace.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
            {workspace.clinicId === activeWorkspace.clinicId && (
              <span className="text-muted-foreground text-xs">Actual</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProductShellView({
  role,
  pathname,
  displayName,
  workspaces: workspaceOptions,
  activeClinicId,
  unreadCount,
  workspaceSwitching = false,
  onWorkspaceSelect,
  onSignOut,
  children,
}: {
  role: ShellRole;
  pathname: string;
  displayName: string;
  workspaces: WorkspaceOption[];
  activeClinicId: string | null;
  unreadCount: number;
  workspaceSwitching?: boolean;
  onWorkspaceSelect: (clinicId: string) => void;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const items = role === "DOCTOR" ? doctorNav : patientNav;
  const initial = displayName.slice(0, 1).toUpperCase();
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [moreNavOpen, setMoreNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchShortcut, setSearchShortcut] = useState("Ctrl K");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (navigator.userAgent.includes("Mac")) setSearchShortcut("⌘ K");
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
    <div className="bg-background text-foreground min-h-[100dvh] md:flex">
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Saltar al contenido
      </a>

      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 76 : 244 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 420, damping: 42 }
        }
        className="product-sidebar border-sidebar-border bg-sidebar text-sidebar-foreground/85 sticky top-3 m-3 mr-0 hidden h-[calc(100dvh-1.5rem)] shrink-0 overflow-hidden rounded-[28px] border md:flex md:flex-col"
        aria-label="Barra lateral"
      >
        <div
          className={`border-sidebar-border flex border-b p-2 ${sidebarCollapsed ? "flex-col items-center gap-1" : "items-center justify-between gap-2"}`}
        >
          <Link
            href={role === "DOCTOR" ? "/dashboard" : "/patient/dashboard"}
            className={`text-sidebar-primary-foreground focus-visible:ring-sidebar-ring flex min-h-11 items-center gap-2 rounded-xl px-2 focus-visible:ring-2 focus-visible:outline-none ${sidebarCollapsed ? "justify-center" : ""}`}
            aria-label="Dctoralia, inicio"
            title={sidebarCollapsed ? "Dctoralia, inicio" : undefined}
          >
            <span className="bg-sidebar-foreground text-sidebar flex size-8 shrink-0 items-center justify-center rounded-xl shadow-[0_4px_14px_rgba(255,255,255,0.06)]">
              {role === "DOCTOR" ? (
                <Stethoscope className="size-[17px]" />
              ) : (
                <Activity className="size-[17px]" />
              )}
            </span>
            {!sidebarCollapsed && (
              <span className="text-sm font-semibold tracking-[-0.03em]">
                Dctoralia
                <span className="text-sidebar-foreground/65 ml-1">.</span>
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
            className="text-sidebar-foreground/65 hover:bg-sidebar-accent focus-visible:ring-sidebar-ring flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:text-white focus-visible:ring-2 focus-visible:outline-none"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="size-[18px]" />
            ) : (
              <PanelLeftClose className="size-[18px]" />
            )}
          </button>
        </div>
        <div className="border-sidebar-border border-b p-2">
          {role === "DOCTOR" && workspaceOptions.length > 1 ? (
            <WorkspaceSwitcher
              workspaces={workspaceOptions}
              activeClinicId={activeClinicId}
              compact={sidebarCollapsed}
              switching={workspaceSwitching}
              onSelect={onWorkspaceSelect}
            />
          ) : (
            <Link
              href={
                role === "DOCTOR" ? "/dashboard/workspace" : "/patient/profile"
              }
              className={`hover:bg-sidebar-accent focus-visible:ring-sidebar-ring flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-2 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none ${sidebarCollapsed ? "justify-center" : ""}`}
              aria-label={
                role === "DOCTOR" ? "Abrir consultorio" : "Abrir mi perfil"
              }
              title={sidebarCollapsed ? displayName : undefined}
            >
              <span className="bg-sidebar-foreground/20 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white">
                {initial}
              </span>
              {!sidebarCollapsed && (
                <>
                  <span className="text-sidebar-foreground min-w-0 flex-1 truncate text-[13px] font-medium">
                    {displayName}
                  </span>
                  <span className="border-sidebar-foreground/25 text-sidebar-foreground/85 rounded border px-1.5 py-0.5 text-[10px]">
                    {role === "DOCTOR" ? "Doctor" : "Paciente"}
                  </span>
                </>
              )}
            </Link>
          )}
        </div>

        <div className="px-2 pt-2">
          <button
            type="button"
            onClick={openCommandMenu}
            className={`border-sidebar-foreground/25 bg-sidebar-accent/70 text-sidebar-foreground/85 hover:border-sidebar-foreground/60 focus-visible:ring-sidebar-ring flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border px-2.5 text-left text-[13px] transition-colors duration-150 hover:text-white focus-visible:ring-2 focus-visible:outline-none ${sidebarCollapsed ? "justify-center px-0" : ""}`}
            aria-label="Buscar sección"
            title={sidebarCollapsed ? "Buscar sección" : undefined}
          >
            <Search className="h-4 w-4" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1">Buscar sección</span>
                <kbd className="border-sidebar-foreground/25 text-sidebar-foreground/85 rounded border px-1 text-[10px]">
                  {searchShortcut}
                </kbd>
              </>
            )}
          </button>
        </div>

        <nav
          className="flex-1 space-y-1 overflow-y-auto px-2 py-3"
          aria-label="Navegación principal"
        >
          {items.slice(0, 4).map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              notificationCount={unreadCount}
              collapsed={sidebarCollapsed}
            />
          ))}
          <div className="border-sidebar-border my-3 border-t" />
          {items.slice(4).map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              notificationCount={unreadCount}
              collapsed={sidebarCollapsed}
            />
          ))}
        </nav>

        <div className="border-sidebar-border space-y-1 border-t p-2">
          <div
            className={`flex items-center gap-2 rounded-xl px-2 py-2 ${sidebarCollapsed ? "flex-col" : ""}`}
          >
            <span className="bg-sidebar-foreground/20 flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-semibold text-white">
              {initial}
            </span>
            {!sidebarCollapsed && (
              <span className="min-w-0 flex-1 truncate text-[12px] text-[#e4e4e7]">
                {displayName}
              </span>
            )}
            <button
              type="button"
              onClick={() => onSignOut()}
              className="text-sidebar-foreground/65 hover:bg-sidebar-accent focus-visible:ring-sidebar-ring flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.aside>

      <div className="min-w-0 flex-1">
        <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
          <DialogContent className="border-border bg-card top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-[24px] p-0 shadow-[0_20px_60px_rgba(0,0,0,0.16)] sm:top-[20%]">
            <DialogTitle className="sr-only">Buscar en Dctoralia</DialogTitle>
            <DialogDescription className="sr-only">
              Busca una sección y navega con el teclado.
            </DialogDescription>
            <div className="border-border flex items-center gap-3 border-b px-4">
              <Search className="text-muted-foreground h-4 w-4 shrink-0" />
              <Input
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                aria-label="Buscar una sección"
                placeholder="Buscar una sección..."
                className="h-12 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
              <kbd className="border-border text-muted-foreground hidden rounded border px-1.5 py-0.5 text-[10px] sm:inline-flex">
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
                      className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:outline-none"
                    >
                      <Icon className="text-muted-foreground h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })
              ) : (
                <p className="text-muted-foreground px-3 py-8 text-center text-sm">
                  No encontramos una sección con ese nombre.
                </p>
              )}
            </nav>
          </DialogContent>
        </Dialog>
        <div className="mobile-shell-header border-border bg-card border-b md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link
              href={role === "DOCTOR" ? "/dashboard" : "/patient/dashboard"}
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <span className="bg-sidebar text-sidebar-primary-foreground flex h-8 w-8 items-center justify-center rounded-xl">
                {role === "DOCTOR" ? (
                  <Stethoscope className="h-4 w-4" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
              </span>
              <span className="text-foreground">
                Dctoralia<span className="text-muted-foreground">.</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              {role === "DOCTOR" && workspaceOptions.length > 1 && (
                <div className="mr-1 w-10">
                  <WorkspaceSwitcher
                    workspaces={workspaceOptions}
                    activeClinicId={activeClinicId}
                    compact
                    switching={workspaceSwitching}
                    onSelect={onWorkspaceSelect}
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
                className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md p-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="bg-sidebar absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={openCommandMenu}
                className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md p-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                aria-label="Buscar sección"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onSignOut()}
                className="text-muted-foreground focus-visible:ring-ring flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md p-2 focus-visible:ring-2 focus-visible:outline-none"
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
            <AppearanceSwitcher />
            <nav className="grid gap-1" aria-label="Más secciones">
              {secondaryMobileItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreNavOpen(false)}
                    className={`focus-visible:ring-ring flex min-h-12 items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none ${active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    <Icon className="text-muted-foreground h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.icon === Bell && unreadCount > 0 && (
                      <span className="bg-primary rounded-full px-2 py-0.5 text-xs text-white">
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
          className="fixed right-3 bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-3 z-40 md:hidden"
          aria-label="Navegación móvil"
        >
          <GlassSurface
            backdrop="content"
            className="mobile-nav-surface"
            contentClassName="flex gap-1 p-1.5"
          >
            {primaryMobileItems.map((item) => (
              <MobileNavLink key={item.href} item={item} pathname={pathname} />
            ))}
            <button
              type="button"
              onClick={() => setMoreNavOpen(true)}
              className={`focus-visible:ring-ring active:bg-accent flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${moreNavOpen || secondaryMobileItems.some((item) => isActive(pathname, item.href)) ? "glass-bubble text-foreground" : "text-muted-foreground"}`}
              aria-haspopup="dialog"
              aria-expanded={moreNavOpen}
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
              <span>Más</span>
            </button>
          </GlassSurface>
        </nav>
        <div className="border-border hidden min-h-20 items-center justify-between gap-4 border-b px-8 md:flex">
          <p className="text-muted-foreground text-sm">
            {role === "DOCTOR" ? "Consultorio" : "Mi espacio"}
            <span className="px-3" aria-hidden="true">
              /
            </span>
            <span className="text-foreground font-medium">
              {items.find((item) => isActive(pathname, item.href))?.label ??
                "Dctoralia"}
            </span>
          </p>
          <AppearanceSwitcher />
        </div>
        <main
          id="main-content"
          className="min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
