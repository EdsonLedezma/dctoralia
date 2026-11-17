type LocationCandidate = {
  id: string;
  clinicId: string;
  isActive: boolean;
  address: string | null;
};
/** A patient never supplies the destination; legacy schedules can use a sole active site. */
export function assignedConsultorio<T extends LocationCandidate>(
  locations: readonly T[],
  clinicId: string,
  assignedId?: string | null,
): T | null {
  const eligible = locations.filter(
    (item) =>
      item.clinicId === clinicId &&
      item.isActive &&
      (!assignedId || item.id === assignedId),
  );
  if (eligible.length !== 1) return null;
  const location = eligible[0];
  return location?.address?.trim() ? location : null;
}
