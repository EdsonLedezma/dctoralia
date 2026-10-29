export function normalizeVoicePhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  const mexican = digits.length === 10 ? `52${digits}` : digits;
  return /^\d{11,15}$/.test(mexican) ? `+${mexican}` : null;
}
