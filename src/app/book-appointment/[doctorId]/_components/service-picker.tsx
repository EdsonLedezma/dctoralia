"use client";
import { RadioGroup } from "radix-ui";
import { Check, Clock3 } from "lucide-react";
import type { RouterOutputs } from "~/trpc/react";
type Service = NonNullable<
  RouterOutputs["services"]["publicGetByDoctor"]["result"]
>[number];

export function ServicePicker({
  services,
  value,
  onChange,
}: {
  services: Service[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <RadioGroup.Root
      aria-label="Tipo de consulta"
      value={value}
      onValueChange={onChange}
      className="space-y-3"
    >
      {services.map((service) => (
        <RadioGroup.Item
          key={service.id}
          value={service.id}
          className="border-border bg-card text-foreground hover:border-foreground/30 focus-visible:ring-ring data-[state=checked]:border-foreground/40 data-[state=checked]:bg-accent/60 flex min-h-24 w-full cursor-pointer items-center gap-3 rounded-[20px] border p-4 text-left transition-[background-color,border-color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{service.name}</span>
            {service.description && (
              <span className="text-muted-foreground mt-1 block text-xs leading-5">
                {service.description}
              </span>
            )}
            <span className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
              <Clock3 className="size-3.5" />
              {service.duration} minutos
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            ${Number(service.price).toLocaleString("es-MX")}
          </span>
          <span className="border-border flex size-5 shrink-0 items-center justify-center rounded-full border">
            <RadioGroup.Indicator>
              <Check className="size-3.5" />
            </RadioGroup.Indicator>
          </span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
