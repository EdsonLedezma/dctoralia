import { NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';

export async function POST(req: Request) {
  const { phone } = await req.json();
  
  if (!phone) {
    return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
  }
  
  // Buscar doctor por teléfono
  const doctor = await prisma.doctor.findFirst({ where: { phone } });
  if (!doctor) {
    return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
  }
  
  // Buscar servicios activos del doctor
  const services = await prisma.service.findMany({
    where: {
      doctorId: doctor.id,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      duration: true
    },
    orderBy: {
      name: 'asc'
    }
  });
  
  return NextResponse.json({ 
    doctorId: doctor.id,
    services 
  });
}

/**
 * HTTP
 * Ruta: /api/vapi/doctor/services
 * Método: POST
 * Body:
 * {
 *   "phone": "+52 555-000-0000"
 * }
 * 
 * Respuesta 200:
 * {
 *   "doctorId": "string",
 *   "services": [
 *     {
 *       "id": "string",
 *       "name": "string",
 *       "description": "string",
 *       "price": number,
 *       "duration": number
 *     }
 *   ]
 * }
 * 
 * Errores:
 * - 400 { "error": "Phone is required" }
 * - 404 { "error": "Doctor not found" }
 *
 * curl -X POST http://localhost:3000/api/vapi/doctor/services \
 *  -H "Content-Type: application/json" \
 *  -d '{ "phone":"+52 555-000-0000" }'
 */
