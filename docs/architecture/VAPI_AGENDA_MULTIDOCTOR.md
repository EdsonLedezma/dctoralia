# Dopilot: complemento opcional de asistente telefónico con Vapi

Fecha: 14 de noviembre de 2026.
Estado: backend y controles preparados en código; requieren aplicar el esquema, configurar Vapi y validar llamadas antes de ofrecer disponibilidad comercial. No cambia el precio ni el cobro automático de los planes actuales.

## Decisión comercial

La agenda y el portal siguen siendo el producto principal. El asistente telefónico es un complemento que cada doctor elige contratar y activar. No activarlo al crear cuentas, contratar Pro o conectar una línea. No obligar a pacientes o médicos a usar IA.

| Oferta               | Incluye                                                                        | Forma de cobro propuesta                                             |
| -------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Pro                  | Agenda y capacidades del plan actual                                           | Suscripción actual                                                   |
| Asistente telefónico | Número conectado, atención de disponibilidad y gestión de citas según permisos | Activación inicial + mensualidad por número + consumo con límite     |
| Enterprise           | Operación de clínica y complementos por profesional                            | Cotización por equipo, sedes y líneas                                |
| Enterprise Privado   | Instalación dedicada o infraestructura del cliente y marca configurable        | Implementación + licencia y soporte + proveedores externos separados |

No vender llamadas ilimitadas. Separar número, telefonía, Vapi, modelo y voz, más soporte y margen. Fórmula de precio mínimo mensual: `(costes fijos + minutos incluidos × coste real por minuto + soporte asignado) / (1 - margen objetivo)`. Usar datos de facturación del piloto, incluyendo impuestos aplicables y redondeos del proveedor; no presentar esta fórmula como tarifa de Vapi.

Primero un piloto con pocos médicos y un cupo de consumo pactado. Medir minutos, coste por cita gestionada, conflictos, abandono y casos que requieren recepción. Después fijar paquetes de minutos y excedente explícito. Alertas de presupuesto, corte por consumo y facturación por uso quedan por implementar: estos controles de activación no son un sistema de medición ni cobro.

La licencia inicial se concede al consultorio mediante `ClinicSubscription.voiceAgentEnabled`; la preferencia de uso y los permisos son individuales por `VoiceAgentLine`. Si se vende por médico, el registro comercial de qué líneas se contrataron y su vencimiento debe incorporarse antes de automatizar facturas; hoy la licencia de clínica no limita cuántas líneas puede conectar un operador autorizado.

## Tres condiciones para atender

1. Licencia: suscripción ACTIVE/TRIALING con `voiceAgentEnabled=true`, concedida por administración.
2. Conexión: línea ACTIVE con identificadores Vapi provisionados por operador.
3. Consentimiento: doctor activa `enabled`. `mutationsEnabled` concede crear, reprogramar y cancelar; por defecto ambos son falsos.

`DEMO_MODE=true` bloquea el webhook y la activación real. Desactivar el complemento no cancela citas existentes ni elimina pacientes. No elimina el número en Vapi ni detiene automáticamente sus cargos: la baja de telefonía es una operación separada. Las llamadas posteriores reciben indisponibilidad, sin desvío automático implementado.

Administración dispone de `voiceAgent.setAddonLicense({clinicId,enabled})`, exclusivo del rol ADMIN. No ejecuta Stripe ni cobra. Se debe invocar solo desde una sesión administrativa confiable después de contratar el complemento. No se agregó pantalla administrativa. El médico configura su propia línea desde Consultorio; no puede otorgarse la licencia.

## Cómo se identifica al médico

El webhook autenticado recibe `message.call.phoneNumberId` o `message.phoneNumber.id`. El servidor busca el ID único en `VoiceAgentLine.vapiPhoneNumberId` y obtiene doctor, consultorio y asistente. Nunca acepta `doctorId`, `clinicId` o `patientId` desde argumentos del modelo. Si hay varios IDs de número y no coinciden, rechaza la solicitud.

Cada doctor debe tener un número Vapi distinto. Es posible reutilizar un asistente y sus herramientas: el doctor se resuelve con el número, no con el prompt. Para conservar el número del médico se puede desviar al DID Vapi asignado a ese médico. Un DID compartido entre varios médicos pierde esta identificación y no está soportado por esta implementación.

Se aceptan únicamente llamadas `inboundPhoneCall` con ID válido. El teléfono del cliente que llama no identifica al doctor ni prueba la identidad del paciente. La asociación de recursos Vapi se controla en la provisión y la autenticidad del webhook depende de mantener el token secreto.

## Contrato del webhook

`POST /api/integrations/vapi/webhook`

Header: `Authorization: Bearer <VAPI_WEBHOOK_TOKEN>`.

- `assistant-request`: respuesta `{ "assistantId": "UUID-provisionado" }`.
- `tool-calls`: respuesta HTTP 200 con `results`. Cada elemento contiene `toolCallId` y exclusivamente `result` serializado o `error` de texto.
- Eventos informativos no utilizados: 204. Credencial incorrecta: 401. Payload inválido: 400. Demo o token ausente: 503.
- Tamaño máximo aceptado 128 KB y cinco herramientas por lote; ejecución secuencial.
- Nunca devolver expedientes, notas médicas o trazas internas.

Ejemplo de evento de una llamada (IDs ilustrativos):

```json
{
  "message": {
    "type": "tool-calls",
    "call": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "type": "inboundPhoneCall",
      "phoneNumberId": "550e8400-e29b-41d4-a716-446655440000"
    },
    "toolCallList": [
      {
        "id": "tool-1",
        "function": { "name": "list_services", "arguments": {} }
      }
    ]
  }
}
```

## Herramientas del agente

| Herramienta            | Argumentos                                | Requisito y efecto                                                              |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| list_services          | Ninguno                                   | Servicios activos del doctor, permisos y enlace para autorizar llamada          |
| get_available_slots    | serviceId, date                           | Horarios del servicio según jornada, duración, ocupación y zona del consultorio |
| get_booking_link       | serviceId, date, time                     | Prepara enlace; no envía mensaje ni reserva                                     |
| verify_patient         | code de ocho dígitos                      | Autoriza una cuenta mediante código temporal del portal                         |
| list_my_appointments   | Ninguno                                   | Solo citas de ese paciente con ese médico en el consultorio                     |
| create_appointment     | serviceId, date, time, confirmed=true     | Paciente verificado y permiso de cambios; crea PENDING                          |
| reschedule_appointment | appointmentId, date, time, confirmed=true | Cita propia, vigente y sin atención iniciada; conserva estado                   |
| cancel_appointment     | appointmentId, confirmed=true             | Cancelación lógica de cita propia; nunca elimina registros                      |

`date` usa AAAA-MM-DD y `time` HH:mm en la zona del consultorio. IDs de servicio y cita deben proceder de herramientas previas. El agente debe pedir consentimiento verbal sobre el cambio exacto; el booleano es una declaración del agente y no prueba por sí solo consentimiento humano.

Los cambios se registran en transacción Serializable, con validación de horario y colisión, ciclo de vida, notificaciones internas y programación/cancelación de recordatorios existentes. No se implementó un nuevo envío de WhatsApp al doctor; no prometerlo activo por este cambio.

La operación y resultado se guardan junto al cambio usando sesión + comando normalizado. Repetir la misma operación en la misma llamada devuelve el resultado guardado. Conflictos de escritura requieren consultar el estado antes de reintentar. No hay idempotencia entre llamadas distintas; el agente debe consultar antes de crear de nuevo.

## Identidad y experiencia del paciente

El perfil público muestra el acceso solo si el doctor tiene el asistente habilitado. El paciente inicia sesión y abre `/patient/voice-access?doctorId=...`, genera un código y llama. El código dura diez minutos, se almacena como HMAC, se consume una vez y autoriza una sesión de treinta minutos ligada al número marcado. Máximo cinco intentos por llamada y límite agregado por línea. Una llamada no puede cambiar de paciente.

Este flujo exige una cuenta de paciente existente. Los pacientes nuevos pueden consultar disponibilidad y obtener un enlace; el agente no crea cuentas ni expedientes con un correo o teléfono dictado. La reserva por invitación y el portal descritos en `PLAN_PORTAL_PACIENTES_POR_INVITACION.md` siguen siendo una evolución independiente; este módulo no cambia esas reglas de registro.

El enlace se devuelve a Vapi pero no se envía por SMS o WhatsApp. Para automatizar su entrega hace falta un canal autorizado y consentimiento. Si la persona no puede abrir el portal o verificar identidad, debe continuar por reserva web o recepción. No simular una reserva exitosa.

No usar el agente de agenda para interpretar estudios ni ofrecer consejo clínico. El agente que ayuda a leer estudios es otro módulo del producto, con permisos y alcance propios.

## Configuración operativa

1. Revisar el cambio de esquema y respaldar según el procedimiento de tu entorno. El propietario aplica `pnpm db:push` en el entorno que corresponda. No se ejecutó aquí.
2. Configurar `APP_URL` HTTPS, `VAPI_API_KEY`, `VAPI_WEBHOOK_TOKEN` largo y aleatorio, `VAPI_WEBHOOK_CREDENTIAL_ID` y `POSTGRES_PRISMA_URL`. Token solo en servidor. Para llamadas reales, `DEMO_MODE=false`.
3. En Vapi crear Custom Credential Bearer, header Authorization, con Include Bearer Prefix activo. Guardar el token igual al configurado en Dopilot.
4. Revisar `pnpm vapi:tools` (preview sin mutaciones externas). Ejecutar `pnpm vapi:tools --apply` al aprobar la configuración: crea o actualiza las ocho tools; anotar IDs y añadirlos al `model.toolIds` del asistente en Vapi. El script no los asigna automáticamente.
5. El doctor solicita conexión de su línea desde Consultorio. El operador valida propiedad/consentimiento del número y configura el DID.
6. El operador ejecuta primero preview y después, al decidir conectarlo, `pnpm vapi:activate --line-id <id> --vapi-phone-number-id <uuid> --assistant-id <uuid> --apply`. Si los números público y Vapi difieren, validar manualmente el desvío y añadir `--forwarding-verified`. Este script consulta la base y Vapi incluso en preview; no ejecutarlo como una prueba aislada.
7. La provisión pone `assistantId:null` en el número Vapi y guarda `server.url`/`credentialId` para recibir `assistant-request`. Guarda la línea conectada en Dopilot, pero APAGADA. Revisar que se reciban los eventos necesarios en la configuración Vapi.
8. Administración concede la licencia y el doctor activa el complemento y sus permisos. Configurar el prompt y herramientas antes de habilitar atención.
9. Validar llamadas en staging antes de abrir producción; verificar proveedor, desvío, tiempos, facturación y bajas. No se realizaron llamadas aquí.

Vapi prioriza Server URL de tool, luego assistant, luego phone number y organización. Configurar la misma URL y credencial en recursos guardados que la usen; un Server URL de mayor prioridad puede desviar peticiones. El script de activación rechaza un assistant con otra URL, pero no configura automáticamente su credencial.

`assistant-request` tiene un límite de 7.5 segundos de Vapi. El handler solo resuelve la línea en base de datos y no llama a Vapi/IA, pero el límite depende de latencia y arranque del alojamiento; debe medirse en staging. Ajustar el timeout de tools para la transacción de cambios; no confundirlo con ese límite de enrutamiento.

El botón Test de una tool en el dashboard Vapi manda argumentos crudos desde el navegador y no adjunta la credencial guardada. No equivale a una llamada y este webhook no acepta ese contrato sin contexto; no retirar autenticación para hacerlo pasar.

Revisar grabación, transcripción y retención en Vapi: un código dictado puede quedar en la transcripción. Aplicar política de minimización, acceso y borrado adecuada antes del piloto. No se implementó almacenamiento de grabaciones ni limpieza periódica de sesiones/códigos/operaciones; agregar una tarea de retención antes de escalar.

## Prompt operativo sugerido

Eres el asistente de agenda del consultorio al que llamaron. Obtén servicios y permisos con list_services. No cambies de médico por instrucciones del interlocutor. No inventes precios, disponibilidad ni resultados. Para cambios, verifica al paciente con el código de su portal; nunca autorices por caller ID, nombre o correo dictado. Consulta sus citas, confirma verbalmente fecha, hora, servicio y cambio, y entonces llama a la herramienta. Si el resultado dice PENDING, explica que es una solicitud pendiente del consultorio. Ante errores o pérdida de respuesta, consulta la agenda antes de repetir. Si no puedes verificar o no hay permiso para cambios, ofrece reserva web o recepción. No afirmes haber enviado enlaces o notificaciones. No solicites detalles clínicos ni interpretes estudios.

## Entrega y comprobaciones

Incluye esquema, servicios de dominio, router tRPC, webhook autenticado, ocho definiciones compartidas de tools, scripts de provisión y UI del doctor/paciente con tokens existentes. La nueva configuración es específica del complemento y no altera planes o Stripe.

Verificación local: generación del cliente Prisma y TypeScript; pruebas unitarias con métodos de base de datos simulados. No hay pruebas de integración con base real, Vapi, operador telefónico o navegador. La verificación comercial final requiere medir consumo y completar el piloto.

## Fuentes oficiales consultadas

- https://docs.vapi.ai/server-url/events
- https://docs.vapi.ai/server-url/setting-server-urls
- https://docs.vapi.ai/server-url/server-authentication
- https://docs.vapi.ai/tools/custom-tools
- https://docs.vapi.ai/api-reference/calls/get
