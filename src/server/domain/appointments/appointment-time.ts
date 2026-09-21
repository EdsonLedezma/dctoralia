export type ExistingAppointmentSlot = {
  time: string;
  duration: number;
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function timeToMinutes(time: string): number | null {
  if (!TIME_PATTERN.test(time)) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);
  if (hours === undefined || minutes === undefined) {
    return null;
  }

  return hours * 60 + minutes;
}

export function isSlotInsideSchedule(
  time: string,
  duration: number,
  scheduleStart: string,
  scheduleEnd: string,
): boolean {
  const slotStart = timeToMinutes(time);
  const windowStart = timeToMinutes(scheduleStart);
  const windowEnd = timeToMinutes(scheduleEnd);

  if (slotStart === null || windowStart === null || windowEnd === null) {
    return false;
  }

  return slotStart >= windowStart && slotStart + duration <= windowEnd;
}

export function hasTimeConflict(
  time: string,
  duration: number,
  existingAppointments: ExistingAppointmentSlot[],
): boolean {
  const candidateStart = timeToMinutes(time);
  if (candidateStart === null) {
    return true;
  }

  const candidateEnd = candidateStart + duration;

  return existingAppointments.some((appointment) => {
    const existingStart = timeToMinutes(appointment.time);
    if (existingStart === null) {
      return true;
    }

    const existingEnd = existingStart + appointment.duration;
    return candidateStart < existingEnd && candidateEnd > existingStart;
  });
}

export function getUtcDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

export function isTodayOrFuture(date: Date, now = new Date()): boolean {
  return getUtcDayBounds(date).start >= getUtcDayBounds(now).start;
}
