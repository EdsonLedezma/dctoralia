"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
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
  { label: "Mi perfil", href: "/patient/profile", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" || href === "/patient/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-9 shrink-0 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-[background-color,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none active:scale-[0.99] ${
        active
          ? "bg-[#1f1f1f] text-white"
          : "text-[#a1a1aa] hover:bg-[#161616] hover:text-[#f4f4f5]"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.1 : 1.8} />
      <span className="truncate">{item.label}</span>
    </Link>
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
  const { data: session } = useSession();
  const items = role === "DOCTOR" ? doctorNav : patientNav;
  const displayName =
    session?.user?.name ?? (role === "DOCTOR" ? "Consultorio" : "Paciente");
  const initial = displayName.slice(0, 1).toUpperCase();
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

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
    <div className="min-h-[100dvh] bg-[#fafafa] text-[#171717] md:flex">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-[#171717] px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Saltar al contenido
      </a>

      <aside className="hidden w-[208px] shrink-0 border-r border-[#252525] bg-[#050505] text-[#a1a1aa] md:flex md:flex-col">
        <div className="border-b border-[#252525] p-2">
          <button
            type="button"
            className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left transition-colors duration-150 hover:bg-[#161616] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
            aria-label="Cambiar espacio de trabajo"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#262626] text-[11px] font-medium text-white">
              {initial}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#f4f4f5]">
              {displayName}
            </span>
            <span className="rounded border border-[#333] px-1.5 py-0.5 text-[10px] text-[#a1a1aa]">
              {role === "DOCTOR" ? "Pro" : "Paciente"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </button>
        </div>

        <div className="px-2 pt-2">
          <button
            type="button"
            onClick={openCommandMenu}
            className="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-[#262626] bg-[#0b0b0b] px-2.5 text-left text-[13px] text-[#8f8f98] transition-colors duration-150 hover:border-[#3a3a3a] hover:text-[#f4f4f5] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
            aria-label="Buscar en Dctoralia"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1">Buscar</span>
            <kbd className="rounded border border-[#333] px-1 text-[10px] text-[#8f8f98]">
              ⌘ K
            </kbd>
          </button>
        </div>

        <nav
          className="flex-1 space-y-1 overflow-y-auto px-2 py-3"
          aria-label="Navegación principal"
        >
          {items.slice(0, 3).map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
          <div className="my-3 border-t border-[#252525]" />
          {items.slice(3).map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="space-y-1 border-t border-[#252525] p-2">
          <button
            type="button"
            className="flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[13px] text-[#a1a1aa] transition-colors duration-150 hover:bg-[#161616] hover:text-[#f4f4f5] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
          >
            <CircleHelp className="h-4 w-4" />
            Ayuda
          </button>
          <div className="flex items-center gap-2 rounded-md px-2 py-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#262626] text-[11px] font-medium text-white">
              {initial}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-[#d4d4d8]">
              {displayName}
            </span>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#71717a] transition-colors duration-150 hover:bg-[#1f1f1f] hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
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
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mobile-shell-header border-b border-[#ebebeb] bg-white md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link
              href={role === "DOCTOR" ? "/dashboard" : "/patient/dashboard"}
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#171717] text-white">
                {role === "DOCTOR" ? (
                  <Stethoscope className="h-4 w-4" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
              </span>
              Dctoralia
            </Link>
            <div className="flex items-center gap-1">
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
          <nav
            className="flex touch-pan-y gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Navegación móvil"
          >
            {items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
        </div>
        <main id="main-content" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
