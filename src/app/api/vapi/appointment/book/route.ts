import { NextResponse } from 'next/server';
import {prisma} from '~/lib/prisma';

export async function POST(req: Request) {
  const { doctorPhone, patientId, serviceId, date, time, notes } = await req.json();
  if (!doctorPhone || !patientId || !serviceId || !date || !time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  
  // Buscar doctor por teléfono
  const doctor = await prisma.doctor.findFirst({ where: { phone: doctorPhone } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
  
  // Buscar el servicio para obtener la duración
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  
  // Verificar disponibilidad - buscar citas existentes en esa fecha y hora
  const appointmentDate = new Date(date);
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      date: appointmentDate,
      time: time,
      status: {
        in: ['PENDING', 'CONFIRMED']
      }
    }
  });
  
  if (existingAppointments.length > 0) {
    return NextResponse.json({ 
      error: 'Time slot not available',
      message: 'El horario solicitado ya está ocupado'
    }, { status: 409 });
  }
  
  // Crear la cita si está disponible
  const appointment = await prisma.appointment.create({
    data: {
      doctorId: doctor.id,
      patientId,
      serviceId,
      date: appointmentDate,
      time,
      notes,
      status: 'PENDING',
      duration: service.duration
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