/**
 * Utilidades para parsear y validar fechas y horas desde VAPI
 */

/**
 * Parsea una fecha que puede venir en diferentes formatos:
 * - "2025-10-23" (ISO date string)
 * - "2025-10-23T10:30:00Z" (ISO datetime string)
 * - 1729728000000 (timestamp en milisegundos)
 * - "23/10/2025" (formato latino)
 * - "10/23/2025" (formato US)
 * 
 * @param dateInput - String, número o Date
 * @returns Date object o null si no es válido
 */
export function parseDate(dateInput: string | number | Date): Date | null {
  if (!dateInput) return null;
  
  // Si ya es un Date
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  
  // Si es un timestamp numérico
  if (typeof dateInput === 'number') {
    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Si es string
  if (typeof dateInput === 'string') {
    // Intentar parsear como ISO string primero
    let date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Intentar formato DD/MM/YYYY
    const latinPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const latinMatch = dateInput.match(latinPattern);
    if (latinMatch) {
      const [, day, month, year] = latinMatch;
      date = new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
      if (!isNaN(date.getTime())) return date;
    }
    
    // Intentar formato MM/DD/YYYY
    const usPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const usMatch = dateInput.match(usPattern);
    if (usMatch) {
      const [, month, day, year] = usMatch;
      date = new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  return null;
}

/**
 * Valida y normaliza una hora en formato HH:mm
 * Acepta formatos:
 * - "10:30"
 * - "9:00"
 * - "14:45"
 * - "1030" (sin dos puntos)
 * - 1030 (número)
 * 
 * @param timeInput - String o número representando la hora
 * @returns String en formato HH:mm o null si no es válido
 */
export function parseTime(timeInput: string | number): string | null {
  if (!timeInput && timeInput !== 0) return null;
  
  let timeStr = String(timeInput);
  
  // Si ya tiene formato HH:mm
  const colonPattern = /^(\d{1,2}):(\d{2})$/;
  const colonMatch = timeStr.match(colonPattern);
  if (colonMatch) {
    const [, hours, minutes] = colonMatch;
    const h = parseInt(hours!);
    const m = parseInt(minutes!);
    
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }
  
  // Si es formato sin dos puntos (ej: "1030" o 1030)
  const noColonPattern = /^(\d{3,4})$/;
  const noColonMatch = timeStr.match(noColonPattern);
  if (noColonMatch) {
    // Si tiene 3 dígitos: 930 = 09:30
    // Si tiene 4 dígitos: 1030 = 10:30
    const padded = timeStr.padStart(4, '0');
    const hours = parseInt(padded.substring(0, 2));
    const minutes = parseInt(padded.substring(2, 4));
    
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  
  return null;
}

/**
 * Parsea y valida una fecha y hora juntas
 * @param dateInput - Fecha en cualquier formato soportado
 * @param timeInput - Hora en formato HH:mm o variantes
 * @returns Objeto con date (Date) y time (string) o null si alguno es inválido
 */
export function parseDateAndTime(
  dateInput: string | number | Date,
  timeInput: string | number
): { date: Date; time: string } | null {
  const date = parseDate(dateInput);
  const time = parseTime(timeInput);
  
  if (!date || !time) return null;
  
  return { date, time };
}

/**
 * Valida que una fecha no sea del pasado
 * @param date - Fecha a validar
 * @param allowToday - Si se permite la fecha de hoy (default: true)
 * @returns true si la fecha es válida (no es pasado)
 */
export function isValidFutureDate(date: Date, allowToday: boolean = true): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (allowToday) {
    return inputDate >= today;
  } else {
    return inputDate > today;
  }
}

/**
 * Combina una fecha y hora en un solo objeto Date
 * Útil para comparaciones de disponibilidad
 * @param date - Fecha base
 * @param time - Hora en formato HH:mm
 * @returns Date con la fecha y hora combinadas
 */
export function combineDateAndTime(date: Date, time: string): Date | null {
  const timeMatch = time.match(/^(\d{2}):(\d{2})$/);
  if (!timeMatch) return null;
  
  const [, hours, minutes] = timeMatch;
  const combined = new Date(date);
  combined.setHours(parseInt(hours!), parseInt(minutes!), 0, 0);
  
  return combined;
}

/**
 * Formatea una fecha para respuesta API en formato ISO corto
 * @param date - Fecha a formatear
 * @returns String en formato YYYY-MM-DD
 */
export function formatDateForResponse(date: Date): string {
  return date.toISOString().split('T')[0]!;
}
