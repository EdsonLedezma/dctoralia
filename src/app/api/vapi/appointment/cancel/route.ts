import { NextResponse } from 'next/server';
import {prisma} from '~/lib/prisma';

export async function POST(req: Request) {
  const { doctorPhone, appointmentId, reason } = await req.json();
  if (!doctorPhone || !appointmentId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const doctor = await prisma.doctor.findFirst({ where: { phone: doctorPhone } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CANCELLED', notes: reason }
  });
  return NextResponse.json({ appointmentId: appointment.id, status: appointment.status });
}

/**
 * HTTP
 * Ruta: /api/vapi/appointment/cancel
 * Método: POST
 * Body (application/json):
 * {
 *   "doctorPhone": "string",
 *   "appointmentId": "string",
 *   "reason": "string opcional"
 * }
 * Respuesta 200:
 * { "appointmentId": "string", "status": "CANCELLED" }
 * Errores:
 * - 400 { "error": "Missing required fields" }
 * - 404 { "error": "Doctor not found" }
 *
 * curl -X POST http://localhost:3000/api/vapi/appointment/cancel \
 *  -H "Content-Type: application/json" \
 *  -d '{ "doctorPhone":"+52 555-000-0000", "appointmentId":"apt_123", "reason":"Paciente no puede asistir" }'
 */