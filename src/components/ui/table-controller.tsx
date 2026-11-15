"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  List,
  Grid2X2,
  SlidersHorizontal,
  X,
  Search,
} from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Checkbox } from "./checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./dialog";

type TableState = {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  size: number;
  total: number;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
  selected: Set<string>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  pageKeys: string[];
  setPageKeys: React.Dispatch<React.SetStateAction<string[]>>;
  query: string;
  onlySelected: boolean;
  grid: boolean;
  labels: string[];
  setLabels: React.Dispatch<React.SetStateAction<string[]>>;
};
export const TableStateContext = React.createContext<TableState | null>(null);

export function TableController({ children }: { children: React.ReactNode }) {
  const [page, setPage] = React.useState(0);
  const [size, setSize] = React.useState(25);
  const [total, setTotal] = React.useState(0);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pageKeys, setPageKeys] = React.useState<string[]>([]);
  const [labels, setLabels] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState("");
  const [onlySelected, setOnlySelected] = React.useState(false);
  const [grid, setGrid] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const container = React.useRef<HTMLDivElement>(null);
  const pages = Math.max(1, Math.ceil(total / size));
  const activePage = Math.min(page, pages - 1);
  React.useEffect(() => {
    setPage((previous) => Math.min(previous, pages - 1));
  }, [pages]);
  React.useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "k" ||
        !container.current?.contains(document.activeElement)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setFiltersOpen(true);
    };
    window.addEventListener("keydown", shortcut, true);
    return () => window.removeEventListener("keydown", shortcut, true);
  }, []);
  const clearSelection = () => {
    setSelected(new Set());
    setOnlySelected(false);
    setPage(0);
  };
  return (
    <TableStateContext.Provider
      value={{
        page: activePage,
        setPage,
        size,
        total,
        setTotal,
        selected,
        setSelected,
        pageKeys,
        setPageKeys,
        query,
        onlySelected,
        grid,
        labels,
        setLabels,
      }}
    >
      <div
        ref={container}
        className="data-table"
        data-view={grid ? "grid" : "list"}
      >
        <div className="border-border/60 flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <div className="relative min-w-40 flex-1">
            <Search
              aria-hidden="true"
              className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            />
            <Input
              aria-label="Buscar en esta tabla"
              placeholder="Buscar…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              className="bg-muted/30 h-9 border-0 pl-8 text-xs shadow-none"
            />
          </div>
          <div
            role="group"
            aria-label="Presentación"
            className="border-border/60 flex rounded-xl border p-0.5"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={!grid}
              onClick={() => setGrid(false)}
              className={
                !grid ? "bg-muted gap-1 px-2 text-xs" : "gap-1 px-2 text-xs"
              }
            >
              <List className="size-3.5" />
              Lista
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={grid}
              onClick={() => setGrid(true)}
              className={
                grid ? "bg-muted gap-1 px-2 text-xs" : "gap-1 px-2 text-xs"
              }
            >
              <Grid2X2 className="size-3.5" />
              Grid
            </Button>
          </div>
          {(query || onlySelected) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setQuery("");
                setOnlySelected(false);
                setPage(0);
              }}
              className="text-xs"
            >
              Quitar filtros
            </Button>
          )}
        </div>
        {children}
        <div className="table-bottom-bar flex justify-center p-3">
          <div
            className="border-border bg-card flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border px-3 py-1.5 text-xs shadow-sm"
            aria-label="Controles de tabla"
          >
            {selected.size ? (
              <>
                <span aria-live="polite">
                  {selected.size} seleccionado{selected.size === 1 ? "" : "s"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2 text-xs"
                  onClick={() => setFiltersOpen(true)}
                >
                  <SlidersHorizontal className="size-3.5" />
                  <kbd className="text-muted-foreground hidden text-[10px] sm:inline">
                    Ctrl K
                  </kbd>
                  Filtros
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar selección"
                  onClick={clearSelection}
                >
                  <X className="size-3.5" />
                </Button>
              </>
            ) : (
              <>
                <span aria-live="polite">
                  {total ? activePage * size + 1 : 0}–
                  {Math.min((activePage + 1) * size, total)} de {total}
                </span>
                <label className="flex items-center gap-1">
                  <select
                    aria-label="Filas por página"
                    className="bg-transparent px-1 py-2 text-xs"
                    value={size}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (![10, 25, 50, 100].includes(value)) return;
                      setSize(value);
                      setPage(0);
                    }}
                  >
                    {[10, 25, 50, 100].map((value) => (
                      <option key={value} value={value}>
                        {value} / página
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={activePage === 0}
                  aria-label="Página anterior"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span>
                  {activePage + 1}/{pages}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={activePage + 1 >= pages}
                  aria-label="Página siguiente"
                  onClick={() => setPage(activePage + 1)}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Filtrar tabla</DialogTitle>
              <DialogDescription>
                Busca en los datos o limita la vista a las filas seleccionadas.
              </DialogDescription>
            </DialogHeader>
            <Input
              aria-label="Texto del filtro"
              placeholder="Nombre, fecha, estado o servicio…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <Checkbox
                checked={onlySelected}
                disabled={!selected.size}
                onCheckedChange={(value) => {
                  setOnlySelected(value === true);
                  setPage(0);
                }}
              />
              Mostrar solo seleccionados ({selected.size})
            </label>
            <Button type="button" onClick={() => setFiltersOpen(false)}>
              Ver resultados
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </TableStateContext.Provider>
  );
}
