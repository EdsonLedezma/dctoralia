import { z } from "zod";
import { normalizeVoicePhone } from "~/server/integrations/vapi/phone-number";
export const bookingPhone = z
  .string()
  .trim()
  .min(7)
  .max(40)
  .transform((value, ctx) => {
    const phone = normalizeVoicePhone(value);
    if (!phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Escribe un teléfono válido con lada.",
      });
      return z.NEVER;
    }
    return phone;
  });
export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + "T00:00:00Z");
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
    );
  }, "Fecha inválida.");
export const contactInput = z.object({
  name: z.string().trim().min(2).max(120),
  phone: bookingPhone,
  contactConsent: z.boolean().default(false),
});
export const bookingInput = contactInput
  .extend({
    doctorId: z.string().cuid(),
    serviceId: z.string().cuid(),
    locationId: z.string().cuid().optional(),
    date: calendarDate,
    time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    intake: z
      .object({
        symptoms: z.string().trim().min(3).max(2000),
        allergies: z.string().trim().max(1000).default(""),
        medications: z.string().trim().max(1000).default(""),
        context: z.string().trim().max(2000).default(""),
      })
      .optional(),
  })
  .strict();
export type GuestBookingInput = z.infer<typeof bookingInput>;
