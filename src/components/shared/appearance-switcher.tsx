"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { SegmentedControl } from "~/components/ui/segmented-control";

const options = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export function AppearanceSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const selected =
    mounted && options.some((option) => option.value === theme)
      ? theme
      : "light";
  return (
    <SegmentedControl
      label="Apariencia"
      value={selected ?? "light"}
      options={options}
      onValueChange={setTheme}
      disabled={!mounted}
      iconOnly
    />
  );
}
