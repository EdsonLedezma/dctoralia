import { z } from "zod";

export const validationFeedbackInput = z
  .object({
    body: z
      .string()
      .trim()
      .min(3, "Escribe al menos tres caracteres.")
      .max(2000, "Tu nota puede tener hasta 2000 caracteres."),
  })
  .strict();

export function validationWindow(
  enabled: string,
  until: string,
  now = new Date(),
) {
  const closesAt = new Date(until);
  return {
    enabled:
      enabled === "true" &&
      Number.isFinite(closesAt.valueOf()) &&
      closesAt > now,
    closesAt: Number.isFinite(closesAt.valueOf()) ? closesAt : null,
  };
}
