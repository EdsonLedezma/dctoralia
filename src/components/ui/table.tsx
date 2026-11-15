"use client";

import * as React from "react";
import { TableController, TableStateContext } from "./table-controller";
import {
  tableNodes,
  tableText,
  tableRowModels,
  filterTableRows,
  pageTableRows,
  selectTableKeys,
  retainTableKeys,
  sameTableStrings,
} from "./table-data";
import { Checkbox } from "./checkbox";
import { cn } from "~/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <TableController>
      <div
        data-slot="table-container"
        className="relative w-full overflow-x-auto"
      >
        <table
          role="table"
          data-slot="table"
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    </TableController>
  );
}

function TableHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"thead">) {
  const state = React.useContext(TableStateContext);
  const rows = React.useMemo(() => tableNodes(children), [children]);
  const labels = React.useMemo(
    () =>
      rows.flatMap((row) =>
        React.isValidElement<{ children?: React.ReactNode }>(row)
          ? tableNodes(row.props.children).map(tableText)
          : [],
      ),
    [rows],
  );
  const setLabels = state?.setLabels;
  React.useEffect(() => {
    setLabels?.((previous) =>
      sameTableStrings(previous, labels) ? previous : labels,
    );
  }, [labels, setLabels]);
  const selected = state?.selected ?? new Set<string>();
  const keys = state?.pageKeys ?? [];
  const all = keys.length > 0 && keys.every((key) => selected.has(key));
  const some = keys.some((key) => selected.has(key));
  return (
    <thead
      role="rowgroup"
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    >
      {rows.map((row) => {
        if (
          !state ||
          !React.isValidElement<{ children?: React.ReactNode }>(row)
        )
          return row;
        return React.cloneElement(
          row,
          {},
          <>
            <th role="columnheader" scope="col" className="w-10 px-3 text-left">
              <Checkbox
                aria-label="Seleccionar filas de esta página"
                checked={all ? true : some ? "indeterminate" : false}
                disabled={!keys.length}
                onCheckedChange={(checked) =>
                  state.setSelected((previous) =>
                    selectTableKeys(previous, keys, checked === true),
                  )
                }
              />
            </th>
            {row.props.children}
          </>,
        );
      })}
    </thead>
  );
}

function TableBody({
  className,
  children,
  ...props
}: React.ComponentProps<"tbody">) {
  const state = React.useContext(TableStateContext);
  const rows = React.useMemo(() => tableRowModels(children), [children]);
  const query = state?.query ?? "";
  const onlySelected = state?.onlySelected ?? false;
  const selected = state?.selected;
  const filtered = React.useMemo(
    () => filterTableRows(rows, query, onlySelected, selected ?? new Set()),
    [rows, query, onlySelected, selected],
  );
  const result = React.useMemo(
    () =>
      pageTableRows(
        filtered,
        state?.page ?? 0,
        state?.size ?? Math.max(filtered.length, 1),
      ),
    [filtered, state?.page, state?.size],
  );
  const page = result.page;
  const visible = state ? result.rows : filtered;
  const pageKeys = React.useMemo(
    () => visible.map((row) => row.key),
    [visible],
  );
  const allowed = React.useMemo(
    () => new Set(rows.filter((row) => !row.placeholder).map((row) => row.key)),
    [rows],
  );
  const setTotal = state?.setTotal,
    setPageKeys = state?.setPageKeys,
    setSelected = state?.setSelected;
  React.useEffect(() => {
    setTotal?.(filtered.length);
  }, [filtered.length, setTotal]);
  React.useEffect(() => {
    setPageKeys?.((previous) =>
      sameTableStrings(previous, pageKeys) ? previous : pageKeys,
    );
  }, [pageKeys, setPageKeys]);
  React.useEffect(() => {
    setSelected?.((previous) => retainTableKeys(previous, allowed));
  }, [allowed, setSelected]);
  return (
    <tbody
      role="rowgroup"
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    >
      {visible.map((model, index) => {
        const row = model.element;
        if (!state) return row;
        const key = model.key;
        const toggle = () =>
          state.setSelected((previous) =>
            selectTableKeys(previous, [key], !previous.has(key)),
          );
        const cells = tableNodes(row.props.children).map((cell, column) =>
          React.isValidElement<
            React.ComponentProps<"td"> & { "data-label"?: string }
          >(cell)
            ? React.cloneElement(cell, {
                "data-label": state.labels[column] ?? "",
              })
            : cell,
        );
        return React.cloneElement(
          row,
          {
            tabIndex: 0,
            "aria-selected": selected?.has(key),
            className: cn(
              row.props.className,
              selected?.has(key) && "bg-muted/60",
              "cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2",
            ),
            onClick: (event: React.MouseEvent<HTMLTableRowElement>) => {
              row.props.onClick?.(event);
              if (
                event.defaultPrevented ||
                (event.target instanceof Element &&
                  event.target.closest(
                    "a,button,input,select,textarea,label,[role=checkbox],[role=menuitem],[contenteditable]:not([contenteditable=false])",
                  ))
              )
                return;
              event.currentTarget.focus();
              toggle();
            },
            onKeyDown: (event: React.KeyboardEvent<HTMLTableRowElement>) => {
              row.props.onKeyDown?.(event);
              if (
                !event.defaultPrevented &&
                event.target === event.currentTarget &&
                event.key === " "
              ) {
                event.preventDefault();
                toggle();
              }
            },
          },
          <>
            <td role="cell" className="table-selection-cell w-10 px-3">
              <Checkbox
                aria-label={`Seleccionar fila ${page * state.size + index + 1}`}
                checked={selected?.has(key) ?? false}
                onCheckedChange={(checked) =>
                  state.setSelected((previous) =>
                    selectTableKeys(previous, [key], checked === true),
                  )
                }
              />
            </td>
            {cells}
          </>,
        );
      })}
      {!visible.length && (
        <tr role="row">
          <td
            role="cell"
            colSpan={(state?.labels.length ?? 1) + (state ? 1 : 0)}
            className="text-muted-foreground py-8 text-center text-sm"
          >
            {rows.some((row) => !row.placeholder) || query || onlySelected
              ? "No hay resultados con estos filtros."
              : rows.find((row) => row.placeholder)?.element.props.children
                ? tableNodes(
                    rows.find((row) => row.placeholder)?.element.props.children,
                  ).map((cell) =>
                    React.isValidElement<{ children?: React.ReactNode }>(cell)
                      ? cell.props.children
                      : cell,
                  )
                : "No hay registros."}
          </td>
        </tr>
      )}
    </tbody>
  );
}
function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      role="row"
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      role="columnheader"
      scope="col"
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      role="cell"
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
