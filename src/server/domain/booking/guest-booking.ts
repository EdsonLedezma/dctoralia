import { assignedConsultorio } from "./assigned-consultorio";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  hasTimeConflict,
  isSlotInsideSchedule,
} from "~/server/domain/appointments/appointment-time";
import { normalizeVoicePhone } from "~/server/integrations/vapi/phone-number";
import {
  localTimeToUtc,
  resolveTimeZone,
  zonedParts,
} from "~/server/domain/messaging/appointment-reminders";
import type { GuestBookingInput } from "./guest-booking.schema";
export class GuestBookingError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
export function bookingInstant(date: string, time: string, zone: string) {
  const day = new Date(date + "T00:00:00Z");
  const [hour, minute] = time.split(":").map(Number);
  if (hour === undefined || minute === undefined)
    throw new GuestBookingError("Horario inválido.");
  const parts = {
    year: day.getUTCFullYear(),
    month: day.getUTCMonth() + 1,
    day: day.getUTCDate(),
    hour,
    minute,
  };
  const instant = localTimeToUtc(parts, zone),
    roundtrip = zonedParts(instant, zone);
  if (
    roundtrip.year !== parts.year ||
    roundtrip.month !== parts.month ||
    roundtrip.day !== parts.day ||
    roundtrip.hour !== hour ||
    roundtrip.minute !== minute
  )
    throw new GuestBookingError("Horario no válido para el consultorio.");
  return instant;
}
export async function createGuestBooking(
  db: PrismaClient,
  input: GuestBookingInput,
  context: {
    actorUserId?: string;
    clinicId?: string;
    existingPatientId?: string;
    publicRequest: boolean;
  },
) {
  return db.$transaction(
    async (tx) => {
      const doctor = await tx.doctor.findFirst({
        where: {
          id: input.doctorId,
          ...(context.clinicId ? { clinicId: context.clinicId } : {}),
        },
        select: {
          id: true,
          clinicId: true,
          userId: true,
          clinic: { select: { timezone: true } },
        },
      });
      if (!doctor?.clinicId)
        throw new GuestBookingError("El consultorio no está disponible.", 404);
      if (context.publicRequest) {
        const settings = await tx.doctorBookingSettings.findUnique({
          where: { doctorId: doctor.id },
          select: { publicBookingEnabled: true },
        });
        if (settings && !settings.publicBookingEnabled)
          throw new GuestBookingError(
            "Este médico no recibe solicitudes públicas.",
            403,
          );
      }
      const instant = bookingInstant(
        input.date,
        input.time,
        resolveTimeZone(doctor.clinic?.timezone),
      );
      if (
        instant <= new Date() ||
        instant.getTime() > Date.now() + 90 * 86400_000
      )
        throw new GuestBookingError(
          "Selecciona un horario futuro dentro de los próximos 90 días.",
        );
      const service = await tx.service.findFirst({
        where: {
          id: input.serviceId,
          doctorId: doctor.id,
          clinicId: doctor.clinicId,
          isActive: true,
        },
        select: { duration: true },
      });
      if (!service || service.duration <= 0)
        throw new GuestBookingError("Servicio no disponible.", 404);
      const day = new Date(input.date + "T00:00:00Z");
      const windows = await tx.schedule.findMany({
        where: {
          doctorId: doctor.id,
          dayOfWeek: day.getUTCDay(),
          isActive: true,
        },
        select: { startTime: true, endTime: true, locationId: true },
      });
      if (
        !windows.some((window) =>
          isSlotInsideSchedule(
            input.time,
            service.duration,
            window.startTime,
            window.endTime,
          ),
        )
      )
        throw new GuestBookingError("Horario fuera de la jornada disponible.");
      const window = windows.find((item) =>
        isSlotInsideSchedule(
          input.time,
          service.duration,
          item.startTime,
          item.endTime,
        ),
      );
      const locations = await tx.clinicLocation.findMany({
        where: {
          clinicId: doctor.clinicId,
          isActive: true,
          ...(window?.locationId ? { id: window.locationId } : {}),
        },
        take: 2,
      });
      const location = assignedConsultorio(
        locations,
        doctor.clinicId,
        window?.locationId,
      );
      if (!location?.address?.trim())
        throw new GuestBookingError(
          "El doctor debe asignar un consultorio con dirección a este horario.",
          409,
        );
      const busy = await tx.appointment.findMany({
        where: {
          doctorId: doctor.id,
          clinicId: doctor.clinicId,
          date: { gte: day, lt: new Date(day.getTime() + 86400_000) },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        select: { time: true, duration: true },
      });
      if (hasTimeConflict(input.time, service.duration, busy))
        throw new GuestBookingError(
          "Ese horario ya fue ocupado. Elige otro.",
          409,
        );
      let patient = context.existingPatientId
        ? await tx.patient.findFirst({
            where: {
              id: context.existingPatientId,
              ...(context.publicRequest
                ? { userId: context.actorUserId }
                : {
                    appointments: {
                      some: { clinicId: doctor.clinicId, doctorId: doctor.id },
                    },
                  }),
            },
            select: { id: true, userId: true, phone: true },
          })
        : null;
      if (context.existingPatientId && !patient)
        throw new GuestBookingError(
          "No se pudo confirmar el paciente de este consultorio.",
          403,
        );
      if (
        patient &&
        context.publicRequest &&
        normalizeVoicePhone(patient.phone) !== input.phone
      ) {
        throw new GuestBookingError(
          "Usa el teléfono de tu ficha o actualízalo desde tu perfil antes de reservar.",
          409,
        );
      }
      if (!patient) {
        const user = await tx.user.create({
          data: {
            name: input.name,
            phone: input.phone,
            email: null,
            password: null,
            role: "PATIENT",
            isGuest: true,
          },
          select: { id: true },
        });
        patient = await tx.patient.create({
          data: {
            userId: user.id,
            phone: input.phone,
            clinicId: doctor.clinicId,
          },
          select: { id: true, userId: true, phone: true },
        });
      }
      await tx.clinicPatient.upsert({
        where: {
          clinicId_patientId: {
            clinicId: doctor.clinicId,
            patientId: patient.id,
          },
        },
        create: {
          clinicId: doctor.clinicId,
          patientId: patient.id,
          source: "MANUAL",
          addedByUserId: context.actorUserId,
        },
        update: {},
      });
      if (input.contactConsent) {
        for (const purpose of [
          "APPOINTMENT_REMINDER",
          "APPOINTMENT_CONFIRMATION",
          "PORTAL_INVITATION",
        ] as const) {
          await tx.patientMessageConsent.upsert({
            where: {
              patientId_clinicId_channel_purpose: {
                patientId: patient.id,
                clinicId: doctor.clinicId,
                channel: "WHATSAPP",
                purpose,
              },
            },
            create: {
              patientId: patient.id,
              clinicId: doctor.clinicId,
              channel: "WHATSAPP",
              purpose,
              consentedAt: new Date(),
            },
            update: { consentedAt: new Date(), revokedAt: null },
          });
        }
      }
      const appointment = await tx.appointment.create({
        data: {
          doctorId: doctor.id,
          clinicId: doctor.clinicId,
          patientId: patient.id,
          serviceId: input.serviceId,
          locationId: location.id,
          locationName: location.name,
          locationAddress: location.address,
          locationDirections: location.directions,
          locationLatitude: location.latitude,
          locationLongitude: location.longitude,
          date: day,
          time: input.time,
          duration: service.duration,
          status: "PENDING",
          reason:
            input.intake?.symptoms.slice(0, 500) ??
            "Cita registrada por recepción",
          intakeSymptoms: input.intake?.symptoms,
          intakeAllergies: input.intake?.allergies,
          intakeMedications: input.intake?.medications,
          intakeContext: input.intake?.context,
        },
        select: { id: true, status: true },
      });
      await tx.appointmentLifecycleEvent.create({
        data: {
          clinicId: doctor.clinicId,
          doctorId: doctor.id,
          patientId: patient.id,
          appointmentId: appointment.id,
          actorUserId: context.actorUserId,
          eventType: "CREATED",
          toStatus: "PENDING",
          scheduledAt: day,
          scheduledTime: input.time,
          metadata: {
            source: context.publicRequest ? "PUBLIC_BOOKING" : "RECEPTION",
          },
        },
      });
      await tx.notification.create({
        data: {
          recipientUserId: doctor.userId,
          clinicId: doctor.clinicId,
          doctorId: doctor.id,
          patientId: patient.id,
          appointmentId: appointment.id,
          type: "APPOINTMENT_BOOKED",
          title: "Nueva solicitud de cita",
          message: `Solicitud para el ${input.date} a las ${input.time}.`,
        },
      });
      return appointment;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10000,
    },
  );
}
