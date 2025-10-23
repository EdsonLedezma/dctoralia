import { NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';


export async function POST(req: Request) {
  const { phone, date } = await req.json();
  if (!phone || !date) return NextResponse.json({ error: 'Phone and date are required' }, { status: 400 });
  const doctor = await prisma.doctor.findFirst({ where: { phone } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
  // Buscar horarios activos y citas ocupadas
  const schedules = await prisma.schedule.findMany({ where: { doctorId: doctor.id, isActive: true } });
  const appointments = await prisma.appointment.findMany({ where: { doctorId: doctor.id, date: new Date(date) } });
  // Lógica para calcular slots disponibles
  // (simplificado: retorna todos los horarios del día)
  const availableSlots = schedules.map(s => ({ time: s.startTime, duration: parseInt(s.endTime) - parseInt(s.startTime) }));
  return NextResponse.json({ doctorId: doctor.id, availableSlots });
}

/**
 * HTTP
 * Ruta: /api/vapi/doctor/availability
 * Método: POST
 * Body:
 * {
 *   "phone": "+52 555-000-0000",
 *   "date": "YYYY-MM-DD" | ISO
 * }
 * Respuesta 200:
 * {
 *   "doctorId": "string",
 *   "availableSlots": [ { "time":"HH:mm", "duration": number } ]
 * }
 * Errores:
 * - 400 { "error": "Phone and date are required" }
 * - 404 { "error": "Doctor not found" }
 *
 * curl -X POST http://localhost:3000/api/vapi/doctor/availability \
 *  -H "Content-Type: application/json" \
 *  -d '{ "phone":"+52 555-000-0000", "date":"2025-10-01" }'
 */