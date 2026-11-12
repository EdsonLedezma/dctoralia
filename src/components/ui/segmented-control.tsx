"use client";

import { useId } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  label,
  iconOnly = false,
  disabled = false,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly Option<T>[];
  label: string;
  iconOnly?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const reduceMotion = useReducedMotion();
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(next) => {
        const option = options.find((item) => item.value === next);
        if (option) onValueChange(option.value);
      }}
      aria-label={label}
      orientation="horizontal"
      disabled={disabled}
      data-slot="segmented-control"
      className={cn(
        "glass-track inline-flex w-fit items-center gap-1 p-1",
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            aria-label={option.label}
            title={iconOnly ? option.label : undefined}
            className={cn(
              "text-foreground focus-visible:ring-ring focus-visible:ring-offset-background relative isolate inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45",
              iconOnly && "min-w-14 px-3",
            )}
          >
            {active && (
              <motion.span
                aria-hidden="true"
                layoutId={id}
                className="glass-thumb absolute inset-0 -z-10"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", bounce: 0, duration: 0.28 }
                }
              />
            )}
            {Icon && (
              <Icon
                aria-hidden="true"
                className="size-[19px]"
                strokeWidth={1.7}
              />
            )}
            <span className={iconOnly ? "sr-only" : undefined}>
              {option.label}
            </span>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}
