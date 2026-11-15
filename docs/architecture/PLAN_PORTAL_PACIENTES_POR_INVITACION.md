# Dopilot: reservas públicas y portal por invitación

Fecha: 14 de noviembre de 2026. Estado: propuesta detallada, no implementación.
Arquitectura: stack-web, T3 existente (Next.js App Router, TypeScript estricto, tRPC, Prisma y NextAuth).
Diseño: docs/design/shadcn-apple.md, incluida la actualización del sidebar según tema.

## 1. Decisión de producto

Dopilot tendrá dos recorridos conectados:

1. Cualquier visitante explora perfiles publicados y reserva. No necesita invitación y no obtiene por ello un portal clínico.
2. Un doctor invita al paciente. Después de verificar su identidad y aceptar, obtiene el espacio de ese doctor: recetas, documentos compartidos, citas, avisos y carga autorizada de estudios.

Una identidad puede tener cero, uno o varios espacios. Cuenta, relación de atención y permiso de portal son entidades distintas. PATIENT no es autorización clínica suficiente.

El profesional puede registrar atención antes de invitar; la invitación habilita al paciente a consultar y aportar información en el portal. Reservar no comparte antecedentes ni activa el portal.

El paciente puede explorar otros doctores públicamente. Dentro del espacio privado no se promocionan competidores. Un doctor no ve con quién más se atiende el paciente.

## 2. Arquitectura actual revisada

| Área | Base actual | Cambio necesario |
| --- | --- | --- |
| Identidad | User.email y Patient.userId únicos; roles DOCTOR/PATIENT/ADMIN | Identidad verificada y acceso clínico separados |
| Login | NextAuth Credentials, JWT y argon2 | Conservar contraseñas y añadir credencial de un solo uso |
| Registro | auth.register acepta DOCTOR/PATIENT | Alta de doctor; paciente entra por reserva o invitación, sin portal por autorregistro |
| Directorio | doctor.getAll público, máximo 100; UI protegida bajo /patient | /doctores público, publicación voluntaria y paginación de servidor |
| Reserva | /book-appointment/[doctorId]; creación exige sesión | Identificación mínima dentro del flujo y servicio común |
| Agenda | appointment-time.ts y transacciones Serializable/P2034 | Conservar invariantes, no otro motor de citas |
| Consultorio | ClinicPatient, ClinicMember y contexto de workspace | Conservar; añadir vínculo paciente-doctor explícito |
| Clínica | Scopes por consultorio/doctor, consentimiento y auditoría | Grant del portal y publicación por recurso |
| Invitaciones | ClinicInvitation de equipo y primitivas token/hash | Modelo de pacientes independiente |
| Shell | ProductShell/ProductShellView y selector de consultorio | Selector Mis doctores con contexto propio |

Fuentes locales: prisma/schema.prisma; src/server/auth/config.ts; src/server/api/trpc.ts y root.ts; routers auth, appointment, doctor, patients y workspace-invitations; dominios clinical/access, authorization/access-policy, appointments/appointment-time, workspaces/invitation-token; shell y módulo de reserva. Esto acredita estructura revisada, no operación en producción.

## 3. Estados y permisos

| Estado | Explorar/reservar | Gestionar citas propias | Clínica | Subir estudios |
| --- | --- | --- | --- | --- |
| Visitante | Sí, verificando contacto al reservar | Después de identificarse | No | No |
| Identidad verificada sin invitación aceptada | Sí | Sí | No | No |
| Invitación pendiente | Sí | Según identidad | No | No |
| Acceso activo | Sí | Sí | Solo espacios autorizados | Según capacidad |
| A suspendido y B activo | Sí | Según reglas | Solo B | Solo B |
| Acceso archivado | Sí | Según reglas | Lectura histórica, si se adopta esa política | No |

Capacidades propuestas: booking:create, booking:manageOwn, portal:read, portal:upload, portal:publish, invitation:manage, usage:read. Derivar en servidor; no añadir rol INVITED_PATIENT ni booleano global isInvited.

Suspender portal no cancela citas ni borra recetas. Archivar y suspender son decisiones distintas. La conservación y lectura histórica deben definirse antes del uso real.

## 4. Reserva pública

1. Landing → /doctores → perfil profesional → servicio/ubicación/fecha/hora.
2. Capturar nombre/correo y teléfono si se necesita contacto. No pedir estudios o antecedentes para reservar.
3. Verificar correo por enlace/código. Si la sesión ya acredita el mismo correo, no repetir innecesariamente.
4. Resolver identidad mínima y Patient; no crear grant de portal.
5. Revalidar disponibilidad, duración, precio y políticas desde servidor.
6. Persistir cita y mostrar estado real: solicitada o confirmada; ubicación, zona horaria y precio conocido.
7. /reservas permite ver/cancelar/reprogramar citas propias con sesión; no usa shell clínico ni permite cargar expediente.
8. Explicar: «Tu doctor puede invitarte para compartir recetas y documentos contigo».

La identidad de reserva no es registro libre de portal. Impide atribuir citas solo porque alguien escribió un correo ajeno.

MVP sin retención temporal de horas: verificar contacto no reserva la hora. Si cambia ocupación devolver 409 y conservar contacto para elegir otra. Un borrador no crea Appointment.

## 5. Invitación y acceso

### Doctor

- Acción Invitar al portal en lista y expediente del paciente.
- Confirmar correo, doctor y consultorio autorizados; no confiar en IDs del cliente.
- Mostrar recursos ya publicados. Invitar no publica todo el expediente.
- Estados: sin invitar, pendiente, vencida, activada y suspendida.
- Distinguir enlace creado/copiado de correo efectivamente enviado.
- Reenviar/regenerar invalida invitaciones pendientes anteriores del mismo vínculo.
- Revocar pendiente y suspender acceso aceptado son operaciones independientes.
- No revelar que el correo está con otros doctores.

### Paciente

- /invitaciones/paciente muestra doctor público y finalidad; no clínica.
- GET no consume token: evitar activación por escáneres de correo.
- Verificar correo destinatario. Sesión con otro correo exige cambiar de cuenta.
- POST explícito acepta, consume token y crea grant en transacción.
- Iniciar sesión mediante NextAuth; recargar documento autenticado para evitar redirects anónimos cacheados.
- Abrir el doctor invitante. Si acepta B después de A, aparecen ambos en Mis doctores, con expedientes separados.

Regreso: contraseña existente o nuevo enlace de autenticación. La invitación no es una llave permanente. Sin espacios activos, ir a /reservas; no bucle login/dashboard.

## 6. Identidad y compatibilidad

- Correo normalizado mediante trim/minúsculas; no quitar puntos o sufijos + de proveedores.
- Mismo correo verificado: una cuenta; unique y manejo transaccional P2002.
- Diferente correo: cuentas distintas. Unión posterior exige verificar ambos y reconciliar, fuera del MVP.
- No fusionar por nombre o teléfono.
- Otro doctor no sobrescribe contraseña, correo verificado o perfil global. Datos administrativos diferentes se guardan en ficha local de la relación.
- Mantener Patient.userId único y reutilizarlo en invitación B.
- Para altas profesionales antes de activar, conservar identidad de contacto no verificada y permitir User.password nullable. Sin hash y sin verificación no se autentica ni obtiene portal. No contraseñas compartidas ni conocidas por el doctor.
- Cuentas existentes conservan hash y acceso a reservas; no conceder portal a todos los PATIENT automáticamente.
- Fichas sin correo requieren una evolución que separe ficha clínica y cuenta. No inventar correos enviables.
- Correos familiares compartidos no identifican a varios dependientes; tutores fuera del MVP.
- Una cuenta DOCTOR/ADMIN invitada no cambia a PATIENT. Resolver explícitamente; doble perfil es otra evolución.

## 7. Propuesta Prisma

Solo propuesta: no modificar schema ni base al preparar el plan. Modelos nuevos con id cuid, createdAt/updatedAt, ambos lados de relaciones e índices.

| Modelo/cambio | Campos | Invariantes |
| --- | --- | --- |
| User | password nullable; conservar emailVerified | authorize rechaza null antes de verify; revisar todos los consumidores |
| DoctorPatientRelationship | clinicId, doctorId, patientId, source, status, ficha local opcional | unique triple; índices patientId/status y clinicId/doctorId/status |
| PatientPortalAccess | relationshipId, status, grantedAt/By, acceptedInvitationId, uploadEnabled, version | relationshipId único; estado consultado aunque JWT siga vigente |
| PatientPortalInvitation | relationshipId, emailNormalized, tokenHash, expiresAt, generation, acceptedAt/By, revokedAt, deliveryStatus | hash único; aceptación y entrega independientes |
| AuthenticationChallenge | purpose, emailNormalized, tokenHash, expiresAt, consumedAt, attempts, destino limitado | Separar BOOKING_EMAIL, SIGN_IN e INVITATION_EMAIL_PROOF |
| BookingIntent | doctor/servicio/ubicación, fecha/hora, contacto mínimo, identidad verificada, expiresAt, idempotencyKey | clave única; DRAFT/VERIFIED/CONFIRMED/EXPIRED; borrador sin Appointment |
| Doctor | directoryVisibility, acceptsPublicBookings | DRAFT/PUBLIC/UNLISTED; publicación distinta de habilitación de reserva |
| Recurso clínico | visibility, publishedAt/By, contexto cuando falte | INTERNAL/PATIENT_SHARED; no duplicar expediente para portal |
| ProductUsageEvent | eventId, eventName, occurredAt, clinicId/doctorId, sujeto seudonimizado, source, schemaVersion | idempotente y sin contenido clínico |

Relación ACTIVE/ARCHIVED y grant ACTIVE/SUSPENDED/ARCHIVED. ClinicPatient conserva pertenencia al consultorio; no implica permiso para todos sus doctores.

Invitación caduca por expiresAt; evitar status almacenado que contradiga sus fechas. No reutilizar ClinicInvitation del equipo, solo sus primitivas criptográficas.

PUBLIC aparece en búsquedas; UNLISTED admite enlace profesional directo elegido por doctor; DRAFT no aparece ni permite reserva pública. Despublicar no borra citas/accesos. No confundir perfil profesional accesible por enlace con privacidad de clínica.

## 8. Backend por capas

Página/componentes → cliente tRPC → router → servicio de dominio → Prisma.

Dominios bajo src/server/domain:
- patient-identity: normalización, resolución verificada y vínculos.
- patient-access: relaciones, grants, scopes y contexto.
- patient-invitations: crear, inspeccionar, aceptar, revocar y entregar.
- authentication: desafíos y credenciales de un solo uso.
- appointments: extraer servicio compartido del router existente, reutilizar appointment-time/lifecycle.
- discovery: publicación, búsqueda y DTO profesional.
- product-usage: eventos deduplicados y agregados.
- clinical: extender auditoría, archivos y consentimiento existentes.

Routers finos nuevos: discovery, booking, patient-invitations, patient-access, patient-portal y usage; adaptar auth/appointment y registrar en src/server/api/root.ts.

Servicios reciben db, clock, tokenFactory y delivery cuando mejora aislamiento/pruebas. No repositorios genéricos por tabla ni arquitectura paralela. Schemas de dominio junto al dominio; schemas de pantalla en _components. UI infiere RouterInputs/RouterOutputs.

## 9. Procedures y contratos

Toda procedure retorna exactamente result/error/status/message usando TrpcResponse y helpers existentes, con Zod y tipos estrictos. Capturar unknown; no any, supresiones ni stacks/SQL al cliente. Adaptar rechazos del middleware en los módulos nuevos al mismo contrato sin reformar globalmente tRPC.

| Procedure propuesta | Actor | Responsabilidad |
| --- | --- | --- |
| discovery.search/profile | Público | Perfiles publicados, DTO profesional, filtros/cursor/limit |
| booking.availability | Público | Horas libres, sin identidad de otros pacientes |
| booking.start | Público limitado | Intento y desafío; no enumerar cuentas |
| booking.verify | Prueba de desafío | Acreditar identidad, sin grant clínico |
| booking.confirm | Identidad verificada | Cita idempotente y agenda revalidada |
| booking.mine/manage | Sesión propia | Solo citas propias, proyección administrativa |
| patientInvitations.create/list/revoke | Profesional autorizado | Relaciones de su contexto |
| patientInvitations.inspect | Token válido | Validez/doctor público, sin expediente |
| patientInvitations.accept | Destinatario verificado | Consumo atómico y grant único |
| patientAccess.listMine/select | Sesión propia | Espacios propios y preferencia de contexto |
| patientAccess.suspend/archive | Profesional autorizado | Estado/auditoría, sin borrar atención |
| patientPortal.summary/records | Sesión + grant | Solo recursos publicados del espacio |
| patientPortal.prepareUpload/completeUpload | Sesión + grant/capacidad | Destino privado y archivo validado |
| patientPortal.publish | Profesional autor autorizado | Publicación específica y trazable |
| usage.doctorSummary | Doctor/gestor autorizado | Métricas propias y agregados permitidos |

Errores: EMAIL_VERIFICATION_REQUIRED 401, PORTAL_ACCESS_REQUIRED 403, INVITATION_INVALID 400, INVITATION_EXPIRED/REVOKED 410, ACCOUNT_MISMATCH 409, SLOT_UNAVAILABLE 409, RATE_LIMITED 429. Recurso clínico ajeno devuelve 404 sin revelar existencia.

patientId/doctorId/clinicId del cliente se validan contra sesión/relación; nunca aceptar verified=true, rol u ownership declarados en UI.

## 10. Agenda, transacciones y efectos

Servicio único para reserva pública y profesional:
1. Doctor publicable/reservable, servicio activo y ubicación de su contexto.
2. Patient verificado; duración/precio/política desde servidor.
3. Hora futura, agenda y solapamiento por duración, no solo coincidencia exacta.
4. Zona del consultorio; America/Mexico_City solo como compatibilidad explícita donde falte configuración.
5. Cita, relación administrativa y lifecycle en transacción Serializable.
6. P2034 con reintento acotado/revalidación; conflicto real 409.
7. IdempotencyKey estable: respuesta perdida o doble clic no crean segunda cita.
8. Efectos mediante outbox/eventos; sin proveedor externo dentro de transacción.
9. Reservar no crea grant ni consentimiento global.

BookingIntent vence y se limpia por tarea del sistema. No guardar síntomas, motivos clínicos o tokens en URL, analítica o almacenamiento de navegación.

## 11. Seguridad de enlace, correo y sesión

- Token aleatorio de 32 bytes; persistir solo hash. Propuesta configurable: invitación 72 h, autenticación 15 min.
- GET no modifica datos. Confirmación POST con controles CSRF/origen.
- Aceptación transaccional comprueba correo probado, vigencia, revocación/generación, consumo condicional y grant único.
- Dos pestañas no duplican grants; reintento no reactiva uno suspendido.
- Cambiar destinatario exige revocar y generar nueva invitación.
- No sobrescribir password/perfil de cuenta existente.
- Sin tokens en logs. Página de intercambio sin analítica/terceros, no-store y no-referrer; limpiar URL después.
- Retorno interno validado, sin open redirects.
- NextAuth mantiene Credentials y JWT: añadir credencial tipada de un solo uso con propósito/consumo. No fabricar cookies/JWT manualmente ni añadir adaptador email incompatible con estrategia actual.
- Aceptación y sesión usan handoff recuperable de corta duración. Si falla sesión tras aceptar, conservar grant y permitir nuevo acceso sin reciclar token consumido.
- SessionProvider recibe sesión del servidor; navegación autenticada no reutiliza redirects anónimos cacheados.
- Layout servidor resuelve capacidades; evitar múltiples guards cliente con decisiones opuestas.
- Rate limit IP/destino y respuestas genéricas frente a enumeración.

Coincidir el texto del correo no acredita propiedad. Un enlace copiado por doctor y enviado por chat tampoco prueba el buzón.

Cuenta existente: sesión del destinatario con correo probado. Cuenta nueva real: desafío entregado al correo mediante IdentityLinkDelivery y adaptador transaccional independiente de Sent.

Demo: datos ficticios y entrega manual explícita; no presentarla como verificación de un buzón real. Sin canal real, nuevas identidades reales permanecen pendientes, sin clínica.

## 12. Aislamiento clínico y caché

Cada lectura/carga combina sesión, Patient.userId propio, grant, relación, clinicId, doctor/episodio, visibilidad y consentimiento aplicable. Filtro en Prisma; no cargar todo y ocultar con React.

- Recetas solo emitidas/compartidas, no borradores; representar anulación/corrección.
- Notas internas no visibles por defecto. Invitar no publica todo el expediente.
- MedicalHistory global conserva consentimiento; invitación no abre historial de otro doctor.
- Archivo aportado por paciente: contexto, usuario y estado de revisión; no equivale a resultado validado.
- Almacenamiento privado, autorización por archivo y enlaces de descarga cortos o proxy. Sin URLs públicas permanentes.
- Validar MIME real, tamaño, extensión, destino y confirmación de subida. Subida completa no significa escaneo/revisión completados.
- Auditoría de publicar/retirar/descargar/subir/aceptar/suspender, sin copiar contenido clínico a logs.
- No heredar permiso clínico universal de ADMIN en módulos nuevos; revisar privilegios anteriores por separado.

Selector no autoriza. Usar accessId en rutas y query keys; cookie solo preferencia auxiliar. Así dos pestañas con doctores distintos no se pisan.

Al cambiar doctor: cancelar consultas/subidas pendientes, no keepPreviousData clínico entre contextos, limpiar información sensible y mostrar skeleton hasta respuesta correcta. Mutaciones conservan accessId de inicio y servidor lo revalida, incluido grant suspendido con JWT válido.

Cerrar portal no borra historia ni anula receta. Conservación, acceso histórico y derechos requieren política específica antes de operación real; este plan no determina cumplimiento legal.

## 13. UI y rutas

| Ruta | Función |
| --- | --- |
| / | Landing actual |
| /doctores | Directorio público |
| /doctor/[doctorId] | Perfil existente |
| /book-appointment/[doctorId] | Reserva existente adaptada |
| /reservas | Citas propias sin shell clínico |
| /invitaciones/paciente | Aceptación |
| /acceso/enlace | Verificación/intercambio |
| /patient/dashboard | Resolver capacidad hacia espacio válido o reservas |
| /patient/care/[accessId] | Inicio de espacio |
| Subrutas appointments/prescriptions/medication/records/studies/notifications | Datos del espacio |
| /dashboard/patients y ficha existente | Invitar, ver estado, publicar |
| Analítica del dashboard | Métricas propias, reutilizar vista equivalente si existe |

page.tsx delgado; loading/error cuando apliquen; _components local con view/form/schema/tipos/hooks exclusivos. No importar privados de otra ruta. Reutilizar componentes realmente compartidos: directorio, pickers y shell existentes.

Server Components para composición/sesión; Client Components mínimos para interacción. UI nunca usa Prisma.

Ejemplos:
- src/app/doctores/_components/directory-view.tsx.
- src/app/invitaciones/paciente/_components/invitation-acceptance-view.tsx.
- src/app/reservas/_components/booking-list.tsx.
- src/app/patient/care/[accessId]/_components/care-overview.tsx.
- src/components/shell/patient-care-switcher.tsx.
- EmailLinkForm compartido solo si tiene más de un consumidor real.

### Sidebar y navegación

Marca oficial; Mis doctores con nombre, especialidad y consultorio. Si solo hay uno, contexto fijo legible. Dos doctores del mismo consultorio son contextos distintos.

Principal: Inicio, Citas, Recetas, Medicación. Secundario: Expediente, Estudios, Avisos y Cuenta. Móvil: cuatro destinos y Más; selector accesible en sheet/combobox, safe area y foco.

Cabecera/breadcrumb identifican doctor activo. Sin grants: vista reducida de reservas. Suspensión A muestra mensaje y otros espacios; no expulsa de B. Sin promociones de otros profesionales dentro del espacio.

### Estados por pantalla

| Pantalla | Acción principal | Estados |
| --- | --- | --- |
| Directorio | Buscar/reservar | Carga, vacío, filtros, error, paginación |
| Reserva | Verificar/confirmar | Conflicto, código vencido, timeout, reenvío idempotente |
| Invitar | Crear/copiar/enviar | Pendiente, vencida, revocada, activada; entrega independiente |
| Aceptar | Verificar/aceptar | Cuenta distinta, enlace usado, sin sesión, en curso |
| Inicio | Cita y novedades | Sin actividad, error parcial, suspensión |
| Recetas | Consultar emitida | Vacío, anulada/corregida; nunca borrador |
| Expediente | Consultar compartido | Sin publicaciones, retirada, descarga fallida |
| Estudios | Subir/consultar | Progreso, MIME/tamaño inválido, reintento, revisión pendiente |

### Diseño obligatorio

shadcn/Radix, Geist, Lucide y tokens acromáticos existentes. Claro/oscuro completos con background/foreground/card/muted/border/ring; ninguna superficie grande invertida.

Liquid Glass selectivo en sidebar/selector/toolbar/popovers. Expediente, recetas y tablas sobre base estable. Reutilizar GlassSurface, Button, Card, Dialog, Sheet, DropdownMenu, DatePicker y TimeSlotPicker. TypeGPU original intacto; sin otra librería visual.

Espaciado 4/8/12/16/24/32; controles 44 px; foco, geometría y sidebar del contrato vigente. Safe area móvil. No datos clínicos en toast/URL/títulos de pestaña/avisos del sistema sin política. Confirmar guardado/envío solo tras resultado real; errores útiles junto al formulario.

## 14. Avisos de medicación y futura IA

MVP: recetas emitidas, archivos publicados, estudios privados y avisos internos. Sin Sent, Vapi ni IA en DEMO_MODE. Subir estudio no ejecuta análisis de IA.

Medicación, siguiente fase:
- MedicationReminderPreference por medicamento/relación: zona, canal, enabled y versión de pauta.
- Pauta estructurada y confirmada; no inferir intervalos de texto ambiguo.
- Scheduler durable e idempotencia; cambios/anulación cancelan programación vieja.
- Aviso al abrir app no garantiza alarma con app cerrada. Push/email requieren permisos, preferencias y canal real.
- “Tomada” es declaración del paciente y no modifica receta.

IA, fase futura:
- Módulo desacoplado, apagado por defecto y con límite/coste propios.
- Consentimiento específico; scope por estudio/relación/usuario; no reunir estudios de todos los doctores implícitamente.
- Jobs queued/processing/completed/failed, trazabilidad y límites.
- Identificar explicación generada y revisión profesional pendiente según corresponda.
- No emitir diagnósticos definitivos ni cambiar medicación automáticamente.
- Revisar tratamiento, retención y proveedores antes de habilitar; fuera de la demo.

## 15. Métricas y monetización

| Métrica | Definición |
| --- | --- |
| Perfil visto | Visita pública deduplicada con filtrado básico de robots |
| Reserva iniciada/confirmada | Intento válido/cita persistida, no cada clic |
| Invitación aceptada | Primera activación válida del vínculo |
| Paciente con portal activo | Grant activo aunque no haya entrado |
| Paciente activo mensual | Identidad con interacción autenticada válida en contexto durante el mes |
| Consulta realizada | Cita completada según servidor |
| Uso de documentos | Conteos mínimos sin contenido |

Recomendación inicial: cuota por consultorio + doctores incluidos + cupo de pacientes con portal activo. Medir MAU aparte antes de cobrar por tráfico. Si se adopta MAU, definirlo contractualmente y no mezclarlo con grants activos.

Cobro por consultorio deduplica patientId entre sus doctores; análisis por doctor mide vínculo individual. Invitaciones pendientes, robots, reintentos y demo no consumen pacientes facturables. Definir prorrateos, reactivaciones, zona/período antes de automatizar cobros.

Ningún doctor ve clientes/métricas de competidores. Admin de producto recibe agregados acotados, no clínica. Eventos sin nombres, correos, recetas, síntomas, tokens ni archivos. Source DIRECTORY/DOCTOR_LINK/INVITATION/PORTAL validado por servidor.

Exceso de cupo no elimina ni suspende silenciosamente historia del paciente; advertir o limitar nuevas activaciones según política explícita.

## 16. Compatibilidad y rollout

1. Inventariar APIs clínicas actuales de patients/users/clinical/appointments, archivos, recetas y avisos. Añadir permisos en todos los caminos, no solo nuevos.
2. Cambios aditivos de schema, defaults conservadores y datos preservados.
3. PATIENT existente no implica grant. Sus citas se conservan en /reservas.
4. Citas previas acreditan relación administrativa, no consentimiento ni grant automático.
5. Preparar activación explícita, auditable y ejecutada por propietario para relaciones previas acreditadas/demo.
6. /patient/doctors redirige a /doctores sin exigir portal.
7. /patient/dashboard resuelve capacidades y evita bucles.
8. Flags server-side propuestos: PUBLIC_BOOKING_ENABLED, PATIENT_PORTAL_INVITES_ENABLED y PORTAL_ENFORCEMENT_ENABLED.
9. Enforcement solo después de cerrar APIs legacy: UI protegida con API vieja abierta no es entrega válida.
10. Rollback detiene nuevas operaciones y conserva datos; nunca restaura clínica universal por PATIENT.

Reglas stack-web para implementación:
- Editar prisma/schema.prisma, no crear/editar/aplicar migraciones versionadas.
- Propietario revisa respaldo y ejecuta pnpm db:push.
- Agente solo usa pnpm prisma generate para tipos; no SQL, consultas de base, seed ni otros comandos Prisma.
- Scripts históricos de migración de package.json no cambian esta regla.
- Este plan no modifica schema ni ejecuta operaciones de base.

## 17. Fases de implementación y cierre

| Fase | Entregables | Criterio de cierre |
| --- | --- | --- |
| 0. Contratos | Matriz de permisos, DTO público/clínico, estados y mapa legacy | Cuenta/reserva no dan portal |
| 1. Identidad/permisos | Schema, servicios, auth nullable, scopes y grants | Identidad básica no consulta/sube clínica por API directa |
| 2. Público/reservas | Directorio, publicación, verificación, BookingIntent, servicio común y /reservas | Visitante reserva sin invitación; 409 e idempotencia correctos |
| 3. Invitaciones | UI doctor, entrega, aceptación atómica, NextAuth de un uso | Misma cuenta acepta A/B; correo incorrecto no activa |
| 4. Portal por doctor | Selector, resumen, recetas, expediente, estudios y publicación | A/B aislados incluso en pestañas, caché y descargas |
| 5. Métricas/demo | Eventos/agregados, conteos, guion y configuración | Demo completa con reserva y dos doctores sin Sent/IA |
| 6. Evolución | Medicación durable, tutores, unión de cuentas, doble perfil, facturación e IA | Módulos separados con canales/permisos propios |

Orden: no enviar invitaciones reales sin verificación y grants; no exponer portal antes de cerrar endpoints legacy. No fijar fechas sin estimar cambios y resolver entrega de correo.

## 18. Validación sin navegador automatizado

Respetar la indicación del propietario. Pruebas unitarias/de servicio con DB simulada y dependencias inyectadas:

- Correo normalizado, misma identidad entre doctores y correos distintos sin fusión.
- Registro público no puede pedir rol/flag de portal.
- Identidad básica denegada en todas las APIs clínicas.
- Scope combinado identidad/clinicId/doctor/grant/visibilidad/consentimiento.
- Tokens usados, vencidos, revocados, propósito distinto y generación vieja.
- Aceptación simultánea, cuenta equivocada y recuperación tras timeout.
- Reservas simultáneas, solapamiento por duración, zona e idempotencia.
- JWT vigente con acceso suspendido; rutas legacy incluidas.
- Archivo ajeno y descarga denegada.
- Error de transporte no confirma envío ni revierte cita persistida.
- Métricas sin duplicados y agregación por consultorio.
- Contrato result/error/status/message en nuevas procedures.

Entrega técnica: pnpm check y unitarias relevantes; build cuando el entorno permita. Reportar bloqueos, no declarar producción verificada solo por lint.

Guion manual del propietario:
1. Visitante encuentra doctor y reserva.
2. Identidad básica gestiona cita, no carga clínica.
3. Doctor A invita; paciente verifica y acepta.
4. Receta emitida aparece; borrador no.
5. B invita al mismo correo; aparece en selector.
6. Contextos separados en recetas, estudios, citas y avisos.
7. Suspender A no elimina B ni reservas.
8. Fallo/reintento no duplica cita ni grant.
9. Claro/oscuro, móvil, teclado y vacíos.

## 19. Decisiones iniciales y pendientes

Adoptado para el plan: reserva pública con identidad mínima; portal por invitación aceptada; una cuenta por correo probado; contextos paciente-doctor-consultorio; publicación explícita; métricas separadas de cobro; demo sin Sent/IA; sin operaciones DB ni navegador desde el agente.

Decisiones para cerrar antes de uso real:
1. Transporte transaccional de correo. Entrega manual de demo no acredita buzón.
2. Unidad de cobro: consultorio/doctores/grants o MAU, sin definiciones mezcladas.
3. Lectura histórica al archivar y política de suspensión/conservación.
4. Publicar receta al emitir mediante acción explícita visible; nunca borradores.
5. Política de reserva solicitada/confirmada por servicio/doctor, comunicada al visitante.
6. Fichas sin correo, tutores y cuentas con doble rol como evoluciones separadas.

Este plan es de producto e ingeniería; no certifica cumplimiento normativo, entrega externa, seguridad clínica completa ni operación en producción.
