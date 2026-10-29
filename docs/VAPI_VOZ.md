# Alta de números y agente telefónico Vapi

## Decisión para este producto

Un teléfono no se puede generar al azar: primero debe existir una línea asignada por un operador de telefonía. Mantendremos una cuenta Vapi de la plataforma y una línea entrante por doctor al inicio. El teléfono comercial de una clínica puede compartirse después con enrutamiento explícito, pero hoy `VoiceAgentLine` es único por doctor y por número.

| Caso | Alta recomendada |
| --- | --- |
| Doctor acepta un número nuevo | Comprar un DID local con un proveedor compatible, importarlo a Vapi y mostrarlo como línea de recepción. |
| Doctor ya publica un número | Portarlo a un proveedor compatible, o configurar desvío de llamadas desde su operador a un DID importado. El desvío conserva el número que marca el paciente; el DID de destino es el que se registra en Vapi. |
| Varias personas comparten recepción | Un número de la clínica y selección de doctor durante la llamada. Requiere un modelo de línea de clínica adicional; el modelo actual no lo automatiza. |

Para México, comprobar disponibilidad local y requisitos de portabilidad directamente con el proveedor. Un número capturado en el perfil del doctor **no** significa que Vapi pueda contestarlo. No pedir al doctor claves de Twilio ni de Vapi; la plataforma controla la integración y verifica el número antes de activarlo.

## Flujo de alta disponible en el repositorio

1. El doctor guarda su teléfono en su perfil y solicita la línea en **Workspace → Agente de voz**. Se crea una solicitud `PENDING` con número E.164.
2. El operador comprueba titularidad y decide compra, portabilidad o desvío con el proveedor. Importa el DID a la cuenta Vapi de la plataforma y crea/asigna un asistente.
3. Configura una credencial Vapi de tipo Bearer para que envíe `Authorization: Bearer <VAPI_WEBHOOK_TOKEN>` al servidor. Copia su UUID a `VAPI_WEBHOOK_CREDENTIAL_ID`.
4. Define `APP_URL` con HTTPS público y configura `VAPI_API_KEY`, `VAPI_WEBHOOK_TOKEN` (32+ caracteres) y `VAPI_WEBHOOK_CREDENTIAL_ID` en el servidor. No publicar estas variables en el navegador.
5. Ejecuta `pnpm vapi:tools` para previsualizar las tres Function tools y `pnpm vapi:tools --apply` para crearlas en Vapi. Añade los tres IDs al asistente desde la pestaña **Tools** de Vapi. La creación de tools no modifica automáticamente el asistente.
6. Consulta el ID de la solicitud `VoiceAgentLine` y los IDs del número y asistente Vapi. Ejecuta `pnpm vapi:activate --line-id <id> --vapi-phone-number-id <uuid> --assistant-id <uuid>` como vista previa y repite con `--apply`. El script comprueba que el número E.164 coincide, que el número está activo y que número y asistente pertenecen a la misma organización Vapi. Si el doctor conserva un número público diferente y lo desvía al DID Vapi, prueba el desvío con una llamada real y añade `--forwarding-verified`; se guardan ambos números. Configura el Server URL del número y deja el ID del asistente sin asignar en el número para que Vapi pregunte al webhook qué asistente usar.
7. Llama al número real. Confirma el evento `assistant-request`, respuesta con `assistantId`, llamada a `list_services` y `get_available_slots`, y que el doctor correcto aparece en la agenda. Revisa los logs de webhook y de llamada en Vapi.

`POST /api/integrations/vapi/webhook` recibe eventos de Vapi. Los `tool-calls` se limitan al doctor de la línea autenticada por número Vapi, con hasta cinco llamadas por petición. Las tools actuales sólo consultan servicios y disponibilidad o preparan un enlace para completar la reserva y el brief médico dentro de la app. No exponen expedientes ni hacen cambios clínicos por teléfono.

## Siguiente fase para CRUD telefónico

Antes de crear, reprogramar o cancelar citas existentes, verificar la identidad del paciente con un código enviado a su canal registrado; el identificador de llamada por sí solo no autoriza acceso al expediente. La creación telefónica debe recoger consentimiento y el brief (síntomas, alergias, medicación), asignarlo al paciente correcto y confirmar nuevamente la disponibilidad en una transacción. Reprogramar/cancelar requiere un identificador de cita acotado al paciente verificado y al doctor de la línea. Después se podrán añadir tools `verify_patient`, `create_appointment`, `reschedule_appointment` y `cancel_appointment`, con auditoría e idempotencia por llamada.

## Fuentes

- [Vapi: Phone calls](https://docs.vapi.ai/phone-calling)
- [Vapi: importar Twilio](https://docs.vapi.ai/phone-numbers/import-twilio)
- [Vapi: server events y respuestas](https://docs.vapi.ai/server-url/events)
- [Vapi: Function tools](https://docs.vapi.ai/tools/custom-tools)
- [Vapi: autenticación de webhooks](https://docs.vapi.ai/server-url/server-authentication)
- [Twilio: números y portabilidad](https://www.twilio.com/docs/phone-numbers)
