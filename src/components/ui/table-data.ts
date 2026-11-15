import * as React from "react";

export type TableRowElement = React.ReactElement<React.ComponentProps<"tr">>;
export type TableRowModel = {
  key: string;
  element: TableRowElement;
  text: string;
  placeholder: boolean;
};

/** Flatten fragments as well as arrays, preserving the complete keyed path. */
export function tableNodes(
  children: React.ReactNode,
  prefix = "",
): React.ReactNode[] {
  return React.Children.toArray(children).flatMap((node) => {
    if (
      React.isValidElement<{ children?: React.ReactNode }>(node) &&
      node.type === React.Fragment
    ) {
      return tableNodes(
        node.props.children,
        prefix + String(node.key ?? "fragment") + "/",
      );
    }
    return React.isValidElement(node) && prefix
      ? [React.cloneElement(node, { key: prefix + String(node.key) })]
      : [node];
  });
}

export function tableText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node))
    return node.map((child: React.ReactNode) => tableText(child)).join(" ");
  if (
    React.isValidElement<{
      children?: React.ReactNode;
      "aria-hidden"?: boolean | "true" | "false";
    }>(node)
  ) {
    if (
      node.props["aria-hidden"] === true ||
      node.props["aria-hidden"] === "true"
    )
      return "";
    if (
      typeof node.type === "string" &&
      ["button", "input", "select", "textarea"].includes(node.type)
    )
      return "";
    return tableText(node.props.children);
  }
  return "";
}

export function isEmptyTableRow(node: React.ReactNode): boolean {
  if (!React.isValidElement<{ children?: React.ReactNode }>(node)) return false;
  const cells = tableNodes(node.props.children);
  return (
    cells.length === 1 &&
    React.isValidElement<{ colSpan?: number }>(cells[0]) &&
    (cells[0].props.colSpan ?? 1) > 1
  );
}

export function tableRowModels(children: React.ReactNode): TableRowModel[] {
  return tableNodes(children).flatMap((node, index) =>
    React.isValidElement<React.ComponentProps<"tr">>(node)
      ? [
          {
            key: String(node.key ?? index),
            element: node,
            text: tableText(node),
            placeholder: isEmptyTableRow(node),
          },
        ]
      : [],
  );
}

export function normalizeTableQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .trim();
}

export function filterTableRows(
  rows: readonly TableRowModel[],
  query: string,
  onlySelected: boolean,
  selected: ReadonlySet<string>,
): TableRowModel[] {
  const terms = normalizeTableQuery(query).split(/\s+/).filter(Boolean);
  return rows.filter(
    (row) =>
      !row.placeholder &&
      (!onlySelected || selected.has(row.key)) &&
      terms.every((term) => normalizeTableQuery(row.text).includes(term)),
  );
}

export function pageTableRows<T>(
  rows: readonly T[],
  page: number,
  size: number,
) {
  const pageSize = Math.max(1, Math.floor(Number.isFinite(size) ? size : 25));
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const activePage = Math.max(
    0,
    Math.min(Math.floor(Number.isFinite(page) ? page : 0), pages - 1),
  );
  return {
    page: activePage,
    pages,
    rows: rows.slice(activePage * pageSize, (activePage + 1) * pageSize),
    first: rows.length ? activePage * pageSize + 1 : 0,
    last: Math.min((activePage + 1) * pageSize, rows.length),
  };
}

export function selectTableKeys(
  previous: ReadonlySet<string>,
  keys: readonly string[],
  selected: boolean,
): Set<string> {
  const next = new Set(previous);
  for (const key of keys) {
    if (selected) next.add(key);
    else next.delete(key);
  }
  return next;
}

export function retainTableKeys(
  previous: Set<string>,
  keys: ReadonlySet<string>,
): Set<string> {
  const next = new Set([...previous].filter((key) => keys.has(key)));
  return next.size === previous.size ? previous : next;
}

export function sameTableStrings(
  first: readonly string[],
  second: readonly string[],
): boolean {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}
