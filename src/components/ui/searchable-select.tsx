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
  const selected = options.find((option) => option.value === value);
  const matches = useMemo(() => rankOptions(options, query), [options, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
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
            "glass-bubble flex h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-full border px-3.5 text-left text-sm transition-[box-shadow,background-color] duration-150 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45",
            className,
          )}
        >
          <span
            className={cn(
              "min-w-0 truncate",
              !selected && "text-muted-foreground",
            )}
          >
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-(--radix-popover-trigger-width) min-w-64 overflow-hidden p-0"
      >
        <Command shouldFilter={false} className="rounded-[24px] bg-transparent">
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
              <p className="text-muted-foreground px-3 py-7 text-center text-sm">
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
                  className="data-[selected=true]:bg-accent data-[selected=true]:text-foreground min-h-11 gap-3 rounded-xl px-3 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {option.value === value && (
                    <Check
                      className="text-foreground size-4 shrink-0"
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
