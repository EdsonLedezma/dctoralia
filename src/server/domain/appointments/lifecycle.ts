import type {
  AppointmentLifecycleEventType,
  AppointmentStatus,
  Prisma,
} from "@prisma/client";

type LifecycleEventInput = {
  clinicId: string | null;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  actorUserId: string;
  eventType: AppointmentLifecycleEventType;
  fromStatus?: AppointmentStatus | null;
  toStatus: AppointmentStatus;
  scheduledAt: Date;
  scheduledTime: string;
  metadata?: Prisma.InputJsonValue;
};

export function recordAppointmentLifecycleEvent(
  tx: Prisma.TransactionClient,
  input: LifecycleEventInput,
) {
  return tx.appointmentLifecycleEvent.create({ data: input });
}
