# Arquitectura de seguimiento clínico y operativo

Estado: primera base implementada; migraciones generadas y pendientes de revisión del esquema real
Actualizado: 6 de octubre de 2026

## Objetivo de producto

Que el doctor pueda entender qué ocurrió en cada consulta, qué debe pasar después, qué pacientes requieren atención y si los resultados medidos mejoran con el tiempo. La plataforma debe apoyar el criterio del profesional; no diagnostica, recomienda tratamientos ni califica la calidad clínica por su cuenta.

## Diagnóstico del punto de partida

- Existe `Appointment` con estado, motivo y una nota libre. Sirve para administrar la cita, pero no registra una consulta clínica estructurada ni conserva enmiendas.
- `MedicalHistory` es una ficha única por paciente con antecedentes generales. Se puede editar como un bloque, por lo que no funciona como una línea de tiempo clínica.
- `MedicalHistory` y el perfil demográfico siguen siendo globales a la identidad del paciente. `ClinicPatient` separa los episodios por consultorio, pero aún falta modelar consentimiento explícito para compartir antecedentes entre clínicas.
- El paciente puede editar su ficha. La autoría, revisión y firma del profesional no están representadas en esos datos.
- Las relaciones de clínica ya están modeladas, pero `clinicId` sigue siendo opcional en operaciones existentes. `Patient.clinicId` no representa por sí solo la pertenencia de una persona a varias clínicas; `ClinicPatient` será la relación explícita y cada expediente seguirá aislado por clínica.
- Existe un outbox de mensajería con idempotencia; puede entregar recordatorios del seguimiento una vez que consentimiento, bajas y horarios permitidos formen parte de las reglas de producto.
- No existe una capa de resultados clínicos estructurados ni un feed de tareas entre consultas.

## Decisiones de arquitectura

### Dominios y fuentes de verdad

1. **Paciente:** identidad y datos demográficos; `ClinicPatient` vincula esa identidad con cada consultorio. El historial actual se conserva como antecedentes/autorreporte, no como registro de consultas.
2. **Episodio de atención (`CareEpisode`):** agrupa una necesidad o proceso de atención a lo largo del tiempo; pertenece a un paciente y clínica y tiene un profesional responsable y estado.
3. **Consulta (`ClinicalEncounter`):** registro de una atención concreta, ligada opcionalmente a una cita. Guarda motivo, campos clínicos estructurados, observaciones, evaluación y plan. Los borradores se pueden editar; al firmar se congelan. Una corrección posterior crea una enmienda con autor, fecha y motivo, sin sobrescribir el registro firmado.
4. **Seguimiento (`FollowUpTask`):** trabajo operativo con responsable, fecha límite, estado, prioridad, episodio y origen clínico opcional. Sus estados son `OPEN`, `IN_PROGRESS`, `COMPLETED` y `CANCELLED`; cada transición registra actor y fecha.
5. **Medición (`OutcomeAssessment`):** instrumento y versión, respuestas, puntuación, escala y fecha, enlazados al episodio y a la consulta. La versión del instrumento queda fija para que una edición futura no invalide comparaciones históricas.
6. **Observación (`ClinicalObservation`):** medida puntual estructurada —peso, estatura, componentes de presión arterial, pulso, temperatura o saturación— con código/unidad fija, valor, fecha, contexto opcional y autor. Un dato erróneo se anula con motivo y evento de auditoría; la lectura original permanece en base de datos. La UI compara valores del mismo código y unidad sin inferir diagnósticos.
7. **Auditoría (`ClinicalAuditEvent`):** registra escrituras y lecturas habilitadas de historial, línea de tiempo, tendencias, tareas y analítica, además de descargas privadas y solicitudes/generación de exportación; incluye actor, clínica, paciente cuando aplica, recurso y fecha, sin copiar texto clínico ni tokens al log. Debe verificarse la cobertura de rutas heredadas y la retención operativa.

La identidad `Patient` es global para evitar duplicarla. `ClinicPatient` indica que un consultorio atiende al paciente, quién lo incorporó y si esa relación está activa o archivada. Episodios, consultas, tareas, mediciones y auditoría son propios del consultorio; pertenecer a dos clínicas no comparte sus expedientes.

Los IDs y `clinicId` se obtienen o validan en el servidor. Las consultas del dominio filtran por membresía, relación clínica y permiso sobre el tipo de dato antes de leer o escribir. Recepción ve lo necesario para coordinar citas y tareas, pero no notas ni resultados clínicos por defecto.

### Capas

```text
Next.js (vistas del paciente y panel clínico)
  -> tRPC (validación Zod y autorización de recurso)
    -> casos de uso del dominio clínico
      -> repositorios Prisma + transacción + evento de auditoría
        -> PostgreSQL
      -> Outbox existente (recordatorios consentidos)
```

Los esquemas Zod viven en `src/server/domain/clinical/schemas.ts` y son la fuente de los tipos. Las reglas de estado, puntuación y permisos viven en el dominio; los routers son adaptadores delgados. Los registros clínicos usan selección explícita de campos y paginación estable.

### Resultados y analítica

- Primera versión: métricas descriptivas por clínica/profesional/periodo: citas completadas, cancelaciones y ausencias; tareas de seguimiento vencidas/completadas; tiempo hasta completar seguimiento; instrumentos aplicados; variación individual respecto a la medición inicial.
- Cada métrica muestra periodo, denominador, zona horaria, datos faltantes y filtros. No se compara a un médico con otro ni se presenta una puntuación como resultado clínico probado.
- La primera versión calcula sobre PostgreSQL con agregaciones acotadas e índices. Sólo se incorporan tablas de resumen/materialización cuando el volumen y latencia lo justifiquen.
- Un cambio de cita o tarea registra el evento operativo que permite explicar el cálculo y evita depender de una cifra sobrescrita.
- Ningún modelo genera diagnósticos, recomendaciones de tratamiento o predicciones en esta etapa.

### Archivos clínicos

Los archivos del expediente se guardan en el store privado `dctoralia-clinical-private`. PostgreSQL conserva metadatos y una clave opaca, nunca una URL pública permanente. La carga usa URLs prefirmadas de un solo archivo; Vercel Functions firma operaciones con OIDC usando `CLINICAL_STORE_ID` y verifica callbacks con `CLINICAL_WEBHOOK_PUBLIC_KEY`. La descarga pasa por una ruta autenticada que valida la clínica y el acceso al paciente antes de transmitir el archivo. Se registran cargas y descargas; se valida el MIME y el límite de 15 MB. Las imágenes de perfil y evidencia no clínica también usan un store privado (`BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY`); sus imágenes se sirven a través de una ruta de aplicación. En producción ambos stores se seleccionan por su ID y OIDC, sin compartir `BLOB_READ_WRITE_TOKEN`. Los tokens locales son independientes (`PROFILE_BLOB_READ_WRITE_TOKEN` y `CLINICAL_READ_WRITE_TOKEN`).

## Secuencia de implementación

### Fase 0 — Contratos y permisos

- Confirmar y documentar permisos para propietario, administrador, doctor y recepción.
- Resolver el contexto de clínica en cada operación clínica; definir cómo convivirán doctores individuales con clínicas sin membresía.
- Crear esquema de auditoría y pruebas de acceso por paciente/tenant antes de exponer nuevos endpoints.
- Revisar aviso de privacidad, consentimiento para datos sensibles y retención con asesoría especializada antes de activar expediente real.

### Fase 1 — Consulta y evolución

- Añadir episodios, consultas, estados de borrador/firma/enmienda y observaciones.
- Crear casos de uso transaccionales: abrir episodio, guardar borrador, firmar consulta, enmendar y consultar línea de tiempo.
- Vincular citas existentes con consultas sin reescribir ni borrar sus notas históricas.
- UI del doctor: vista de paciente con resumen, línea de tiempo, consulta actual y guardado explícito.

### Fase 2 — Plan y tareas entre consultas

- Añadir tareas derivadas del plan clínico con asignación, fecha límite, prioridad y transición auditable.
- Panel “Seguimientos”: pendientes de hoy, vencidos, próximos y sin responsable; acciones rápidas con confirmación y contexto.
- Recordatorios internos primero; notificación al paciente sólo con consentimiento, preferencias y reglas de horario.
- Medir cumplimiento de seguimiento y tiempo a cierre con denominadores explícitos.

### Fase 3 — Resultados medibles

- Implementar catálogo versionado de instrumentos y escalas aprobados para el segmento piloto.
- Registrar mediciones basales y posteriores con procedencia, fecha, puntuación y completitud.
- Mostrar trayectoria del paciente y agregados de cohorte con tamaños mínimos y datos faltantes visibles.
- Revisar fórmulas con profesionales del segmento antes de usar resultados en decisiones clínicas.

### Fase 4 — Operación, archivos y lanzamiento

- Incorporar notas y documentos en Blob privado con permisos por recurso, auditoría y retención.
- Conectar recordatorios consentidos al outbox, con idempotencia y bajas efectivas.
- Cerrar exportación del expediente, trazabilidad y recuperación de errores.
- Pilotear con los clientes potenciales existentes; capacitar, importar datos con autorización y observar tareas reales.

## Criterios de salida del primer vertical

- Un doctor autorizado puede abrir una consulta ligada a una cita, guardar borrador, firmarla y corregirla mediante enmienda.
- El paciente tiene una línea de tiempo ordenada que no mezcla sus antecedentes autoeditables con registros profesionales.
- Un plan puede originar tareas con responsable y fecha; el doctor puede ver vencimientos y registrar resolución.
- Las mediciones tienen unidades, instrumento/versionado y procedencia; la UI explica el periodo y denominador de cada resumen.
- Recepción, otro profesional, otro tenant y el paciente sólo obtienen los campos permitidos por su rol y relación.
- Los archivos clínicos no quedan accesibles con URLs permanentes y toda lectura/descarga autorizada queda auditada.
- Ninguna actualización destruye silenciosamente una consulta firmada ni altera la fórmula de un resultado histórico.

## Orden de trabajo inmediato

1. Revisar permisos de lectura y completar auditoría de acceso, descarga y exportación antes de activar expedientes reales.
2. Preparar y revisar la migración aditiva, incluido el backfill de membresías de pacientes desde clínicas y citas existentes.
3. Validar carga/descarga de archivos privados en staging con el store clínico y verificar su auditoría.
4. Validar el catálogo y las puntuaciones de instrumentos con médicos del segmento piloto.
5. Probar los flujos de seguimiento, recordatorios consentidos y recuperación operativa con clínicas piloto.

No ejecutar `db push`, migraciones de producción ni cambios destructivos desde este plan. Las migraciones deben revisarse y aplicarse en un entorno controlado según la estrategia del propietario del proyecto.

## Migraciones preparadas

- `prisma/migrations/20261006000000_baseline/migration.sql` representa el esquema previo al corte clínico (commit `6754e126`).
- `prisma/migrations/20261006010000_clinical_follow_up/migration.sql` agrega la capa clínica, hace opcional el autor histórico de membresías y crea relaciones `ClinicPatient` a partir del `clinicId` legado y las citas. El backfill usa `LEGACY_BACKFILL`, actor nulo y `ON CONFLICT DO NOTHING`.
- `prisma/migrations/20261006020000_clinical_files/migration.sql` agrega la tabla y enum para metadatos de documentos privados; es aditiva y no modifica archivos existentes.
- `prisma/migrations/20261006030000_medical_history_consent/migration.sql` agrega el permiso revocable por paciente/consultorio; el estado inicial no concede acceso.
- `prisma/migrations/20261007000000_patient_message_consent/migration.sql` agrega consentimiento revocable por canal y expiración de mensajes.
- `prisma/migrations/20261008000000_appointment_attendance_events/migration.sql` agrega eventos de llegada e inicio de consulta.
- `prisma/migrations/20261008010000_unique_appointment_attendance/migration.sql` agrega claves idempotentes para evitar marcas duplicadas.
- `prisma/migrations/20261008020000_message_consent_purposes/migration.sql` separa el consentimiento de citas y seguimiento; los consentimientos previos conservan sólo el propósito de citas.
- `prisma/migrations/20261008030000_user_notifications/migration.sql` agrega destinatario independiente, idempotencia de avisos, marca de vencimiento y el vínculo a tareas asignadas; conserva la bandeja histórica del doctor.
- **Estado actual:** el schema mantiene `Notification.recipientUserId` opcional para conservar las notificaciones existentes sin backfill destructivo. La migración SQL anterior lo marca obligatorio y no representa el estado que aplica `pnpm db:push`; no ejecutar `db:migrate` sobre una base sincronizada con `db:push` sin reconciliar previamente ambas rutas.
- `prisma/migrations/20261008040000_clinical_observations/migration.sql` agrega observaciones clínicas estructuradas y conserva anulaciones con motivo y autor.
- Base vacía: `pnpm exec prisma migrate deploy` ejecuta las diez migraciones preparadas.
- Base existente que coincide exactamente con el baseline: comparar primero el esquema real; sólo entonces marcar `20261006000000_baseline` como aplicado con `pnpm exec prisma migrate resolve --applied 20261006000000_baseline` y desplegar la migración clínica en staging.
- Si `db push` ya dejó algunas tablas clínicas creadas o la estructura no coincide con el baseline, no ejecutar esos comandos sin reconciliar el estado; la migración no se compara ni se aplica automáticamente contra una base en este corte.

## Corte iniciado en esta entrega

- Se añadieron al schema episodios, consultas, enmiendas, tareas de seguimiento, mediciones versionadas por código/versión, auditoría clínica y eventos de ciclo de vida de cita.
- Se añadió `ClinicPatient` para permitir que una identidad participe en varias clínicas sin compartir expedientes. Crear un paciente desde el panel y abrirle un episodio activa la relación con el consultorio en la misma transacción, sin modificar el `clinicId` legado de la ficha global.
- Se preparó un baseline a partir del esquema inmediatamente anterior al corte clínico y una migración aditiva que crea los nuevos dominios, añade datos complementarios a `MedicalHistory` y hace backfill idempotente de membresías desde `Patient.clinicId` y citas; el actor histórico queda como desconocido, no se inventa.
- Se añadió `ClinicalFile` con metadatos aislados por clínica, ruta opaca de Blob privado, categoría y relaciones opcionales con episodio/consulta. La carga y descarga se autorizan en servidor y generan eventos de auditoría; no se entrega una URL pública.
- La ficha clínica lista y adjunta PDF/JPG/PNG/WebP (máximo 15 MB) y descarga mediante endpoint autenticado. Para producción, conecta `dctoralia-clinical-private` al proyecto con prefijo `CLINICAL`; Vercel provee `CLINICAL_STORE_ID`, `CLINICAL_WEBHOOK_PUBLIC_KEY` y credenciales OIDC a Functions. `CLINICAL_READ_WRITE_TOKEN` queda como alternativa local opcional.
- Se añadió consentimiento revocable por clínica para que el paciente controle el acceso a sus antecedentes auto-reportados. Las lecturas sólo ocurren después del permiso y se registran por separado; las pantallas de paciente permiten otorgarlo o revocarlo.
- Se implementaron en tRPC apertura de episodios, borradores, firma, enmiendas, tareas, línea de tiempo del paciente, registro de puntuación y tendencia por instrumento/versión.
- Se añadieron preferencias de recordatorios por paciente, clínica y canal (SMS/WhatsApp), con alta voluntaria, revocación inmediata de mensajes pendientes y auditoría. Las citas nuevas o reagendadas generan recordatorios idempotentes de 24 h/2 h sólo si hay consentimiento, plantilla configurada y teléfono válido; se respetan las 09:00–19:00 locales de la clínica. Cancelación, cierre y ausencia invalidan los avisos pendientes. La migración aditiva `20261007000000_patient_message_consent` queda pendiente de revisión y aplicación controlada.
- La ficha del doctor permite guardar/editar borradores, firmar, enmendar, abrir episodios, crear seguimientos y ver una gráfica de puntuación inicial/actual/cambio. La vista de seguimiento muestra pendientes y actividad operativa.
- La puntuación inicial es capturada por el doctor y sólo se compara por código y versión. Aún no hay un catálogo de instrumentos ni cálculo automático validado; tampoco se etiqueta un cambio como favorable o desfavorable.
- Los eventos de cita se guardan junto con reservas, cancelaciones, cambios de estado y reagendados. No se inventa el historial de transiciones anterior a esta función; el estado actual de citas existentes sigue disponible como fotografía.
- La asistencia operativa se registra como eventos inmutables `CHECKED_IN` y `CONSULTATION_STARTED`, con clave idempotente por cita y acción. La llegada y el inicio sólo se registran el día local de la cita; iniciar requiere llegada previa y reagendar queda bloqueado tras el check-in. La espera se agrega únicamente si existen ambos eventos y el inicio no precede a la llegada. Las migraciones de asistencia quedan pendientes de revisión/aplicación controlada.
- El borrador firmado no admite edición directa. Las enmiendas quedan como entradas separadas con motivo, autor y fecha. Las notas antiguas de la cita quedan como dato legado y se bloquean después de firmar un encuentro asociado.
- El listado de pacientes de doctor quedó limitado a su consultorio y audita su apertura; la lectura individual de perfil también queda registrada. Las rutas heredadas que devuelven antecedentes exigen consentimiento explícito y auditan su lectura. Queda pendiente revisar el alcance global legado del rol `ADMIN` y la cobertura de las demás rutas antes de abrir expedientes reales.
- La auditoría en código cubre la línea de tiempo, lecturas permitidas de antecedentes, carga/descarga de archivos, tendencias, tareas, analítica y solicitud/generación de exportación. La exportación JSON limita el tamaño, filtra por médico y consultorio y enumera metadatos de documentos sin incluir archivos ni rutas Blob. Queda pendiente revisar la cobertura de rutas heredadas y definir retención/alertas.
- La migración de consentimiento no otorga permisos históricos automáticamente: el estado inicial es sin permiso y el paciente debe habilitar cada consultorio. El texto de privacidad/consentimiento y la retención requieren revisión especializada antes de comercializar el flujo con datos reales.
- Los recordatorios de tarea usan un propósito de consentimiento separado del de citas. El mensaje externo sólo lleva nombre de pila, consultorio y fecha límite; excluye título/detalles clínicos. Al cerrar la tarea o revocar el canal se cancelan envíos pendientes. La plantilla `SENT_FOLLOW_UP_REMINDER_TEMPLATE` queda opcional y requiere aprobación/validación en sandbox antes de habilitar el envío.
- La bandeja del doctor incluye el último estado de envío por canal para sus tareas visibles, consultado sólo por `clinicId` y sus IDs de tarea. No se devuelve teléfono, destinatario ni payload al cliente.
- Los avisos de la app se guardan por `recipientUserId`, con lectura independiente para doctor y paciente. Reservar, confirmar, reagendar, completar y cancelar informan al usuario correspondiente; asignar una tarea a otro doctor avisa al responsable y `/api/cron/notifications` crea una sola alerta al vencerla. El cron no llama a Sent; requiere `CRON_SECRET` y un scheduler independiente. Los avisos internos no reemplazan consentimiento para SMS/WhatsApp.
- La nueva migración `20261008030000_user_notifications` agrega la propiedad por destinatario, clave idempotente y referencia al seguimiento; los avisos históricos se asignan al usuario doctor para conservar su estado. La migración queda pendiente de revisión/aplicación controlada.
- No se aplicaron migraciones ni se modificó una base de datos. Aunque `.env` contiene variables de conexión, no se comparó el esquema instalado. En una base existente, sólo marcar el baseline como aplicado después de verificar que coincide con el esquema previo; después revisar todas las migraciones contra un respaldo y ejecutarlas primero en staging. Una instalación vacía puede aplicar baseline y migraciones desde cero. El Blob clínico usa `CLINICAL_STORE_ID` y `CLINICAL_WEBHOOK_PUBLIC_KEY` separados del store privado de perfiles; no se reutiliza el bucket de perfiles para documentos médicos.
