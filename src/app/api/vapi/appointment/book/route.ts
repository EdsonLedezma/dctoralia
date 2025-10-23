import { NextResponse } from 'next/server';
import {prisma} from '~/lib/prisma';
import { parseDateAndTime, isValidFutureDate } from '~/lib/date-parser';

export async function POST(req: Request) {
  const { doctorPhone, patientId, serviceId, serviceName, date, time, notes, reason } = await req.json();
  if (!doctorPhone || !patientId || !date || !time) {
    return NextResponse.json({ error: 'Missing required fields: doctorPhone, patientId, date, time' }, { status: 400 });
  }
  
  // Parsear y validar fecha y hora
  const parsed = parseDateAndTime(date, time);
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
      message: 'No se pueden agendar citas en fechas pasadas'
    }, { status: 400 });
  }
  
  // Buscar doctor por teléfono
  const doctor = await prisma.doctor.findFirst({ where: { phone: doctorPhone } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
  
  // Buscar o crear el servicio
  let service;
  
  if (serviceId) {
    // Si se proporciona serviceId, buscarlo
    service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  } else if (serviceName) {
    // Si se proporciona serviceName, buscar o crear el servicio
    service = await prisma.service.findFirst({
      where: {
        doctorId: doctor.id,
        name: serviceName,
        isActive: true
      }
    });
    
    // Si no existe, crear el servicio automáticamente
    if (!service) {
      service = await prisma.service.create({
        data: {
          doctorId: doctor.id,
          name: serviceName,
          description: reason || serviceName,
          price: 0, // Precio por defecto, se puede actualizar después
          duration: 30, // Duración por defecto de 30 minutos
          isActive: true
        }
      });
    }
  } else {
    return NextResponse.json({ 
      error: 'Either serviceId or serviceName must be provided' 
    }, { status: 400 });
  }
  
  // Verificar disponibilidad - buscar citas existentes en esa fecha y hora
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      date: appointmentDate,
      time: appointmentTime,
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
      serviceId: service.id,
      date: appointmentDate,
      time: appointmentTime,
      notes,
      reason: reason || serviceName,
      status: 'PENDING',
      duration: service.duration
    }
  });
  
  return NextResponse.json({ 
    appointmentId: appointment.id, 
    status: appointment.status,
    date: appointment.date,
    time: appointment.time,
    service: {
      id: service.id,
      name: service.name
    }
  });
}

/**
 * HTTP
 * Ruta: /api/vapi/appointment/book
 * Método: POST
 * Body (application/json):
 * {
 *   "doctorPhone": "string",         // Teléfono del doctor (requerido)
 *   "patientId": "string",           // Patient.id (requerido)
 *   "serviceId": "string",           // Service.id (opcional si se usa serviceName)
 *   "serviceName": "string",         // Nombre del servicio (opcional si se usa serviceId)
 *   "date": "string|number",         // Fecha: "YYYY-MM-DD", "DD/MM/YYYY", timestamp (requerido)
 *   "time": "string|number",         // Hora: "HH:mm", "HHMM", o número 1030 (requerido)
 *   "reason": "string",              // Razón de la cita (opcional)
 *   "notes": "string"                // Notas adicionales (opcional)
 * }
 * 
 * Nota: Debes proporcionar serviceId O serviceName. Si usas serviceName y el servicio
 * no existe, se creará automáticamente para ese doctor.
 * 
 * Respuesta 200 (application/json):
 * {
 *   "appointmentId": "string",
 *   "status": "PENDING",
 *   "date": "2025-10-01T00:00:00.000Z",
 *   "time": "10:30",
 *   "service": {
 *     "id": "string",
 *     "name": "string"
 *   }
 * }
 * 
 * Errores:
 * - 400 { "error": "Missing required fields" }
 * - 400 { "error": "Invalid date or time format" } - Formato de fecha/hora no válido
 * - 400 { "error": "Invalid date" } - Fecha en el pasado
 * - 400 { "error": "Either serviceId or serviceName must be provided" }
 * - 404 { "error": "Doctor not found" }
 * - 404 { "error": "Service not found" }
 * - 409 { "error": "Time slot not available", "message": "..." }
 *
 * Ejemplos:
 * 
 * // Con serviceId existente:
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
 * 
 * // Con serviceName (se crea si no existe):
 * curl -X POST "http://localhost:3000/api/vapi/appointment/book" \
 *  -H "Content-Type: application/json" \
 *  -d '{
 *    "doctorPhone":"+52 555-000-0000",
 *    "patientId":"pat_123",
 *    "serviceName":"Consulta General",
 *    "reason":"Chequeo anual",
 *    "date":"2025-10-01",
 *    "time":"10:30"
 *  }'
 * 
 * // Con diferentes formatos de fecha/hora:
 * curl -X POST "http://localhost:3000/api/vapi/appointment/book" \
 *  -H "Content-Type: application/json" \
 *  -d '{
 *    "doctorPhone":"+52 555-000-0000",
 *    "patientId":"pat_123",
 *    "serviceName":"Consulta General",
 *    "date":"23/10/2025",
 *    "time":1430
 *  }'
 */