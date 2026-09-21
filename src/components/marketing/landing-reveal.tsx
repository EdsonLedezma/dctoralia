"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { ReactNode } from "react";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

export function LandingReveal({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduceMotion) return;

      gsap.from("[data-reveal]", {
        opacity: 0,
        y: 18,
        duration: 0.52,
        ease: "power2.out",
        stagger: 0.07,
        clearProps: "transform",
      });
    },
    { scope },
  );

  return <div ref={scope}>{children}</div>;
}
