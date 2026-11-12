"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import type { GlassCard } from "@developer-hub/liquid-glass";
import { cn } from "~/lib/utils";

type GlassCardComponent = typeof GlassCard;
const stationaryPointer = { x: 0, y: 0 };

/** Web interpretation of Liquid Glass. Labels stay outside the SVG filter. */
export function GlassSurface({
  children,
  className,
  contentClassName,
  backdrop = "plain",
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  backdrop?: "plain" | "content" | "media";
}) {
  const [Optics, setOptics] = useState<ComponentType<
    React.ComponentProps<GlassCardComponent>
  > | null>(null);

  useEffect(() => {
    let active = true;
    const preferences = window.matchMedia(
      "(prefers-reduced-motion: reduce), (prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)",
    );
    const update = () => {
      if (
        backdrop === "plain" ||
        preferences.matches ||
        !CSS.supports("backdrop-filter", "blur(1px)")
      ) {
        setOptics(null);
        return;
      }
      void import("@developer-hub/liquid-glass")
        .then((module) => {
          if (active && !preferences.matches) setOptics(() => module.GlassCard);
        })
        .catch(() => {
          // The CSS material and semantic children remain fully usable.
        });
    };
    update();
    preferences.addEventListener("change", update);
    return () => {
      active = false;
      preferences.removeEventListener("change", update);
    };
  }, [backdrop]);

  return (
    <div
      data-slot="glass-surface"
      data-backdrop={backdrop}
      className={cn("glass-surface", className)}
    >
      {Optics && (
        <div aria-hidden="true" className="glass-optics">
          <Optics
            className="glass-optics-card"
            displacementScale={6}
            blurAmount={0.08}
            cornerRadius={20}
            mouseOffset={stationaryPointer}
            padding="0"
          >
            <span className="block h-full w-full" />
          </Optics>
        </div>
      )}
      <div className={cn("relative z-[1]", contentClassName)}>{children}</div>
    </div>
  );
}
