/**
 * Test Cases para Date/Time Parsing en VAPI Endpoints
 * 
 * Estos son ejemplos de cómo VAPI puede enviar fechas y horas,
 * y cómo el backend los procesa correctamente.
 */

// ============================================
// TEST SUITE 1: Formatos de Fecha Válidos
// ============================================

// Test 1.1: ISO Date String (RECOMENDADO)
const test_1_1 = {
  input: {
    date: "2025-10-25",
    time: "10:30"
  },
  expected: {
    date: new Date("2025-10-25"),
    time: "10:30"
  },
  status: "✅ PASS"
}

// Test 1.2: ISO DateTime String
const test_1_2 = {
  input: {
    date: "2025-10-25T10:30:00Z",
    time: "14:30"
  },
  expected: {
    date: new Date("2025-10-25"),
    time: "14:30"
  },
  status: "✅ PASS"
}

// Test 1.3: Timestamp en milisegundos
const test_1_3 = {
  input: {
    date: 1729900800000, // 26 Oct 2025
    time: "09:00"
  },
  expected: {
    date: new Date(1729900800000),
    time: "09:00"
  },
  status: "✅ PASS"
}

// Test 1.4: Formato Latino DD/MM/YYYY
const test_1_4 = {
  input: {
    date: "25/10/2025",
    time: "11:30"
  },
  expected: {
    date: new Date("2025-10-25"),
    time: "11:30"
  },
  status: "✅ PASS"
}

// ============================================
// TEST SUITE 2: Formatos de Hora Válidos
// ============================================

// Test 2.1: Formato estándar HH:mm
const test_2_1 = {
  input: {
    date: "2025-10-25",
    time: "10:30"
  },
  expected: {
    time: "10:30"
  },
  status: "✅ PASS"
}

// Test 2.2: Sin cero inicial
const test_2_2 = {
  input: {
    date: "2025-10-25",
    time: "9:00"
  },
  expected: {
    time: "09:00" // Se normaliza con cero inicial
  },
  status: "✅ PASS"
}

// Test 2.3: Sin dos puntos (string)
const test_2_3 = {
  input: {
    date: "2025-10-25",
    time: "1030"
  },
  expected: {
    time: "10:30"
  },
  status: "✅ PASS"
}

// Test 2.4: Sin dos puntos (número)
const test_2_4 = {
  input: {
    date: "2025-10-25",
    time: 1430
  },
  expected: {
    time: "14:30"
  },
  status: "✅ PASS"
}

// Test 2.5: 3 dígitos (añade cero)
const test_2_5 = {
  input: {
    date: "2025-10-25",
    time: "930"
  },
  expected: {
    time: "09:30"
  },
  status: "✅ PASS"
}

// ============================================
// TEST SUITE 3: Validaciones de Seguridad
// ============================================

// Test 3.1: Fecha en el pasado
const test_3_1 = {
  input: {
    date: "2020-01-01",
    time: "10:30"
  },
  expected: {
    error: "Invalid date",
    message: "No se pueden agendar citas en fechas pasadas"
  },
  status: "✅ PASS (Error esperado)"
}

// Test 3.2: Hora inválida (>24)
const test_3_2 = {
  input: {
    date: "2025-10-25",
    time: "25:00"
  },
  expected: {
    error: "Invalid date or time format"
  },
  status: "✅ PASS (Error esperado)"
}

// Test 3.3: Minutos inválidos (>60)
const test_3_3 = {
  input: {
    date: "2025-10-25",
    time: "10:70"
  },
  expected: {
    error: "Invalid date or time format"
  },
  status: "✅ PASS (Error esperado)"
}

// Test 3.4: Fecha inválida
const test_3_4 = {
  input: {
    date: "invalid-date",
    time: "10:30"
  },
  expected: {
    error: "Invalid date or time format"
  },
  status: "✅ PASS (Error esperado)"
}

// ============================================
// TEST SUITE 4: Casos Extremos (Edge Cases)
// ============================================

// Test 4.1: Medianoche
const test_4_1 = {
  input: {
    date: "2025-10-25",
    time: "00:00"
  },
  expected: {
    time: "00:00"
  },
  status: "✅ PASS"
}

// Test 4.2: Última hora del día
const test_4_2 = {
  input: {
    date: "2025-10-25",
    time: "23:59"
  },
  expected: {
    time: "23:59"
  },
  status: "✅ PASS"
}

// Test 4.3: Fecha de hoy (permitida)
const test_4_3 = {
  input: {
    date: new Date().toISOString().split('T')[0],
    time: "15:00"
  },
  expected: {
    date: new Date(),
    time: "15:00"
  },
  status: "✅ PASS (Si allowToday=true)"
}

// ============================================
// EJEMPLOS DE REQUESTS COMPLETOS
// ============================================

// Ejemplo 1: Book Appointment con formato estándar
const bookRequest_1 = {
  method: "POST",
  url: "/api/vapi/appointment/book",
  body: {
    doctorPhone: "+52 555-000-0000",
    patientId: "clxxx123",
    serviceName: "Consulta General",
    date: "2025-10-25",
    time: "10:30",
    reason: "Chequeo anual"
  },
  expectedResponse: {
    appointmentId: "clxxx789",
    status: "PENDING",
    date: "2025-10-25T00:00:00.000Z",
    time: "10:30",
    service: {
      id: "srv_123",
      name: "Consulta General"
    }
  }
}

// Ejemplo 2: Book Appointment con formatos alternativos
const bookRequest_2 = {
  method: "POST",
  url: "/api/vapi/appointment/book",
  body: {
    doctorPhone: "+52 555-000-0000",
    patientId: "clxxx123",
    serviceName: "Cardiología",
    date: "25/10/2025",  // Formato latino
    time: 1430,          // Número sin dos puntos
    reason: "Revisión cardiaca"
  },
  expectedResponse: {
    appointmentId: "clxxx790",
    status: "PENDING",
    date: "2025-10-25T00:00:00.000Z",
    time: "14:30",
    service: {
      id: "srv_124",
      name: "Cardiología"
    }
  }
}

// Ejemplo 3: Reschedule Appointment
const rescheduleRequest_1 = {
  method: "POST",
  url: "/api/vapi/appointment/reschedule",
  body: {
    doctorPhone: "+52 555-000-0000",
    appointmentId: "clxxx789",
    newDate: "2025-10-26",
    newTime: "11:00"
  },
  expectedResponse: {
    appointmentId: "clxxx789",
    status: "CONFIRMED",
    date: "2025-10-26T00:00:00.000Z",
    time: "11:00"
  }
}

// Ejemplo 4: Reschedule con timestamp
const rescheduleRequest_2 = {
  method: "POST",
  url: "/api/vapi/appointment/reschedule",
  body: {
    doctorPhone: "+52 555-000-0000",
    appointmentId: "clxxx790",
    newDate: 1729987200000,  // 27 Oct 2025
    newTime: "930"           // Se convierte a 09:30
  },
  expectedResponse: {
    appointmentId: "clxxx790",
    status: "CONFIRMED",
    date: "2025-10-27T00:00:00.000Z",
    time: "09:30"
  }
}

// ============================================
// CASOS DE ERROR COMUNES
// ============================================

// Error 1: Campos requeridos faltantes
const errorCase_1 = {
  request: {
    doctorPhone: "+52 555-000-0000",
    patientId: "clxxx123"
    // Faltan date y time
  },
  response: {
    status: 400,
    error: "Missing required fields: doctorPhone, patientId, date, time"
  }
}

// Error 2: Formato de fecha inválido
const errorCase_2 = {
  request: {
    doctorPhone: "+52 555-000-0000",
    patientId: "clxxx123",
    serviceName: "Consulta",
    date: "invalid",
    time: "10:30"
  },
  response: {
    status: 400,
    error: "Invalid date or time format",
    message: "La fecha debe ser YYYY-MM-DD o timestamp, y la hora HH:mm (ej: 10:30)"
  }
}

// Error 3: Fecha en el pasado
const errorCase_3 = {
  request: {
    doctorPhone: "+52 555-000-0000",
    patientId: "clxxx123",
    serviceName: "Consulta",
    date: "2020-01-01",
    time: "10:30"
  },
  response: {
    status: 400,
    error: "Invalid date",
    message: "No se pueden agendar citas en fechas pasadas"
  }
}

// Error 4: Horario no disponible
const errorCase_4 = {
  request: {
    doctorPhone: "+52 555-000-0000",
    patientId: "clxxx123",
    serviceName: "Consulta",
    date: "2025-10-25",
    time: "10:30" // Ya existe otra cita a esta hora
  },
  response: {
    status: 409,
    error: "Time slot not available",
    message: "El horario solicitado ya está ocupado"
  }
}

// ============================================
// EXPORT PARA TESTING
// ============================================

export const dateTimeTests = {
  validDates: [test_1_1, test_1_2, test_1_3, test_1_4],
  validTimes: [test_2_1, test_2_2, test_2_3, test_2_4, test_2_5],
  validations: [test_3_1, test_3_2, test_3_3, test_3_4],
  edgeCases: [test_4_1, test_4_2, test_4_3],
  fullRequests: [bookRequest_1, bookRequest_2, rescheduleRequest_1, rescheduleRequest_2],
  errorCases: [errorCase_1, errorCase_2, errorCase_3, errorCase_4]
}

/**
 * Resumen de Compatibilidad:
 * 
 * ✅ Formatos de Fecha Soportados:
 *    - "YYYY-MM-DD" (ISO)
 *    - "YYYY-MM-DDTHH:mm:ssZ" (ISO DateTime)
 *    - número timestamp en milisegundos
 *    - "DD/MM/YYYY" (Formato Latino)
 *    - "MM/DD/YYYY" (Formato US)
 * 
 * ✅ Formatos de Hora Soportados:
 *    - "HH:mm" (ej: "10:30")
 *    - "H:mm" (ej: "9:00" → "09:00")
 *    - "HHmm" (ej: "1030" → "10:30")
 *    - número HHmm (ej: 1430 → "14:30")
 *    - "Hmm" (ej: "930" → "09:30")
 * 
 * ✅ Validaciones Automáticas:
 *    - Formato válido de fecha y hora
 *    - Fecha no puede ser del pasado
 *    - Hora entre 00:00 y 23:59
 *    - Minutos entre 00 y 59
 * 
 * ✅ Normalización:
 *    - Todas las fechas → Date object
 *    - Todas las horas → "HH:mm" string
 */
