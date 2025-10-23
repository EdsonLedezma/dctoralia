import { NextResponse } from 'next/server';
import {prisma} from '~/lib/prisma';

export async function POST(req: Request) {
  const { doctorPhone, appointmentId, newDate, newTime } = await req.json();
  if (!doctorPhone || !appointmentId || !newDate || !newTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const doctor = await prisma.doctor.findFirst({ where: { phone: doctorPhone } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { date: new Date(newDate), time: newTime, status: 'CONFIRMED' }
  });
  return NextResponse.json({ appointmentId: appointment.id, status: appointment.status });
}

/**
 * HTTP
 * Ruta: /api/vapi/appointment/reschedule
 * Método: POST
 * Body:
 * {
 *   "doctorPhone": "string",
 *   "appointmentId": "string",
 *   "newDate": "YYYY-MM-DD" | ISO,
 *   "newTime": "HH:mm"
 * }
 * Respuesta 200:
 * { "appointmentId": "string", "status": "CONFIRMED" }
 * Errores:
 * - 400 { "error": "Missing required fields" }
 * - 404 { "error": "Doctor not found" }
 *
 * curl -X POST http://localhost:3000/api/vapi/appointment/reschedule \
 *  -H "Content-Type: application/json" \
 *  -d '{ "doctorPhone":"+52 555-000-0000", "appointmentId":"apt_123", "newDate":"2025-10-03", "newTime":"12:00" }'
 */