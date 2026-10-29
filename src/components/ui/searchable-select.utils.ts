export type SearchableOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
};

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function rankOptions(
  options: SearchableOption[],
  query: string,
): SearchableOption[] {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return options;
  const terms = normalizedQuery.split(" ").filter(Boolean);

  return options
    .map((option, index) => {
      const label = normalizeSearch(option.label);
      const haystack = normalizeSearch(
        [option.label, option.description, ...(option.keywords ?? [])]
          .filter(Boolean)
          .join(" "),
      );
      if (!terms.every((term) => haystack.includes(term))) return null;
      const score =
        (label === normalizedQuery ? 100 : 0) +
        (label.startsWith(normalizedQuery) ? 40 : 0) +
        (label.includes(normalizedQuery) ? 20 : 0) +
        terms.filter((term) => label.includes(term)).length * 5;
      return { option, score, index };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ option }) => option);
}
