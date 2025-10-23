import { NextResponse } from 'next/server';
import {prisma} from '~/lib/prisma';

export async function POST(req: Request) {
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
  const doctor = await prisma.doctor.findFirst({ where: { phone } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
  return NextResponse.json({ doctorId: doctor.id, doctor });
}

/**
 * HTTP
 * Ruta: /api/vapi/doctor/by-phone
 * Método: POST
 * Body:
 * { "phone": "+52 555-000-0000" }
 * Respuesta 200:
 * { "doctorId": "string", "doctor": Doctor }
 * Errores:
 * - 400 { "error": "Phone is required" }
 * - 404 { "error": "Doctor not found" }
 *
 * curl -X POST http://localhost:3000/api/vapi/doctor/by-phone \
 *  -H "Content-Type: application/json" \
 *  -d '{ "phone":"+52 555-000-0000" }'
 */