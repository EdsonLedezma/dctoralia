import { describe, expect, it } from "vitest";
import { createElement, Fragment } from "react";
import {
  filterTableRows,
  isEmptyTableRow,
  pageTableRows,
  retainTableKeys,
  selectTableKeys,
  tableNodes,
  tableRowModels,
  tableText,
} from "./table-data";

function row(id: string, name = id) {
  return createElement(
    "tr",
    { key: id },
    createElement(
      "td",
      null,
      createElement("a", { href: "/patient/" + id }, name),
    ),
    createElement("td", null, "Confirmada"),
  );
}

describe("table data and selection", () => {
  it("paginates all rows and clamps the page when records disappear", () => {
    const rows = Array.from({ length: 51 }, (_, index) => row(String(index)));
    expect(pageTableRows(rows, 0, 25).rows).toHaveLength(25);
    expect(pageTableRows(rows, 1, 25).first).toBe(26);
    expect(pageTableRows(rows, 2, 25).rows).toHaveLength(1);
    const afterRemoval = pageTableRows(rows.slice(0, 12), 2, 25);
    expect(afterRemoval.page).toBe(0);
    expect(afterRemoval.first).toBe(1);
    expect(afterRemoval.last).toBe(12);
    expect(pageTableRows([], 9, 25)).toMatchObject({
      page: 0,
      first: 0,
      last: 0,
      pages: 1,
    });
  });
  it("searches names with accents and multiple terms without counting placeholders", () => {
    const empty = createElement(
      "tr",
      { key: "empty" },
      createElement("td", { colSpan: 2 }, "No hay citas"),
    );
    const models = tableRowModels([
      row("one", "María López"),
      row("two", "Ana"),
      empty,
    ]);
    expect(
      filterTableRows(models, "maria confirmada", false, new Set()),
    ).toHaveLength(1);
    expect(
      filterTableRows(models, "lopez", false, new Set())[0]?.text,
    ).toContain("María");
    expect(filterTableRows(models, "", false, new Set())).toHaveLength(2);
    expect(isEmptyTableRow(empty)).toBe(true);
  });
  it("retains keyed selection across sorting, filtering and paging", () => {
    const initial = tableRowModels([row("one"), row("two"), row("three")]);
    const secondKey = initial[1]?.key ?? "";
    const selected = selectTableKeys(new Set(), [secondKey], true);
    const reordered = tableRowModels([row("three"), row("one"), row("two")]);
    expect(
      filterTableRows(reordered, "", true, selected).map((item) => item.key),
    ).toEqual([secondKey]);
    expect(
      retainTableKeys(selected, new Set(reordered.map((item) => item.key))),
    ).toBe(selected);
    expect(
      retainTableKeys(selected, new Set([initial[0]?.key ?? ""])).size,
    ).toBe(0);
  });
  it("selects and deselects only the current page without mutating the prior set", () => {
    const previous = new Set(["other-page"]);
    const withPage = selectTableKeys(previous, ["first", "second"], true);
    expect([...previous]).toEqual(["other-page"]);
    expect([...withPage]).toEqual(["other-page", "first", "second"]);
    expect([...selectTableKeys(withPage, ["first", "second"], false)]).toEqual([
      "other-page",
    ]);
  });
  it("flattens fragments while keeping sibling keys distinct", () => {
    const nodes = [
      createElement(Fragment, { key: "morning" }, row("one")),
      createElement(Fragment, { key: "afternoon" }, row("one")),
    ];
    expect(tableNodes(nodes)).toHaveLength(2);
    const models = tableRowModels(nodes);
    expect(new Set(models.map((model) => model.key)).size).toBe(2);
  });
  it("does not search hidden copy or native action button labels", () => {
    expect(
      tableText(
        createElement(
          "td",
          null,
          "Paciente",
          createElement("span", { "aria-hidden": true }, "hidden secret"),
          createElement("button", null, "Eliminar"),
        ),
      ),
    ).toBe("Paciente  ");
  });
});
