"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "~/components/ui/button";

/** One quiet control; the icon reflects the appearance currently being used. */
export function AppearanceSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  const label = dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
  const Icon = dark ? Moon : Sun;
  return (
    <Button
      type="button"
      variant="floating"
      size="icon"
      className="shrink-0 rounded-full"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      disabled={!mounted}
    >
      <Icon className="size-[18px]" aria-hidden="true" strokeWidth={1.7} />
    </Button>
  );
}
