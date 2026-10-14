# Plan de UX para Dctoralia

Objetivo: que Dctoralia ayude a un médico y a su equipo a operar la consulta completa, dar continuidad clínica entre citas y permitir que nuevos pacientes encuentren y agenden con el profesional adecuado. La referencia visual es Vercel: tipografía limpia, fondo claro, navegación oscura, líneas sutiles, datos legibles y acciones directas.

## Fase 1 — Centro operativo del médico

- El resumen inicial presenta citas de hoy, solicitudes por confirmar, pacientes atendidos en el mes y pacientes con actividad. Cada indicador abre su sección.
- La agenda muestra citas reales con paciente, servicio, hora, duración y estado; un horario vacío no se representa como si fuera una cita.
- Acciones frecuentes visibles: crear cita, registrar paciente, editar servicios y horarios.
- Los estados vacíos explican qué falta y ofrecen una acción útil; errores de red incluyen reintento.
- Transiciones de entrada breves para tarjetas y filas. Motion aporta el ritmo de componentes; GSAP anima las filas visibles de agenda. Se desactiva el movimiento no esencial con `prefers-reduced-motion`.

## Fase 2 — Agenda y agendamiento confiables

- Vistas día/semana con navegación consistente, citas agrupadas por hora y filtros por estado, servicio y ubicación.
- Agendar o reprogramar con un modal por pasos: paciente, servicio, fecha/hora disponible y confirmación. Mantener formulario accesible por teclado y recuperar los datos si se cierra accidentalmente.
- Validar disponibilidad en servidor al guardar para evitar dobles reservas; distinguir solicitud pendiente, cita confirmada, cancelación y ausencia.
- Menú contextual por cita con acciones seguras: abrir expediente, confirmar, reprogramar y cancelar; confirmar acciones destructivas.

## Fase 3 — Directorio médico y mapa de México

- Agregar ubicación de consulta al perfil: dirección, ciudad, estado, enlace de Google Maps y coordenadas opcionales.
- V1 guarda una ubicación por doctor; diseñar la evolución a varias sedes cuando el flujo de clínicas esté listo.
- El directorio permite buscar por nombre, especialidad y ciudad, con resultados en lista y mapa sincronizados.
- MapLibre/Mapcn presenta puntos únicamente cuando hay coordenadas dentro de México. Un enlace de Google Maps que no incluya coordenadas no se convierte en pin por suposición; el perfil pide latitud/longitud manual o una integración de geocodificación aprobada.
- Limitar resultados a México en esta primera versión. La ciudad filtra ubicaciones guardadas, aunque una ubicación aún no tenga coordenadas para el mapa.
- Para activar el mapa en producción, configurar `NEXT_PUBLIC_CARTO_BASEMAP_API_KEY`, limitar la clave por dominio, monitorear solicitudes y conservar atribución CARTO/OSM visible; completar la migración de ubicaciones.

## Fase 4 — Seguimiento clínico entre consultas

- Expediente con línea temporal de consultas, problemas activos, antecedentes, medicamentos, alergias, documentos y acuerdos con el paciente.
- Tareas de seguimiento con responsable, fecha límite, estado y evidencia; lista diaria de pendientes y alertas de vencimiento.
- Mediciones y resultados en series temporales con unidad, fecha y contexto. Mostrar cambio frente a mediciones previas y el rango de referencia cuando exista.
- Plantillas de consulta por especialidad, notas privadas del equipo separadas de información visible al paciente y bitácora de cambios clínicos.
- Acceso por rol, consentimiento y auditoría para todos los datos clínicos; los documentos sensibles permanecen en el bucket privado clínico.

## Fase 5 — Operación, comunicación y crecimiento

- Paneles de productividad con métricas calculadas desde citas y expedientes reales: ocupación, cancelaciones, ausencias, tiempos de espera y continuidad de seguimiento.
- Mensajes y recordatorios con estados de entrega, plantillas y preferencias de consentimiento. Evitar notificaciones duplicadas.
- Perfil público del doctor con servicios, precios, ubicaciones, disponibilidad, reseñas y contenido profesional moderado.
- Publicaciones y artículos sólo después de definir revisión, consentimiento para imágenes clínicas y protección de identidad del paciente.

## Criterios de salida por pantalla

- Acciones con etiqueta clara, foco de teclado visible y estados de carga/éxito/error.
- Contraste legible, encabezados en orden, sin scroll horizontal en móvil y controles táctiles cómodos.
- Animación breve (normalmente 150–250 ms), con easing de salida para entradas; no animar cada pulsación ni bloquear interacción.
- Datos operativos provenientes de la API; no presentar datos de ejemplo como si fueran del médico.
- Revisar con `prefers-reduced-motion`, teclado y anchos de 375, 768, 1024 y 1440 px.

## Estado actual

- Fase 1 inicial implementada: resumen operativo, indicadores con enlaces, agenda de citas reales y estados vacíos útiles. El alta de cita abre en un diálogo.
- Fase 2 completada: la agenda permite cambiar entre día y semana, navegar por fechas, filtrar por estado/servicio/ubicación y revisar citas en cards por día dentro de una semana de siete columnas. Las cards conservan acceso al expediente y acciones de confirmar, completar, reprogramar y cancelar. El alta de cita es un flujo de tres pasos (paciente/servicio, fecha/horario y confirmación); los espacios se calculan desde la jornada y duración del servicio, y se validan de nuevo al guardar. Reprogramación también consulta espacios libres y vuelve a validarlos en servidor.
- Fase 4 con base funcional: ya existen episodios, consultas clínicas con borrador/firma/enmienda, tareas auditadas, mediciones por instrumento/versión, tendencias y archivos clínicos privados. La captura de tareas permite definir tipo, prioridad y responsable; el dashboard muestra las próximas tareas propias por vencimiento con acciones para iniciar/resolver, y la bandeja permite buscar/filtrar y ver estado del mensaje por canal sin mostrar destinatario ni contenido. Los recordatorios de fechas límite usan consentimiento independiente del consentimiento de citas y contenido neutro. Falta validar plantillas y scheduler en Sent sandbox.
- El expediente del doctor incorpora observaciones clínicas estructuradas (peso, estatura, presión sistólica/diastólica, pulso, temperatura y saturación). Cada código tiene unidad fija; la tarjeta muestra última lectura, cambio descriptivo y una trayectoria por fecha. Registrar y anular requieren autorización clínica; la corrección conserva el original y registra motivo y actor. La migración `20261008040000_clinical_observations` está preparada para revisión y aplicación controlada, no aplicada aquí.
- El expediente ofrece una exportación JSON confirmada y auditada, con un alcance explícito por doctor, paciente y consultorio. Incluye consultas y enmiendas, episodios, tareas, resultados, observaciones, citas y metadatos de documentos; los archivos binarios continúan en su descarga privada. La generación tiene límite de tamaño y frecuencia, devuelve un error en lugar de un expediente parcial y no expone rutas Blob. El listado y la descarga de documentos exigen además relación del archivo con el médico responsable o su autoría.
- Avisos dentro de la app: reservar, confirmar, reagendar, completar o cancelar una cita informa a las personas involucradas; asignar un seguimiento a otro integrante avisa al responsable y una tarea vencida genera un aviso idempotente con texto genérico. Paciente y doctor tienen bandeja con filtros, marcar como leído, eliminar y acceso a la cita/seguimiento. El contador se refresca periódicamente; los avisos internos no envían SMS ni WhatsApp ni sustituyen los consentimientos externos. El endpoint protegido `/api/cron/notifications` aún requiere un scheduler para detectar vencimientos.
- Mobile-first de paciente y doctor: el shell ya reserva navegación inferior fija para cuatro destinos frecuentes, safe area y un panel “Más” para secciones secundarias; el paciente tiene un acceso directo a avisos en el header. En el directorio, la búsqueda permanece visible, filtros y mapa se abren en bottom sheets, las fichas entran con un desplazamiento sutil, se animan como máximo ocho elementos por lista y se respeta `prefers-reduced-motion`; los pins y controles de zoom tienen zona táctil de 44 px en teléfono. La semana de agenda se presenta apilada en móvil y conserva siete columnas en escritorio; filtros, acciones y opciones de menú usan objetivos táctiles grandes. El alta de cita abre como panel inferior en móvil con avance por pasos, zona de contenido desplazable, pie fijo sobre el safe area y selección de horarios de 44 px; reprogramar usa tres columnas de horarios en pantallas estrechas. El centro de avisos presenta acciones táctiles y listas con las mismas reglas de movimiento.
- Comunicación iniciada: el paciente puede activar/revocar consentimiento independiente por SMS/WhatsApp para citas y fechas límite de seguimiento. Las citas encolan avisos idempotentes a 24 h/2 h; las tareas encolan un aviso neutro hasta 24 h antes. Se respetan plantillas separadas, teléfono válido y horario 09:00–19:00 de la clínica; las bajas y cierres cancelan envíos pendientes. Sigue pendiente revisar/aplicar migraciones en staging, validar ambas plantillas/entregas en Sent sandbox y configurar el scheduler externo de `/api/cron/messages`.
- El dashboard principal ahora muestra ocupación de los próximos siete días frente al horario recurrente configurado y actividad de los últimos 30 días: citas programadas, cancelaciones, ausencias y cierre de seguimientos. Presenta minutos/denominadores, documenta que no incluye excepciones de horario y advierte que las transiciones previas al registro de auditoría no son reconstruibles; los errores de red ofrecen reintento.
- La agenda registra llegada e inicio real de consulta con eventos idempotentes. Iniciar requiere una llegada previa; el check-in sólo se registra el día local de la cita y cancela recordatorios pendientes. El dashboard calcula espera mediana/promedio únicamente con marcas completas y válidas, sin estimar las faltantes.
- Mapcn instalado y conectado al directorio; el perfil guarda ciudad, estado, dirección, enlace y coordenadas. Las ubicaciones de México aparecen como puntos sólo cuando tienen coordenadas válidas. La atribución de CARTO/OSM ahora se mantiene expandida y enlazada. Falta configurar/restringir la clave CARTO en Vercel y validar la carga real de teselas en producción.
- Pendiente mobile antes del piloto: revisar los recorridos completos de reserva, reprogramación, filtros de mapa, agenda semanal, edición de paciente y consulta clínica en teléfono real; confirmar que las tablas colapsen en tarjetas y que las acciones de agenda no dependan de hover. También faltan modo instalable/offline y notificaciones push; no son requisito para esta entrega de avisos internos.
- Los campos opcionales de ubicación ya se sincronizaron con la base de datos de producción mediante `pnpm db:push`.
