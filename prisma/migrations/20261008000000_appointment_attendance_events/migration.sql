-- Attendance timestamps are represented by immutable lifecycle events.
ALTER TYPE "AppointmentLifecycleEventType" ADD VALUE IF NOT EXISTS 'CHECKED_IN';
ALTER TYPE "AppointmentLifecycleEventType" ADD VALUE IF NOT EXISTS 'CONSULTATION_STARTED';
