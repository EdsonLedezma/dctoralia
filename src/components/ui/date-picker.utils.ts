/** Calendar values represent a local day, never an instant converted to UTC. */
export function parseCalendarDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return;
  return date;
}

export function calendarDateValue(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function typedCalendarDate(value: string): string | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return;
  const result = `${match[3]}-${match[2]}-${match[1]}`;
  return parseCalendarDate(result) ? result : undefined;
}

export function isCalendarDateInRange(
  value: string,
  min?: string,
  max?: string,
) {
  return (
    Boolean(parseCalendarDate(value)) &&
    (!min || value >= min) &&
    (!max || value <= max)
  );
}
