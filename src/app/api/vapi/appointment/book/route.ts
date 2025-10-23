import { NextResponse } from 'next/server';
import {prisma} from '~/lib/prisma';

export async function POST(req: Request) {
  const { doctorPhone, patientId, serviceId, date, time, notes } = await req.json();
  if (!doctorPhone || !patientId || !serviceId || !date || !time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const doctor = await prisma.doctor.findFirst({ where: { phone: doctorPhone } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
  const appointment = await prisma.appointment.create({
    data: {
      doctorId: doctor.id,
      patientId,
      serviceId,
      date: new Date(date),
      time,
      notes,
      status: 'PENDING',
      duration: 30 // puedes ajustar esto
    }
  });
  return NextResponse.json({ appointmentId: appointment.id, status: appointment.status });
}

/**
 * HTTP
 * Ruta: /api/vapi/appointment/book
 * Método: POST
 * Body (application/json):
 * {
 *   "doctorPhone": "string",
 *   "patientId": "string",           // Patient.id
 *   "serviceId": "string",           // Service.id
 *   "date": "2025-10-01" | ISO,      // Fecha de la cita
 *   "time": "HH:mm",                 // Hora de la cita
 *   "notes": "string opcional"
 * }
 * Respuesta 200 (application/json):
 * {
 *   "appointmentId": "string",
 *   "status": "PENDING"
 * }
 * Errores:
 * - 400 { "error": "Missing required fields" }
 * - 404 { "error": "Doctor not found" }
 *
 * curl -X POST "http://localhost:3000/api/vapi/appointment/book" \
 *  -H "Content-Type: application/json" \
 *  -d '{
 *    "doctorPhone":"+52 555-000-0000",
 *    "patientId":"pat_123",
 *    "serviceId":"srv_123",
 *    "date":"2025-10-01",
 *    "time":"10:30",
 *    "notes":"Primera consulta"
 *  }'
 */