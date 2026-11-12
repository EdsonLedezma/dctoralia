"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { DopilotBrand } from "~/components/brand/dopilot-brand";

export function DopilotHeroBackground() {
  const { resolvedTheme } = useTheme();
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState("fallback");
  useEffect(() => {
    const element = host.current,
      output = canvas.current;
    if (!element || !output) return;
    let active = true,
      visible = false,
      generation = 0;
    let renderer: { dispose: () => void } | undefined;
    const preferences = matchMedia(
      "(prefers-reduced-motion: reduce), (prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)",
    );
    const stop = () => {
      generation++;
      renderer?.dispose();
      renderer = undefined;
      delete output.dataset.gpuFrame;
      if (active) setState("fallback");
    };
    const update = () => {
      stop();
      if (
        !active ||
        !visible ||
        document.hidden ||
        preferences.matches ||
        !navigator.gpu ||
        !window.isSecureContext
      )
        return;
      const current = generation;
      setState("loading");
      void import("./brand-renderer")
        .then(async ({ createBrandRenderer }) => {
          if (!active || current !== generation) return;
          const next = createBrandRenderer({
            canvas: output,
            dark: resolvedTheme === "dark",
            onError: stop,
          });
          renderer = next;
          await next.ready;
          if (active && current === generation) setState("ready");
        })
        .catch(() => {
          if (active && current === generation) stop();
        });
    };
    const observer = new IntersectionObserver(([entry]) => {
      const next = entry?.isIntersecting ?? false;
      if (next !== visible) {
        visible = next;
        update();
      }
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    preferences.addEventListener("change", update);
    return () => {
      active = false;
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      preferences.removeEventListener("change", update);
      stop();
    };
  }, [resolvedTheme]);
  return (
    <div
      ref={host}
      data-brand-render-state={state}
      aria-hidden="true"
      className="pointer-events-none relative isolate mx-auto mb-2 flex h-44 w-full max-w-4xl items-center justify-center overflow-hidden sm:mb-4 sm:h-60"
    >
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${state === "ready" ? "opacity-0" : "opacity-100"}`}
      >
        <DopilotBrand
          markOnly
          className={`dopilot-metal-fallback size-[min(43vw,190px)] sm:size-[min(24vw,240px)] ${state === "loading" ? "animate-pulse motion-reduce:animate-none" : ""}`}
        />
      </div>
      <canvas
        ref={canvas}
        className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${state === "ready" ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
