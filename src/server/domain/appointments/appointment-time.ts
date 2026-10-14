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

export function getAvailableAppointmentSlots(
  date: Date,
  duration: number,
  scheduleStart: string,
  scheduleEnd: string,
  existingAppointments: ExistingAppointmentSlot[],
  now = new Date(),
): string[] {
  const startMinutes = timeToMinutes(scheduleStart);
  const endMinutes = timeToMinutes(scheduleEnd);
  if (startMinutes === null || endMinutes === null || duration <= 0) return [];

  const calendarDate = (value: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
    }).format(value);
  const isToday = calendarDate(date) === calendarDate(now);
  const localClock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const nowMinutes = timeToMinutes(localClock) ?? 0;
  const slots: string[] = [];

  for (
    let minute = startMinutes;
    minute + duration <= endMinutes;
    minute += 15
  ) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    if (
      (!isToday || minute > nowMinutes) &&
      isSlotInsideSchedule(time, duration, scheduleStart, scheduleEnd) &&
      !hasTimeConflict(time, duration, existingAppointments)
    ) {
      slots.push(time);
    }
  }

  return slots;
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
  const calendarDate = (value: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
    }).format(value);

  return calendarDate(date) >= calendarDate(now);
}

export function isAppointmentTimeInFuture(
  date: Date,
  time: string,
  now = new Date(),
): boolean {
  const calendarDate = (value: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
    }).format(value);
  const appointmentDay = calendarDate(date);
  const today = calendarDate(now);

  if (appointmentDay !== today) return appointmentDay > today;

  const localClock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const nowMinutes = timeToMinutes(localClock);
  const appointmentMinutes = timeToMinutes(time);

  return (
    appointmentMinutes !== null &&
    nowMinutes !== null &&
    appointmentMinutes > nowMinutes
  );
}
