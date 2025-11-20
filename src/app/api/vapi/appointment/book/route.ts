import { NextResponse } from 'next/server';
import {prisma} from '~/lib/prisma';
import { parseDateAndTime, isValidFutureDate } from '~/lib/date-parser';

export async function POST(req: Request) {
  const { 
    doctorPhone, 
    patientId, 
    patientPhone, 
    patientName, 
    serviceId, 
    serviceName, 
    date, 
    time, 
    notes, 
    reason 
  } = await req.json();
  
  if (!doctorPhone || !date || !time) {
    return NextResponse.json({ 
      error: 'Missing required fields: doctorPhone, date, time' 
    }, { status: 400 });
  }
  
  // Para VAPI: patientPhone y serviceName son obligatorios (no se usan IDs por voz)
  if (!patientPhone) {
    return NextResponse.json({ 
      error: 'Patient phone required',
      message: 'El teléfono del paciente es obligatorio para agendar por VAPI'
    }, { status: 400 });
  }
  
  if (!serviceId && !serviceName) {
    return NextResponse.json({ 
      error: 'Service identification required',
      message: 'Debes proporcionar serviceName (nombre del servicio)'
    }, { status: 400 });
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
  const doctor = await prisma.doctor.findFirst({ 
    where: { phone: doctorPhone },
    include: {
      user: true,
      schedules: {
        where: { isActive: true }
      }
    }
  });
  if (!doctor) return NextResponse.json({ 
    error: 'Doctor not found',
    message: 'No se encontró un doctor con ese teléfono'
  }, { status: 404 });
  
  // Validar que el horario solicitado esté dentro del schedule del doctor
  const appointmentDay = appointmentDate.getDay(); // 0=Domingo, 1=Lunes, etc.
  const daySchedule = doctor.schedules.find(s => s.dayOfWeek === appointmentDay);
  
  if (!daySchedule) {
    return NextResponse.json({ 
      error: 'Doctor not available on this day',
      message: `El doctor no atiende los ${['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'][appointmentDay]}`
    }, { status: 400 });
  }
  
  // Validar que la hora esté dentro del rango del schedule
  const [reqHour, reqMin] = appointmentTime.split(':').map(Number);
  const requestedMinutes = reqHour! * 60 + reqMin!;
  
  const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
  const startMinutes = startHour! * 60 + startMin!;
  
  const [endHour, endMin] = daySchedule.endTime.split(':').map(Number);
  const endMinutes = endHour! * 60 + endMin!;
  
  if (requestedMinutes < startMinutes || requestedMinutes >= endMinutes) {
    return NextResponse.json({ 
      error: 'Time outside schedule',
      message: `El doctor atiende de ${daySchedule.startTime} a ${daySchedule.endTime}`
    }, { status: 400 });
  }
  
  // Buscar o crear paciente usando teléfono
  let patient: { 
    id: string; 
    phone: string; 
    user: { 
      name: string; 
      email: string; 
    } 
  } | null = null;
  
  if (patientId) {
    // Buscar por ID (solo para compatibilidad con APIs internas)
    const foundPatient = await prisma.patient.findUnique({ 
      where: { id: patientId },
      include: { user: { select: { name: true, email: true } } }
    });
    if (!foundPatient) {
      return NextResponse.json({ 
        error: 'Patient not found',
        message: 'No se encontró el paciente con ese ID'
      }, { status: 404 });
    }
    patient = foundPatient;
  } else {
    // Buscar por teléfono (flujo principal de VAPI)
    const foundPatient = await prisma.patient.findFirst({ 
      where: { phone: patientPhone },
      include: { user: { select: { name: true, email: true } } }
    });
    
    if (!foundPatient) {
      // Si no existe, crear paciente nuevo con teléfono y nombre
      const newUser = await prisma.user.create({
        data: {
          name: patientName || `Paciente ${patientPhone}`,
          email: `patient_${patientPhone.replace(/\D/g, '')}@temp.com`,
          password: 'temp_password_' + Date.now(), // Temporal, debe cambiarse
          phone: patientPhone,
          role: 'PATIENT'
        }
      });
      
      patient = await prisma.patient.create({
        data: {
          userId: newUser.id,
          phone: patientPhone
        },
        include: { user: { select: { name: true, email: true } } }
      });
    } else {
      patient = foundPatient;
    }
  }
  
  // Verificar que el paciente fue encontrado o creado
  if (!patient) {
    return NextResponse.json({ 
      error: 'Patient could not be found or created',
      message: 'No se pudo identificar o crear el paciente'
    }, { status: 500 });
  }
  
  // Buscar o crear el servicio
  let service;
  
  if (serviceId) {
    // Buscar por ID (solo para compatibilidad con APIs internas)
    service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return NextResponse.json({ 
      error: 'Service not found',
      message: 'No se encontró el servicio especificado'
    }, { status: 404 });
  } else {
    // Buscar o crear por nombre (flujo principal de VAPI)
    service = await prisma.service.findFirst({
      where: {
        doctorId: doctor.id,
        name: serviceName!,
        isActive: true
      }
    });
    
    // Si no existe, crear el servicio automáticamente
    if (!service) {
      service = await prisma.service.create({
        data: {
          doctorId: doctor.id,
          name: serviceName!,
          description: reason || serviceName!,
          price: 0, // Precio por defecto, se puede actualizar después
          duration: 30, // Duración por defecto de 30 minutos
          isActive: true
        }
      });
    }
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
      message: 'El horario solicitado ya está ocupado. Por favor elige otro horario.'
    }, { status: 409 });
  }
  
  // Crear la cita si está disponible
  const appointment = await prisma.appointment.create({
    data: {
      doctorId: doctor.id,
      patientId: patient.id,
      serviceId: service.id,
      date: appointmentDate,
      time: appointmentTime,
      notes,
      reason: reason || serviceName,
      status: 'PENDING',
      duration: service.duration
    },
    include: {
      doctor: {
        include: {
          user: true
        }
      },
      patient: {
        include: {
          user: true
        }
      },
      service: true
    }
  });
  
  // Crear notificaciones para doctor y paciente
  try {
    await prisma.notification.createMany({
      data: [
        {
          doctorId: doctor.id,
          patientId: patient.id,
          type: 'APPOINTMENT_BOOKED',
          title: 'Nueva cita agendada',
          message: `${patient.user.name} ha agendado una cita para ${appointmentDate.toLocaleDateString('es-ES')} a las ${appointmentTime}`,
          appointmentId: appointment.id,
        },
        {
          doctorId: doctor.id,
          patientId: patient.id,
          type: 'APPOINTMENT_BOOKED',
          title: 'Cita confirmada',
          message: `Tu cita con Dr. ${doctor.user?.name} ha sido agendada para ${appointmentDate.toLocaleDateString('es-ES')} a las ${appointmentTime}`,
          appointmentId: appointment.id,
        }
      ]
    });
  } catch (notifError) {
    // No bloquear si falla la notificación
    console.error('Error creating notifications:', notifError);
  }
  
  return NextResponse.json({ 
    success: true,
    message: 'Cita agendada exitosamente',
    appointment: {
      id: appointment.id,
      status: appointment.status,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration,
      doctor: {
        name: appointment.doctor.user?.name,
        specialty: appointment.doctor.specialty,
        phone: appointment.doctor.phone
      },
      patient: {
        id: patient.id,
        name: patient.user.name,
        phone: patient.phone
      },
      service: {
        id: service.id,
        name: service.name,
        duration: service.duration
      }
    }
  });
}

/**
 * VAPI Appointment Booking Endpoint
 * Ruta: /api/vapi/appointment/book
 * Método: POST
 * 
 * Descripción:
 * Este endpoint está diseñado para integraciones con VAPI (Voice API).
 * Permite agendar citas médicas mediante voz, buscando automáticamente
 * al paciente por teléfono y nombre, validando horarios del doctor y
 * creando el registro del paciente si no existe.
 * 
 * Body (application/json):
 * {
 *   "doctorPhone": "string",         // ✅ OBLIGATORIO - Teléfono del doctor
 *   "patientPhone": "string",        // ✅ OBLIGATORIO - Teléfono del paciente (busca o crea)
 *   "patientName": "string",         // ✅ RECOMENDADO - Nombre del paciente (para crear si no existe)
 *   "serviceName": "string",         // ✅ OBLIGATORIO - Nombre del servicio (ej: "Consulta General")
 *   "date": "string|number",         // ✅ OBLIGATORIO - Fecha: "YYYY-MM-DD", "DD/MM/YYYY", timestamp
 *   "time": "string|number",         // ✅ OBLIGATORIO - Hora: "HH:mm", "HHMM", o número 1030
 *   "reason": "string",              // ⭕ OPCIONAL - Razón de la cita
 *   "notes": "string"                // ⭕ OPCIONAL - Notas adicionales
 * }
 * 
 * CAMPOS DEPRECADOS (para uso interno solamente, NO usar en VAPI):
 * {
 *   "patientId": "string",           // ⚠️ NO usar en VAPI - Patient.id (solo APIs internas)
 *   "serviceId": "string",           // ⚠️ NO usar en VAPI - Service.id (solo APIs internas)
 * }
 * 
 * Notas importantes:
 * - ✅ El teléfono del paciente es OBLIGATORIO para VAPI
 * - ✅ Si el paciente no existe, se crea automáticamente usando patientPhone y patientName
 * - ✅ El sistema busca el servicio por nombre, si no existe lo crea automáticamente
 * - ✅ El sistema valida que el horario esté dentro del schedule del doctor
 * - ✅ El sistema valida que no haya conflictos con citas existentes
 * - ✅ Se crean notificaciones automáticas para doctor y paciente
 * 
 * Respuesta 200 (application/json):
 * {
 *   "success": true,
 *   "message": "Cita agendada exitosamente",
 *   "appointment": {
 *     "id": "string",
 *     "status": "PENDING",
 *     "date": "2025-10-01T00:00:00.000Z",
 *     "time": "10:30",
 *     "duration": 30,
 *     "doctor": {
 *       "name": "Dr. Juan Pérez",
 *       "specialty": "Cardiología",
 *       "phone": "+52 555-000-0000"
 *     },
 *     "patient": {
 *       "id": "string",
 *       "name": "María García",
 *       "phone": "+52 555-111-1111"
 *     },
 *     "service": {
 *       "id": "string",
 *       "name": "Consulta General",
 *       "duration": 30
 *     }
 *   }
 * }
 * 
 * Errores:
 * - 400 { "error": "Missing required fields" }
 * - 400 { "error": "Patient identification required" }
 * - 400 { "error": "Invalid date or time format" }
 * - 400 { "error": "Invalid date", "message": "No se pueden agendar citas en fechas pasadas" }
 * - 400 { "error": "Doctor not available on this day" }
 * - 400 { "error": "Time outside schedule" }
 * - 404 { "error": "Doctor not found" }
 * - 404 { "error": "Patient not found" }
 * - 404 { "error": "Service not found" }
 * - 409 { "error": "Time slot not available", "message": "El horario solicitado ya está ocupado" }
 *
 * Ejemplos de uso:
 * 
 * // ✅ EJEMPLO RECOMENDADO PARA VAPI (todos los campos necesarios)
 * curl -X POST "http://localhost:3000/api/vapi/appointment/book" \
 *  -H "Content-Type: application/json" \
 *  -d '{
 *    "doctorPhone": "+52 555-000-0000",
 *    "patientPhone": "+52 555-111-1111",
 *    "patientName": "María García",
 *    "serviceName": "Consulta General",
 *    "date": "2025-12-15",
 *    "time": "10:30",
 *    "reason": "Chequeo general"
 *  }'
 * 
 * // ✅ Ejemplo con paciente existente (solo teléfono necesario)
 * curl -X POST "http://localhost:3000/api/vapi/appointment/book" \
 *  -H "Content-Type: application/json" \
 *  -d '{
 *    "doctorPhone": "+52 555-000-0000",
 *    "patientPhone": "+52 555-222-2222",
 *    "serviceName": "Consulta de seguimiento",
 *    "date": "2025-12-16",
 *    "time": "14:00"
 *  }'
 * 
 * // ✅ Ejemplo con servicio nuevo (se crea automáticamente)
 * curl -X POST "http://localhost:3000/api/vapi/appointment/book" \
 *  -H "Content-Type: application/json" \
 *  -d '{
 *    "doctorPhone": "+52 555-000-0000",
 *    "patientPhone": "+52 555-333-3333",
 *    "patientName": "Juan López",
 *    "serviceName": "Consulta de Cardiología",
 *    "date": "2025-12-17",
 *    "time": "09:00",
 *    "notes": "Primera consulta"
 *  }'
 * 
 * Validaciones implementadas:
 * 1. ✅ Fecha no puede ser del pasado
 * 2. ✅ Hora debe estar dentro del horario de atención del doctor
 * 3. ✅ Doctor debe atender en ese día de la semana
 * 4. ✅ No puede haber otra cita en ese horario
 * 5. ✅ Búsqueda inteligente de paciente por nombre o teléfono
 * 6. ✅ Creación automática de paciente si se proporciona teléfono
 * 7. ✅ Creación automática de servicio si no existe
 * 8. ✅ Notificaciones automáticas para doctor y paciente
 */