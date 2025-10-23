import { NextResponse } from 'next/server';
import {prisma} from '~/lib/prisma';
import { parseDateAndTime, isValidFutureDate } from '~/lib/date-parser';

export async function POST(req: Request) {
  const { doctorPhone, appointmentId, newDate, newTime } = await req.json();
  if (!doctorPhone || !appointmentId || !newDate || !newTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  
  // Parsear y validar fecha y hora
  const parsed = parseDateAndTime(newDate, newTime);
  if (!parsed) {
    return NextResponse.json({ 
      error: 'Invalid date or time format',
      message: 'La fecha debe ser YYYY-MM-DD o timestamp, y la hora HH:mm (ej: 10:30)'
    }, { status: 400 });
  }
  
  const { date: appointmentDate, time: appointmentTime } = parsed;
  
  // Validar que la fecha no sea del pasado
  if (!isValidFutureDate(appointmentDate)) {
    return NextResponse.json({ 
      error: 'Invalid date',
      message: 'No se pueden reagendar citas en fechas pasadas'
    }, { status: 400 });
  }
  
  // Buscar doctor por teléfono
  const doctor = await prisma.doctor.findFirst({ where: { phone: doctorPhone } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
  
  // Verificar que la cita existe y pertenece al doctor
  const existingAppointment = await prisma.appointment.findUnique({
    where: { id: appointmentId }
  });
  
  if (!existingAppointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  }
  
  if (existingAppointment.doctorId !== doctor.id) {
    return NextResponse.json({ error: 'Appointment does not belong to this doctor' }, { status: 403 });
  }
  
  // Verificar disponibilidad en el nuevo horario
  const conflictingAppointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      date: appointmentDate,
      time: appointmentTime,
      status: {
        in: ['PENDING', 'CONFIRMED']
      },
      id: {
        not: appointmentId // Excluir la cita actual
      }
    }
  });
  
  if (conflictingAppointments.length > 0) {
    return NextResponse.json({ 
      error: 'Time slot not available',
      message: 'El nuevo horario solicitado ya está ocupado'
    }, { status: 409 });
  }
  
  // Reagendar la cita
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { 
      date: appointmentDate, 
      time: appointmentTime, 
      status: 'CONFIRMED' 
    }
  });
  
  return NextResponse.json({ 
    appointmentId: appointment.id, 
    status: appointment.status,
    date: appointment.date,
    time: appointment.time
  });
}

/**
 * HTTP
 * Ruta: /api/vapi/appointment/reschedule
 * Método: POST
 * Body:
 * {
 *   "doctorPhone": "string",
 *   "appointmentId": "string",
 *   "newDate": "string|number",      // Fecha: "YYYY-MM-DD", "DD/MM/YYYY", timestamp
 *   "newTime": "string|number"       // Hora: "HH:mm", "HHMM", o número 1030
 * }
 * Respuesta 200:
 * { "appointmentId": "string", "status": "CONFIRMED", "date": Date, "time": "HH:mm" }
 * Errores:
 * - 400 { "error": "Missing required fields" }
 * - 400 { "error": "Invalid date or time format" } - Formato de fecha/hora no válido
 * - 400 { "error": "Invalid date" } - Fecha en el pasado
 * - 404 { "error": "Doctor not found" }
 * - 404 { "error": "Appointment not found" }
 * - 403 { "error": "Appointment does not belong to this doctor" }
 * - 409 { "error": "Time slot not available" }
 *
 * Ejemplos:
 * 
 * // Formato estándar:
 * curl -X POST http://localhost:3000/api/vapi/appointment/reschedule \
 *  -H "Content-Type: application/json" \
 *  -d '{ "doctorPhone":"+52 555-000-0000", "appointmentId":"apt_123", "newDate":"2025-10-03", "newTime":"12:00" }'
 * 
 * // Formato alternativo:
 * curl -X POST http://localhost:3000/api/vapi/appointment/reschedule \
 *  -H "Content-Type: application/json" \
 *  -d '{ "doctorPhone":"+52 555-000-0000", "appointmentId":"apt_123", "newDate":"03/10/2025", "newTime":1200 }'
 */