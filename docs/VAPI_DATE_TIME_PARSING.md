# VAPI Date and Time Parsing - Guía de Uso

## 📅 Formatos de Fecha Soportados

Los endpoints de VAPI ahora soportan múltiples formatos de fecha para mayor flexibilidad:

### 1. **ISO Date String** (Recomendado)
```json
{
  "date": "2025-10-23"
}
```

### 2. **ISO DateTime String**
```json
{
  "date": "2025-10-23T10:30:00Z"
}
```

### 3. **Timestamp en milisegundos**
```json
{
  "date": 1729728000000
}
```

### 4. **Formato Latino (DD/MM/YYYY)**
```json
{
  "date": "23/10/2025"
}
```

### 5. **Formato US (MM/DD/YYYY)**
```json
{
  "date": "10/23/2025"
}
```

## 🕐 Formatos de Hora Soportados

### 1. **Formato estándar HH:mm** (Recomendado)
```json
{
  "time": "10:30"
}
```

### 2. **Hora sin ceros iniciales**
```json
{
  "time": "9:00"
}
```

### 3. **Sin dos puntos (string)**
```json
{
  "time": "1030"
}
```

### 4. **Número sin dos puntos**
```json
{
  "time": 1030
}
```

### 5. **3 dígitos (añade cero inicial)**
```json
{
  "time": "930"
}
// Se interpreta como 09:30
```

## 🔧 Validaciones Automáticas

Los endpoints ahora incluyen validaciones automáticas:

### ✅ Validación de Formato
```json
// ❌ Inválido
{
  "date": "invalid-date",
  "time": "25:00"
}

// Respuesta:
{
  "error": "Invalid date or time format",
  "message": "La fecha debe ser YYYY-MM-DD o timestamp, y la hora HH:mm (ej: 10:30)"
}
```

### ✅ Validación de Fechas Pasadas
```json
// ❌ Inválido (fecha del pasado)
{
  "date": "2020-01-01",
  "time": "10:30"
}

// Respuesta:
{
  "error": "Invalid date",
  "message": "No se pueden agendar citas en fechas pasadas"
}
```

### ✅ Validación de Hora
```json
// ❌ Inválido
{
  "time": "25:70"  // Hora o minutos fuera de rango
}

// Respuesta:
{
  "error": "Invalid date or time format",
  "message": "La fecha debe ser YYYY-MM-DD o timestamp, y la hora HH:mm (ej: 10:30)"
}
```

## 📝 Ejemplos de Uso con VAPI

### Ejemplo 1: Agendar Cita (Formato Recomendado)
```bash
curl -X POST "http://localhost:3000/api/vapi/appointment/book" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorPhone": "+52 555-000-0000",
    "patientId": "clxxx123",
    "serviceName": "Consulta General",
    "date": "2025-10-25",
    "time": "10:30",
    "reason": "Chequeo anual"
  }'
```

### Ejemplo 2: Agendar con Timestamp
```bash
curl -X POST "http://localhost:3000/api/vapi/appointment/book" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorPhone": "+52 555-000-0000",
    "patientId": "clxxx123",
    "serviceName": "Consulta General",
    "date": 1729900800000,
    "time": "1430",
    "reason": "Revisión"
  }'
```

### Ejemplo 3: Agendar con Formato Latino
```bash
curl -X POST "http://localhost:3000/api/vapi/appointment/book" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorPhone": "+52 555-000-0000",
    "patientId": "clxxx123",
    "serviceName": "Consulta General",
    "date": "25/10/2025",
    "time": "14:30",
    "reason": "Consulta de rutina"
  }'
```

### Ejemplo 4: Reagendar Cita
```bash
curl -X POST "http://localhost:3000/api/vapi/appointment/reschedule" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorPhone": "+52 555-000-0000",
    "appointmentId": "clxxx456",
    "newDate": "2025-10-26",
    "newTime": "11:00"
  }'
```

### Ejemplo 5: Reagendar con Hora sin Dos Puntos
```bash
curl -X POST "http://localhost:3000/api/vapi/appointment/reschedule" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorPhone": "+52 555-000-0000",
    "appointmentId": "clxxx456",
    "newDate": "2025-10-26",
    "newTime": 1100
  }'
```

## 🎯 Configuración de VAPI Tool

Al configurar tus tools en VAPI, puedes usar estos formatos:

### Tool Configuration Example (VAPI)
```json
{
  "type": "function",
  "function": {
    "name": "book_appointment",
    "description": "Agenda una cita con un doctor",
    "parameters": {
      "type": "object",
      "properties": {
        "doctorPhone": {
          "type": "string",
          "description": "Teléfono del doctor"
        },
        "patientId": {
          "type": "string",
          "description": "ID del paciente"
        },
        "serviceName": {
          "type": "string",
          "description": "Nombre del servicio médico"
        },
        "date": {
          "type": "string",
          "description": "Fecha de la cita en formato YYYY-MM-DD, DD/MM/YYYY, o timestamp"
        },
        "time": {
          "type": "string",
          "description": "Hora de la cita en formato HH:mm o HHMM"
        },
        "reason": {
          "type": "string",
          "description": "Motivo de la consulta"
        }
      },
      "required": ["doctorPhone", "patientId", "date", "time"]
    }
  },
  "server": {
    "url": "https://tu-dominio.com/api/vapi/appointment/book",
    "method": "POST"
  }
}
```

## 💡 Tips para Integración con VAPI

1. **Recomendación de Formato**: Usa ISO date strings (`YYYY-MM-DD`) y formato `HH:mm` para la hora, ya que son los más predecibles.

2. **Números vs Strings**: Aunque se soportan números para timestamps y horas, es mejor usar strings en VAPI para evitar problemas de precisión.

3. **Zona Horaria**: Todas las fechas se interpretan en la zona horaria del servidor. Considera esto al configurar tus prompts de VAPI.

4. **Manejo de Errores**: Los endpoints devuelven mensajes claros en español cuando hay errores de formato o validación.

5. **Testing**: Prueba diferentes formatos en desarrollo para asegurarte que VAPI envía el formato correcto.

## 🔄 Normalización Automática

El sistema normaliza automáticamente todos los formatos a:
- **Fecha**: Objeto `Date` de JavaScript
- **Hora**: String en formato `HH:mm` (24 horas)

Ejemplo:
```javascript
// Input de VAPI
{
  "date": "23/10/2025",
  "time": 930
}

// Normalizado internamente a
{
  "date": Date("2025-10-23T00:00:00.000Z"),
  "time": "09:30"
}
```

## 🐛 Mensajes de Error Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Invalid date or time format` | Formato no reconocido | Usa YYYY-MM-DD para fecha y HH:mm para hora |
| `No se pueden agendar citas en fechas pasadas` | Fecha anterior a hoy | Verifica que la fecha sea futura |
| `Time slot not available` | Horario ya ocupado | Consulta disponibilidad con `/api/vapi/doctor/availability` |

## 📞 Soporte

Si encuentras un formato de fecha/hora que debería ser soportado pero no lo es, contacta al equipo de desarrollo.
