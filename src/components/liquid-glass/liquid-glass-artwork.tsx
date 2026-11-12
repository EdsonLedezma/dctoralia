"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

type RenderState = "fallback" | "loading" | "ready";

/** The verified TypeGPU scene is optional; it never owns product content. */
export function LiquidGlassArtwork({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<RenderState>("fallback");

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const preferences = window.matchMedia(
      "(prefers-reduced-motion: reduce), (prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)",
    );
    let mounted = true;
    let visible = false;
    let generation = 0;
    let renderer: { dispose: () => void } | undefined;

    const stop = () => {
      generation += 1;
      renderer?.dispose();
      renderer = undefined;
      if (mounted) setState("fallback");
    };
    const update = () => {
      stop();
      if (
        !mounted ||
        !visible ||
        document.hidden ||
        preferences.matches ||
        !window.isSecureContext ||
        !navigator.gpu
      )
        return;

      const currentGeneration = generation;
      setState("loading");
      void import("./typegpu-renderer")
        .then(async ({ createRenderer }) => {
          if (!mounted || currentGeneration !== generation) return;
          const next = createRenderer({ canvas, onError: stop });
          renderer = next;
          await next.ready;
          if (mounted && currentGeneration === generation) setState("ready");
        })
        .catch((error: unknown) => {
          if (process.env.NODE_ENV === "development") {
            console.warn("Liquid Glass initialization:", error);
          }
          if (mounted && currentGeneration === generation) stop();
        });
    };

    const observer = new IntersectionObserver(([entry]) => {
      const nextVisible = entry?.isIntersecting ?? false;
      if (visible === nextVisible) return;
      visible = nextVisible;
      update();
    });
    observer.observe(container);
    document.addEventListener("visibilitychange", update);
    preferences.addEventListener("change", update);
    return () => {
      mounted = false;
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      preferences.removeEventListener("change", update);
      stop();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-render-state={state}
      className={cn(
        "liquid-artwork relative isolate overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      <div className="liquid-artwork-fallback absolute inset-0">
        <span className="liquid-artwork-orbit" />
        <span className="liquid-artwork-orbit" />
      </div>
      <canvas
        ref={canvasRef}
        className={cn(
          "pointer-events-none absolute inset-0 block h-full w-full grayscale transition-opacity duration-500",
          state === "ready" ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
