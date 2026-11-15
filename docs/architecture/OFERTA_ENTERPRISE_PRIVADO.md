# Dopilot: oferta comercial y despliegue Enterprise Privado

Fecha: 14 de noviembre de 2026.
Estado: decisión de producto y plan técnico. La landing presenta una modalidad bajo proyecto; esto no implementa aislamiento, instalación local ni automatización nueva.
Fuentes de arquitectura: stack-web, docs/design/shadcn-apple.md y PLAN_PORTAL_PACIENTES_POR_INVITACION.md.

## 1. Oferta elegida

| Oferta pública | Base existente | Cliente | Modalidad |
| --- | --- | --- | --- |
| Pro | PRO | Médico independiente | SaaS compartido con separación por consultorio |
| Enterprise | ENTERPRISE | Clínica con equipo y ubicaciones | SaaS con alcance comercial acordado |
| Enterprise Privado | CUSTOM como base de propuesta; no activación automática | Clínica que necesita marca y entorno propios | Instancia dedicada en nube o infraestructura del cliente |

No introducir un cuarto enum de Prisma solo para marketing. La modalidad de despliegue y la licencia son ejes distintos. CUSTOM existente puede ser base del proyecto comercial; no significa que ya entregue white label, aislamiento físico u on-premise.

No se alteran precios, Stripe, suscripciones, datos ni permisos en este cambio de landing. Pro ya tiene un precio de dominio; no se redefine aquí. La web no promete prueba gratis ni precio sin validar. Enterprise/Privado se cotizan; no checkout automático.

La oferta separa: agenda operativa actual, módulos opcionales y desarrollos previstos. WhatsApp al doctor ante cita nueva está en preparación. Vapi actual consulta servicios/disponibilidad y enlace de reserva, no crea/edita/cancela citas. El CRUD completo con IA se declara ampliación prevista, no función activa.

Actualización técnica del 14 de noviembre: el complemento opcional de voz ya tiene CRUD y controles preparados en código, pendientes de esquema y configuración externa. Ver [VAPI_AGENDA_MULTIDOCTOR.md](./VAPI_AGENDA_MULTIDOCTOR.md). Las descripciones anteriores corresponden al estado al redactar la propuesta; no anuncian llamadas activas en producción.

## 2. Cómo cobrar sin regalar la operación

Modelo propuesto para Enterprise Privado:
1. Implementación inicial: levantamiento, parametrización, identidad, despliegue, importación acordada, capacitación y aceptación.
2. Licencia anual de uso por organización e instalación productiva autorizada; definir profesionales/sedes incluidos.
3. Mantenimiento y soporte recurrentes: actualizaciones, compatibilidad y respuesta dentro de horario/alcance acordados.
4. Infraestructura: coste separado según proveedor/servidores y responsable de operación.
5. Desarrollo adicional por alcance aprobado; no bolsa ilimitada implícita.
6. Consumo externo: WhatsApp, voz, correo e IA separados con límites, alertas y aprobación de excedentes.

No fijar importes Enterprise sin estimar infraestructura, profesionales, sedes, volumen, soporte y personalizaciones. Pro no debe absorber costes ilimitados de IA o mensajería.

Definir antes de cotizar: número de instancias, entornos de pruebas, profesionales activos, sedes, almacenamiento, usuarios concurrentes, horario de soporte y responsables. No prometer SLA, certificaciones o tiempos de restauración antes de tener capacidad demostrada.

La licencia es derecho de uso del producto, no entrega automática de propiedad del código ni desarrollo exclusivo. Condiciones definitivas se formalizan y revisan aparte; este documento no es un contrato.

## 3. Un solo producto, configuraciones distintas

No crear un fork por clínica. Mantener código común, versiones y módulos por capacidades. Personalizaciones específicas mediante configuración o adaptadores; acordar cuándo una extensión pertenece al núcleo.

Separar:
- Plan comercial: PRO/ENTERPRISE/CUSTOM actuales.
- DeploymentMode propuesto: CLOUD_SHARED, CLOUD_DEDICATED, ON_PREMISE.
- BrandConfiguration: nombre de producto/organización, logos, icono, textos de soporte, tokens permitidos y enlaces.
- PlatformPolicy: directorio público habilitado, alcance de descubrimiento, alta de profesionales, reservas y acceso por invitación.
- Entitlements: módulos contratados, límites y vigencia. Validación en servidor, no solo ocultar botones.

La marca vive en el contexto de despliegue para instalación privada; en SaaS compartido el branding por consultorio requerirá diseño específico. No confiar en un Host arbitrario del cliente para elegir tenant. Resolver dominio/configuración desde lista de despliegues confiables.

No modificar SVG oficiales para rebranding. Conservar assets Dopilot como default y adaptar src/components/brand con configuración validada y URLs/archivos permitidos. Mantener contraste claro/oscuro y accesibilidad, sin CSS arbitrario del cliente.

Sitio web comercial y dominio se manejan fuera del proyecto según instrucción del propietario. La identidad de la app, correos y páginas de acceso sí requiere configuración interna.

## 4. Qué debe aislar una instalación privada

Para CLOUD_DEDICATED y ON_PREMISE:
- Proceso de aplicación, base de datos y credenciales separados.
- Archivos clínicos y backups propios; rutas y claves exclusivas.
- Cache/Redis, colas, cron y claves de cifrado/sesión separados.
- Proveedores externos y sus cuentas/configuraciones identificados por instalación.
- Enlaces, webhooks, correo y callbacks de autenticación con URLs propias.
- Logs/analítica separados y acceso de soporte explícito.
- Ningún directorio global ni vínculo automático a cuentas del SaaS público.
- Actualizaciones comunes compatibles y respaldos antes de cambios de esquema.

Una base compartida con clinicId NO se comercializa como instancia o base dedicada. Ocultar logos tampoco implementa aislamiento.

En la instalación privada, buscar doctores lista solo los del despliegue autorizado. Mis doctores funciona dentro de esa instancia. El mismo correo en Dopilot público y en una clínica privada no fusiona identidades ni expedientes. Federación futura exige un proyecto y consentimiento propios.

No enviar métricas identificables o clínicas de una instalación privada a la plataforma central. Telemetría opcional documentada y mínima; licenciamiento no depende de exportar pacientes.

## 5. Trabajo técnico para on-premise

La app actual tiene dependencias de servicios alojados; cambiar un dominio no la convierte en on-premise:
- PostgreSQL: parametrizar y documentar conexión y compatibilidad.
- Vercel Blob clínico/perfil: adaptar almacenamiento mediante contrato, por ejemplo S3 compatible o servicio privado acordado; revisar autorización de subida/descarga.
- Redis/rate limit: permitir implementación de infraestructura del cliente sin perder controles.
- Cron/outbox: scheduler y workers fuera de Vercel, con bloqueo/idempotencia.
- Fuentes: empaquetar fuentes para no depender de descarga en build si el entorno está restringido.
- Analytics: desactivable por política de instalación; sin trackers por defecto en entornos privados.
- WhatsApp/voz/IA: conectividad externa, credenciales y límites por cliente. No prometer funcionamiento offline de esos módulos.
- Correo: transporte de enlaces de identidad propio y URLs confiables.
- Build/despliegue: imagen de aplicación reproducible, health/readiness, TLS y reverse proxy según infraestructura.
- Operación: backup, restauración ensayada, recuperación, logs sanitizados, actualizaciones y validación de compatibilidad.

No asumir que Docker garantiza seguridad o aislamiento por sí solo. La evaluación de infraestructura es condición de aceptación del proyecto privado.

Licenciamiento offline: si se requiere, diseñar licencia firmada con capacidades/expiración y período de gracia, validada en servidor; no llamar a un servidor central con información clínica. Vencimiento no borra datos ni inutiliza exportación/histórico por sorpresa. Política específica a acordar.

## 6. WhatsApp y secretaria de agenda

WhatsApp al doctor:
- Evento NEW_APPOINTMENT después de persistir cita.
- Destino: número verificado del doctor/configuración de recepción; no confundir con recordatorios al paciente ya existentes.
- Consentimiento/preferencias, plantilla, idempotencia y outbox.
- Payload mínimo: cita nueva, fecha/hora y enlace autenticado; sin diagnóstico, nombre completo o expediente en mensaje.
- Reprogramación/cancelación como eventos posteriores.
- Reintentos acotados, estados de proveedor y fallo visible; no marcar entregado por simple encolado.
- Configuración por instalación, cupos y consumo. Desactivado en demo.

IA de agenda:
- Módulo opt-in con permisos por doctor/contexto; no acceso general a pacientes.
- Herramientas tipadas para listar, crear, reprogramar y cancelar usando los mismos servicios de dominio que la UI.
- Verificar identidad antes de exponer citas existentes o modificarlas.
- Revalidar disponibilidad; confirmación explícita para cambios sensibles.
- Idempotencia, auditoría de quién/canal/resultado y opción de atención humana.
- Nunca ejecutar instrucciones arbitrarias, cambiar diagnósticos o emitir recetas.
- Presupuesto y canal definidos; límites y alertas.
- Actual código Vapi de lectura no se declara CRUD completo hasta implementar/verificar estas herramientas.

## 7. Portal del paciente

Mantener el plan previo: exploración/reserva pública independiente de activación clínica por invitación. Recetas/estudios por contexto del doctor; no toda la historia publicada automáticamente.

La landing marca portal por invitación como en desarrollo hasta que grants, aceptación, verificación y aislamiento estén implementados. IA para estudios y avisos durables de medicación permanecen fuera de esta entrega.

## 8. Fases y cierre

1. Comercial: landing con propuesta clara y contacto real; sin planes cobrados nuevos ni promesas falsas.
2. Política/configuración: DeploymentMode, BrandConfiguration y capacidades de servidor; no alterar esquema sin revisión.
3. Aislamiento: aplicación/DB/archivos/colas/secretos dedicados; probar ausencia de cruces.
4. Portabilidad: almacenamiento, cron, correo/rate limit, build y telemetría.
5. Primera instalación privada piloto: infraestructura acordada, datos ficticios y guion de aceptación.
6. Operación: backups/restauración, actualización, soporte, documentación y exportación.
7. Automatización: WhatsApp al doctor y CRUD de IA implementados como módulos separados.

Entrega comercial no equivale a disponibilidad del despliegue privado. No activar vía Stripe/flag hasta cumplir fases técnicas y aceptación.

No se ejecutan DB ni pruebas de navegador desde el agente. Cambios futuros de datos solo en schema.prisma; propietario ejecuta pnpm db:push según stack-web. Validación actual: tipos, lint y formato; futura: unitarias significativas de permisos/eventos/licencias/adaptadores e integración en entorno autorizado.

## 9. Referencia de mercado

Se consultó documentación oficial de Cal.com como referencia comercial, no como requisito tecnológico ni comparación de capacidades: https://site.cal.com/faq y https://cal.com/enterprise.
La separación entre marca, oferta empresarial, despliegue comercial privado y soporte por propuesta respalda evaluar esos alcances por separado. Las decisiones y precios de Dopilot son propios; no se copian tarifas ni afirmaciones de certificación.

