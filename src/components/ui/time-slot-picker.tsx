"use client";

import * as React from "react";
import { Sun, Sunset, Moon, Clock } from "lucide-react";
import { cn } from "~/lib/utils";

export interface TimeSlotPickerProps {
  slots: string[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  className?: string;
  emptyMessage?: string;
}

interface SlotGroup {
  id: "morning" | "afternoon" | "evening";
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  slots: string[];
}

export function TimeSlotPicker({
  slots,
  selectedTime,
  onSelectTime,
  className,
  emptyMessage = "No hay horarios disponibles para esta fecha.",
}: TimeSlotPickerProps) {
  const groups = React.useMemo<SlotGroup[]>(() => {
    const morning: string[] = [];
    const afternoon: string[] = [];
    const evening: string[] = [];

    slots.forEach((slot) => {
      const [hourStr] = slot.split(":");
      const hour = parseInt(hourStr ?? "0", 10);
      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 18) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    const result: SlotGroup[] = [];
    if (morning.length > 0) {
      result.push({
        id: "morning",
        title: "Mañana",
        icon: Sun,
        slots: morning,
      });
    }
    if (afternoon.length > 0) {
      result.push({
        id: "afternoon",
        title: "Tarde",
        icon: Sunset,
        slots: afternoon,
      });
    }
    if (evening.length > 0) {
      result.push({
        id: "evening",
        title: "Noche",
        icon: Moon,
        slots: evening,
      });
    }

    return result;
  }, [slots]);

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#e5e5e5] bg-[#fafafa] p-6 text-center">
        <Clock className="mb-2 h-6 w-6 text-[#a3a3a3]" />
        <p className="text-sm text-[#737373]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {groups.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.id} className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#737373]">
              <Icon className="h-3.5 w-3.5 text-[#171717]" />
              <span>{group.title}</span>
              <span className="ml-auto rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-mono font-medium text-[#525252]">
                {group.slots.length}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3">
              {group.slots.map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => onSelectTime(time)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex items-center justify-center rounded-md border px-3 py-2 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171717]",
                      isSelected
                        ? "border-[#171717] bg-[#171717] text-white shadow-xs"
                        : "border-[#ebebeb] bg-white text-[#171717] hover:border-[#171717] hover:bg-[#fafafa]"
                    )}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
