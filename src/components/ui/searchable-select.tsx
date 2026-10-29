"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { rankOptions, type SearchableOption } from "./searchable-select.utils";

type Props = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
};

export function SearchableSelect({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder = "Buscar...",
  emptyMessage = "No encontramos resultados.",
  disabled = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const selected = options.find((option) => option.value === value);
  const matches = useMemo(() => rankOptions(options, query), [options, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setPortalContainer(
          nextOpen
            ? (document
                .getElementById(id)
                ?.closest<HTMLElement>('[data-slot="dialog-content"]') ?? null)
            : null,
        );
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={`${id}-suggestions`}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-[#d7e5dc] bg-white px-3.5 text-left text-sm text-[#173d32] shadow-[0_1px_2px_rgba(25,63,48,0.03)] transition-[border-color,box-shadow,background-color] duration-150 hover:border-[#83b59e] hover:bg-[#fbfefb] focus-visible:border-[#328267] focus-visible:ring-2 focus-visible:ring-[#b8dfc9] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
            className,
          )}
        >
          <span
            className={cn("min-w-0 truncate", !selected && "text-[#75887d]")}
          >
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown
            className="size-4 shrink-0 text-[#5e8d78]"
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        container={portalContainer}
        align="start"
        sideOffset={6}
        className="w-(--radix-popover-trigger-width) min-w-64 overflow-hidden rounded-xl border-[#d7e5dc] p-0 shadow-[0_18px_50px_-18px_rgba(21,71,51,0.24)]"
      >
        <Command shouldFilter={false} className="rounded-xl">
          <CommandInput
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
            aria-label={`Buscar ${label.toLocaleLowerCase("es-MX")}`}
            className="h-11"
          />
          <CommandList id={`${id}-suggestions`} className="max-h-64 p-1">
            {matches.length === 0 ? (
              <p className="px-3 py-7 text-center text-sm text-[#71877a]">
                {emptyMessage}
              </p>
            ) : (
              matches.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="min-h-11 gap-3 rounded-lg px-3 py-2 data-[selected=true]:bg-[#edf7f0] data-[selected=true]:text-[#173d32]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="mt-0.5 block truncate text-xs text-[#71877a]">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {option.value === value && (
                    <Check
                      className="size-4 shrink-0 text-[#328267]"
                      aria-hidden="true"
                    />
                  )}
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
