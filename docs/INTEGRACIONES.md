# Dopilot — configuración de Stripe y Sent

## Estado real

La UI de Workspace permite crear un consultorio, abrir Checkout, abrir el portal y consultar el estado de la suscripción. Estas operaciones usan tRPC y su contrato `result/error/status/message`. Sólo los callbacks externos y el dispatcher programado tienen rutas HTTP.

Sent tiene SDK real, cola durable, leases, reintentos acotados, identificadores de proveedor, webhook HMAC y seguimiento de entregas. La prueba disponible en Workspace usa **siempre sandbox** y el teléfono del propietario; no se han conectado todavía las recetas automáticas a pacientes.

No se ha verificado un pago real, una entrega real ni el flujo contra la base de datos de producción. Las pruebas automatizadas usan dobles de prueba, no cuentas externas.

## 1. Esquema

Aunque hayas aplicado el esquema anterior, esta entrega añade campos de lease/Checkout/entrega y `BillingWebhookEvent`. Ejecuta tú mismo `pnpm db:push` después de revisar el diff y el destino de tu conexión. No aceptes advertencias de pérdida de datos sin revisarlas. El agente sólo ejecutó `pnpm prisma generate`.

Las suscripciones nuevas se crean `PAUSED`; no se convierten en activas desde el navegador ni por una URL de retorno. Los registros existentes conservan su estado.

## 2. Variables en Vercel

Copia los nombres de `.env.example` a Settings → Environment Variables. Configura valores independientes para Development/Preview/Production. Nunca mezcles claves test con precios live. `APP_URL` debe ser el dominio HTTPS canónico en producción. No hay claves públicas necesarias para Checkout alojado.

## 3. Stripe

1. Crea el precio Pro mensual de **800 MXN** (`unit_amount=80000`, sin medición por uso). Incluye 150 MXN de crédito de mensajería en el catálogo comercial de Dopilot.
2. Configura `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO` y `APP_URL`.
3. Configura los precios Enterprise y Custom sólo cuando tengas las condiciones del contrato. Los campos vacíos generan un error recuperable, no un precio ficticio. Este primer adaptador admite precios fijos mensuales en MXN; no admite cantidades por asiento ni tarifas escalonadas.
4. Registra `https://TU_DOMINIO/api/integrations/stripe/webhook` para `customer.subscription.created`, `customer.subscription.updated` y `customer.subscription.deleted`. Usa eventos snapshot. Guarda su secreto en `STRIPE_WEBHOOK_SECRET`.
5. Habilita el portal para facturas, método de pago y cancelación. Mantén deshabilitada la modificación de plan/cantidad: el downgrade exige validar doctores y ubicaciones, y el portal no pasa por esa comprobación de Dopilot.
6. En Workspace, crea el consultorio si aún no existe, elige el plan y abre Checkout. El webhook firmado sincroniza el estado. «Actualizar estado» consulta la base; no fuerza la activación.

Checkout y webhooks comparten un lease por suscripción. Se reutiliza Checkout abierto, se usan claves idempotentes para crear cliente/sesión y se deduplican eventos aplicados en una transacción. El webhook obtiene el estado actual de Stripe para no confiar en el orden de entrega. Los errores de procesamiento responden 503 para permitir reintento.

El crédito de 150 MXN es una regla comercial; **todavía no se descuentan costos reales de Sent ni se factura automáticamente el excedente**. No cobres excedentes basados en cantidad de mensajes o estimaciones: falta reconciliar costos reales, moneda, periodo y factura. El soporte/desarrollo personalizado de Custom es un beneficio contractual, no una funcionalidad automatizada.

Referencias: [Checkout](https://docs.stripe.com/api/checkout/sessions/create), [webhooks](https://docs.stripe.com/webhooks), [estados de suscripción](https://docs.stripe.com/billing/subscriptions/webhooks).

## 4. Sent

1. Mientras se aprueba la plantilla, conserva `SENT_ENABLED=false` y `SENT_SANDBOX=true`.
2. Configura `SENT_API_KEY`. Con una clave de organización configura además `SENT_PROFILE_ID`; con una clave de perfil puede omitirse.
3. Configura `SENT_TEST_TEMPLATE` con el nombre exacto de una plantilla que reciba el parámetro `name`. No se inventa ni aprueba una plantilla desde Dopilot.
4. Para citas, configura `SENT_APPOINTMENT_REMINDER_TEMPLATE` con el nombre exacto de la plantilla aprobada que acepte `patient_name`, `doctor_name`, `appointment_date` y `appointment_time`. Altas/reagendados crean hasta dos avisos (24 h y 2 h antes). Para fechas límite de seguimiento, configura por separado `SENT_FOLLOW_UP_REMINDER_TEMPLATE` con una plantilla aprobada que acepte `patient_name`, `clinic_name` y `due_date`; crea un aviso hasta 24 h antes (o al activar el consentimiento si falta menos tiempo). Cada propósito requiere consentimiento explícito independiente por canal. Los recordatorios de seguimiento nunca envían título, tipo ni detalles clínicos de la tarea. Ambos flujos validan teléfono mexicano o E.164 y horario local 09:00–19:00, caducan al llegar primero su fecha límite, el cierre de horario o 30 minutos tras programarse y se descartan si el scheduler corre tarde. Citas y tareas completadas/canceladas invalidan sus avisos pendientes; la baja sólo afecta el propósito y canal revocados. Si una plantilla queda vacía, su flujo no encola mensajes.
5. Registra `https://TU_DOMINIO/api/integrations/sent/webhook` para los eventos de estado de mensaje. Configura `SENT_WEBHOOK_SECRET`. Se comprueba HMAC sobre el body original y tolerancia de cinco minutos.
6. Genera un `CRON_SECRET` aleatorio de al menos 32 caracteres y configura un scheduler para `GET /api/cron/messages` con `Authorization: Bearer <CRON_SECRET>`. No hay cron instalado automáticamente. En Vercel, una frecuencia por minuto requiere un plan que la admita; no agregues esa frecuencia en Hobby.

El endpoint independiente `GET /api/cron/notifications` usa el mismo `CRON_SECRET` para crear avisos internos idempotentes de seguimientos vencidos. No invoca Sent y puede programarse con una frecuencia compatible con el plan de Vercel; sin scheduler, la bandeja sigue funcionando para citas y asignaciones, pero los avisos de vencimiento no se materializan automáticamente. 7. Activa `SENT_ENABLED=true` **manteniendo sandbox**. Guarda tu teléfono propio con prefijo de país y prueba desde Workspace. El dispatcher procesa hasta cuatro mensajes por ejecución. Consulta «Actualizar» para ver estados e intentos.

Los registros de prueba siguen siendo sandbox aunque después cambies la variable global. Una aceptación por la API no significa entrega: la tabla lo etiqueta como «Aceptado». Los callbacks actualizan entregado/leído y no retroceden esos estados por eventos tardíos. Rechazos `FAILED`, `FILTERED` o `BLOCKED` son terminales. La clave enviada se normaliza a SHA-256, compatible con la restricción de Sent.

Después de cinco intentos o fuera de la ventana segura de idempotencia (23 horas desde creación, si hubo un intento), el registro queda para revisión, no se reenvía con una clave nueva. No existe reenvío masivo de dead-letter. Si una función se interrumpe, el siguiente dispatcher recupera el lease vencido. Si un callback llega antes de persistir el ID del envío, se responde 503 para reintento.

El inbox conserva sólo identificador y estado, no el texto completo del proveedor ni datos clínicos. No se procesan todavía comandos entrantes de confirmación/cancelación.

Referencias: [SDK](https://docs.sent.dm/sdks/typescript), [firma de webhooks](https://docs.sent.dm/build/signature-verification), [eventos](https://docs.sent.dm/start/webhooks/event-types).

## Pendiente antes de habilitar automatizaciones a pacientes

- Completar recepción/validación de ambas plantillas con Sent sandbox y verificar el scheduler; consentimientos independientes por propósito/canal, baja persistente, horario local de silencio, cancelación de avisos obsoletos e idempotencia ya están implementados para citas y seguimientos.
- Avisos de reserva, recuperación de pacientes y solicitud de reseña; comandos entrantes de confirmación/cancelación auditados.
- Perfil/plantillas por workspace y autorización comercial de mensajería.
- Contabilidad/reconciliación de costos reales, crédito incluido y cobro idempotente de excedentes.
- Prueba de integración con Stripe test y Sent sandbox después de configurar variables y aplicar el esquema.
- E2E autenticado y revisión visual móvil de las nuevas pantallas contra datos de prueba.

Vapi tiene ahora solicitudes de línea por doctor, un webhook autenticado y tres tools de consulta. Su alta operativa, límites y pasos pendientes para CRUD telefónico están en [VAPI_VOZ.md](./VAPI_VOZ.md).
