# Activación del flujo de pacientes y recepción

## Cambios preparados

- La reserva pública crea una solicitud pendiente y un contacto sin credenciales activas. Recepción puede reservar con nombre y teléfono sin capturar información clínica.
- El administrador de agenda tiene credenciales propias y acceso operativo; no puede abrir expedientes, iniciar o firmar consultas, descargar documentos clínicos ni configurar al doctor.
- Iniciar consulta abre o recupera el borrador asociado a la cita. La finalización exige firmar desde el expediente; no se completa por el cambio genérico de estado.
- Finalizar crea una cuota de dos archivos por consulta. El servidor controla autorización, reservas e intentos repetidos. Borrar un archivo no recupera cuota.
- La invitación del paciente utiliza un token de un solo uso, almacenado como hash, con vigencia de 24 horas. Vincular una cuenta existente no fusiona expedientes de distintos doctores.
- Confirmaciones e invitaciones se encolan en la transacción. El envío depende del consentimiento, las plantillas y la configuración de Sent.dm; el modo demo no envía mensajes reales.

## Pasos pendientes de operación

1. Instalar las dependencias declaradas con `pnpm install`. PDFKit y svg-to-pdfkit no pudieron instalarse en el entorno del agente por la resolución del espejo de paquetes; no se verificó la generación real del PDF.
2. Revisar el cambio de schema y ejecutar personalmente `pnpm db:push` contra la base de datos correspondiente. El agente no aplica cambios ni consulta datos de la base.
3. Configurar APP_URL, SENT_APPOINTMENT_CONFIRMATION_TEMPLATE y SENT_PORTAL_INVITATION_TEMPLATE con las plantillas aprobadas. Verificar las credenciales, el procesador de outbox y webhooks de mensajería existentes antes de habilitar envíos reales.
4. En Consultorio configurar teléfono de soporte, reservas públicas, confirmaciones, invitaciones y el acceso del administrador de agenda.
5. El feedback temporal se controla con VALIDATION_FEEDBACK_ENABLED y VALIDATION_FEEDBACK_UNTIL; la fecha predeterminada de cierre es 2026-11-22T05:59:59Z. No publicar datos clínicos en el feedback global.

## Límites de validación

Se utilizan pruebas unitarias con dependencias simuladas y comprobaciones de tipos y lint. No se realizaron pruebas de navegador, cambios en base de datos, envíos reales de WhatsApp ni carga real de archivos. El panel del paciente aún requiere revisar la exposición completa de recetas y resúmenes para los expedientes vinculados a una cuenta existente antes de dar por validado todo el recorrido en producción.