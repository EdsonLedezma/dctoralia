# Plan de implementación integral de Dctoralia

Fecha de diagnóstico: 16 de septiembre de 2026

## Estado de implementación

La primera iteración ejecutable ya cubre el núcleo de la Entrega 1, el shell autenticado prioritario y la primera capa visual de la Entrega 3:

- Citas, servicios y horarios validan ownership por sesión, contratos serializables y conflictos por duración.
- Las reservas y notificaciones se escriben en transacciones; los servicios se desactivan para conservar historial.
- La landing, servicios y horarios usan tokens inspirados en Vercel; Motion queda en listas, shell y transición del golden path, y GSAP en el hero de marketing.
- El shell autenticado ya unifica navegación de doctor/paciente en desktop y móvil; el golden path de reserva valida servicio, duración, disponibilidad y estados de confirmación.
- La agenda diaria del doctor usa el mismo shell, elimina `any` en su adaptación de datos y muestra estados de carga de ruta para doctor y paciente.
- Las notificaciones del doctor ahora están aisladas por ownership, devuelven el contrato tRPC uniforme y exponen estados de carga, error y vacío listos para automatizaciones de Sent.
- El shell autenticado adopta una navegación oscura compacta inspirada en Vercel: espacio de trabajo, búsqueda, grupos de navegación, ayuda y cuenta persistente para doctores y pacientes.
- Las vistas operativas ya no repiten títulos de módulo ni descripciones de página; las acciones viven en una fila contextual y se eliminaron las tarjetas de acciones rápidas.
- Los KPIs dejaron de ocupar tarjetas aisladas en dashboard, citas, pacientes, agenda y perfil. Los datos relevantes permanecen en contexto (conteo de agenda o línea sutil de perfil) para priorizar el trabajo clínico.
- Los flujos autenticados secundarios (perfil, historial, directorio, reserva y formularios de alta) ahora usan el mismo shell; se retiraron sus headers locales para evitar doble marca y títulos repetidos.
- El dashboard de paciente usa tipos inferidos de `RouterOutputs` para transformar citas sin `any`; las nuevas vistas conservan estados de carga, vacío y navegación contextual.
- El directorio, la reserva y las reseñas de doctores también consumen tipos inferidos del router; el historial médico tipa su payload de actualización y sus citas completadas.
- El perfil de paciente valida su payload médico contra `RouterInputs`, elimina assertions `any` y refetcha de forma explícita después de guardar.
- Los perfiles de paciente y doctor siguen ahora una composición Vercel más plana: identidad arriba, metadatos inline y secciones con hairlines; se eliminaron KPIs flotantes, pestañas estadísticas y descripciones redundantes.
- Las listas de agenda, servicios y reseñas usan `MotionList` con entradas breves y respetan `prefers-reduced-motion`; los estados vacíos son silenciosos y accionables sin tarjetas decorativas.
- El directorio de doctores usa una toolbar de filtros compacta, sin card pesada ni acción avanzada sin comportamiento; muestra el conteo de resultados y permite limpiar filtros sólo cuando existen.
- El perfil público del doctor ya comparte el lenguaje del shell: servicios, reseñas, horarios y contacto se muestran en listas con hairlines, CTA de reserva funcional y estados de carga/error/vacío.
- El flujo público de reserva dejó de depender de `/doctor/1` y el filtro de especialidades interpreta correctamente la opción “Todas”.
- Se agregó `/patient/appointments/[id]` para que “Ver detalles” tenga una ruta real, con autorización a través de `appointments.getById`, estados de carga/error y acciones contextuales.
- El dashboard del paciente y la agenda de citas ahora usan listas compactas con `MotionList`, filtros sutiles, estados de carga/error/vacío y acciones contextuales sin cards KPI redundantes.
- Historial médico conserva sus cinco contextos clínicos, pero adopta tabs horizontales compactos y superficies sin sombras para reducir el peso visual sin perder edición ni exportación.
- El sidebar ahora tiene command menu global con `⌘K/Ctrl+K`, búsqueda filtrable, navegación por teclado y acceso equivalente en móvil.
- Servicios del doctor usa un encabezado contextual compacto y superficies sin sombras, manteniendo creación, edición, activación y desactivación.
- Horarios, nueva cita y alta de paciente adoptan la misma composición: encabezado contextual, tarjetas planas con hairlines y formularios responsivos sin descripciones redundantes; las acciones de pacientes enlazan a destinos reales.
- Notificaciones y reseñas eliminan fondos saturados y descripciones repetidas: ahora usan superficies neutras, acentos semánticos mínimos, listas Motion y controles más compactos.
- La agenda diaria del doctor elimina el encabezado redundante de "Horarios del Día" y el bloque azul de cada cita; el historial médico elimina descripciones repetidas en cada pestaña y mantiene sólo la información clínica accionable.
- El flujo público de reserva comparte tokens de Dopilot: progreso con hairlines, tarjetas sin sombras, estados neutrales y formularios responsive sin descripciones repetidas.
- La revisión mobile a 390px eliminó overflow horizontal en el directorio y la reserva; el shell añade safe area, viewport dinámico, navegación táctil desplazable, targets de 44px y evita zoom de inputs en iOS/Android.
- La consulta de perfil en la reserva pública sólo se ejecuta con sesión autenticada y sin retries innecesarios, evitando ruido de errores UNAUTHORIZED en clientes anónimos.
- La siguiente vertical prioritaria es separar las páginas grandes en componentes de ruta y cerrar la deuda de lint sin relajar los guardrails del build.

## 1. Resultado objetivo

Dctoralia debe convertirse en un SaaS multi-consultorio con tres cualidades visibles:

1. Una experiencia de producto sobria, rápida y precisa, inspirada en el lenguaje visual de Vercel descrito en `docs/design/vercel-DESIGN.md`.
2. Los recorridos esenciales de un marketplace médico: descubrir profesionales, evaluar perfiles, consultar disponibilidad, reservar, reagendar, cancelar y dejar reseñas.
3. Una ventaja propia basada en automatizaciones operativas y de comunicación con Sent, dejando una frontera segura para incorporar agentes de voz con Vapi más adelante.

La meta no es copiar literalmente la interfaz o marca de Vercel. Se reutilizan sus principios de jerarquía, contraste, tipografía, densidad, precisión y movimiento para construir una identidad médica propia.

## 2. Diagnóstico actual

### Base técnica que sí se conserva

- Next.js 15.2 con App Router, React 19, TypeScript estricto, tRPC 11, Prisma 6 y pnpm.
- Tailwind CSS 4 y shadcn/ui ya inicializado correctamente con `new-york`, Radix, RSC y Lucide.
- Componentes base shadcn existentes: alert, avatar, badge, button, card, checkbox, dialog, input, label, radio-group, select, sonner, tabs y textarea.
- Flujos internos ya disponibles en tRPC para citas, horarios, servicios, pacientes, notificaciones y reseñas.
- Dependencias `motion`, `gsap` y `@gsap/react` declaradas; ya hay movimiento cancelable en listas, shell, reserva y marketing.
- El typecheck actual pasa.

### Deuda que bloquea una evolución segura

- 600 errores y 48 warnings de ESLint distribuidos en 17 archivos.
- Uso extendido de `any`, errores sin normalizar y contratos de respuesta inferidos de forma inconsistente.
- La mayoría de las páginas son Client Components completos. Esto aumenta JavaScript, mezcla datos con presentación y dificulta estados de carga y error.
- Páginas de entre 250 y 635 líneas sin límites de módulo `_components`.
- La autorización de varias mutations está basada en IDs recibidos del cliente y no siempre verifica tenant, rol y ownership antes de escribir.
- Algunos routers devuelven instancias de `Error`, detalles internos o datos más amplios de lo necesario.
- El modelo actual representa doctores y pacientes, pero no una clínica/consultorio multiusuario, membresías, ubicaciones ni permisos por tenant.
- `next.config.js` ignora errores de TypeScript y ESLint durante el build.
- Sólo había una prueba unitaria, ligada al prototipo de Vapi eliminado.
- El README continúa siendo el placeholder de Create T3 App.
- La interfaz usa gradientes azules, colores Tailwind ad hoc y layouts independientes; todavía no aplica el `design.md` como sistema.
- La marca visible de la aplicación ya está normalizada a `Dctoralia`; quedan revisiones de copy y dominio antes de publicar.

### Limpieza ejecutada en este diagnóstico

- Eliminadas seis rutas públicas bajo `/api/vapi`.
- Eliminadas la documentación y la prueba específicas del prototipo.
- Eliminado el parser de fechas usado exclusivamente por esas rutas.
- Eliminado el segundo singleton de Prisma; la aplicación conserva `src/server/db.ts` como único cliente.

La lógica válida no se perdió: crear, reagendar y cancelar citas, además de calcular slots disponibles, sigue existiendo en los routers tRPC. Lo retirado era una capa paralela sin autenticación, sin esquemas de entrada y con efectos peligrosos como crear contraseñas y servicios implícitamente.

## 3. Principios de implementación

1. Seguridad y ownership antes de exposición pública.
2. Servicios de dominio compartidos; tRPC, Sent y Vapi sólo son adaptadores.
3. Server Components por defecto; Client Components únicamente en las hojas interactivas.
4. Una ruta entrega una composición delgada y mantiene sus detalles privados en `_components`.
5. El sistema visual se expresa con tokens y componentes, no con valores arbitrarios repetidos.
6. Movimiento con propósito, breve y cancelable; nunca debe bloquear una tarea clínica.
7. Cada entrega es una vertical funcional pequeña y verificable, no una reescritura masiva.
8. Datos sensibles, consentimientos, mensajes y automatizaciones deben ser auditables.

## 4. Arquitectura objetivo

```text
Página / Server Component
        |
        v
Componente cliente pequeño -> cliente tRPC
                                |
                                v
                        router + autorización
                                |
                                v
                         servicio de dominio
                         /        |        \
                    Prisma    Outbox     Proveedores
                                          |     |
                                         Sent  Vapi (futuro)
```

Estructura recomendada:

```text
src/
  app/
    (marketing)/
      page.tsx
      _components/
    (auth)/
      login/
      register/
    (doctor)/
      dashboard/
        layout.tsx
        page.tsx
        _components/
        appointments/
        patients/
        services/
        schedule/
        automations/
        settings/
    (patient)/
      patient/
        layout.tsx
        dashboard/
        appointments/
        profile/
    doctor/[slug]/
      page.tsx
      _components/
  components/
    ui/                 # shadcn y extensiones de primitives
    shell/              # sidebar, header, mobile nav, command menu
    shared/             # sólo componentes realmente compartidos
  server/
    api/routers/
    domain/
      appointments/
      availability/
      clinics/
      messaging/
      automations/
    integrations/
      sent/
      vapi/             # se crea sólo al iniciar esa fase
    policies/           # rol, tenant y ownership
```

Los route groups permiten mejorar la estructura sin cambiar URLs públicas existentes de inmediato.

## 5. Sistema visual inspirado en Vercel

`docs/design/vercel-DESIGN.md` será la fuente visual principal. La base generada por shadcn se adapta a ese contrato; no se ejecutará nuevamente `shadcn init`.

### Tokens principales

| Propósito           | Valor base | Uso                                         |
| ------------------- | ---------: | ------------------------------------------- |
| Ink / CTA principal |  `#171717` | Acción primaria y texto de máxima jerarquía |
| Canvas              |  `#ffffff` | Tarjetas, diálogos y superficies elevadas   |
| Canvas soft         |  `#fafafa` | Fondo general                               |
| Canvas inset        |  `#f5f5f5` | Filtros, agrupadores y estados suaves       |
| Texto secundario    |  `#4d4d4d` | Descripciones y metadatos                   |
| Texto muted         |  `#888888` | Placeholders y datos de baja jerarquía      |
| Hairline            |  `#ebebeb` | Bordes y divisores                          |
| Link                |  `#0070f3` | Navegación textual e información accionable |
| Radio de control    |      `6px` | Botones, inputs, menús                      |
| Radio de tarjeta    |      `8px` | Tarjetas y tablas                           |
| Radio elevado       |     `12px` | Diálogos y paneles grandes                  |

### Reglas de composición

- Geist Sans 400/500/600 para producto; Geist Mono para IDs, horas, métricas y etiquetas técnicas.
- Light mode como experiencia clínica principal. El dark mode se incorpora sólo cuando todos los estados alcancen contraste AA.
- El negro es la acción primaria. Los colores semánticos se reservan para estados clínicos, alertas y entrega de mensajes.
- El gradiente azul/cian/violeta/rosa/ámbar del documento se usa a escala atmosférica en marketing, nunca como decoración repetida dentro del dashboard.
- Densidad compacta en agenda, pacientes y tablas; densidad espaciosa en marketing y onboarding.
- Sombras apiladas sutiles más hairline; se eliminan sombras pesadas y glassmorphism generalizado.
- Marketing puede usar CTA pill. El producto mantiene controles de 6px; no se mezclan ambas escalas en la misma superficie.

### Componentes shadcn por incorporar gradualmente

- Shell: `sidebar`, `sheet`, `separator`, `scroll-area`, `tooltip`, `breadcrumb`.
- Datos: `table`, `dropdown-menu`, `pagination`, `skeleton`.
- Flujos: `calendar`, `popover`, `command`, `alert-dialog`, `form`.
- Feedback: `progress`, `empty`, `spinner` o equivalentes compuestos sobre primitives existentes.

Se agregan por cada vertical con `pnpm dlx shadcn@latest add ...`; no se instala todo el catálogo ni se sobrescriben componentes sin revisar el diff.

## 6. Lenguaje de movimiento

Motion y GSAP no deben resolver el mismo problema.

| Superficie                      | Herramienta                                   | Patrón                                             | Duración objetivo |
| ------------------------------- | --------------------------------------------- | -------------------------------------------------- | ----------------: |
| Hover, press, toggle, selección | CSS o Motion                                  | opacidad, escala 0.98-1, desplazamiento máximo 2px |         120-180ms |
| Dialog, Sheet, Popover          | primitives + Motion cuando aporte continuidad | entrada corta, salida 20-30% más rápida            |         180-260ms |
| Listas de citas/pacientes       | Motion                                        | stagger máximo de 6-8 elementos, layout transition |         220-360ms |
| Cambio de estado de cita        | Motion                                        | badge/layout compartido, feedback inmediato        |         180-240ms |
| Hero y secciones de marketing   | GSAP                                          | reveal por sección y una secuencia controlada      |         300-600ms |
| Scroll storytelling             | GSAP ScrollTrigger                            | sólo una sección destacada, sin bloquear scroll    |   según recorrido |

Reglas obligatorias:

- Animar sólo `transform` y `opacity` siempre que sea posible.
- Respetar `prefers-reduced-motion` y ofrecer el contenido visible sin JavaScript.
- No retrasar navegación, submit, confirmación, cancelación ni información crítica.
- No usar animación decorativa en tablas densas o durante cada refetch.
- Encapsular Motion en componentes cliente pequeños.
- Para GSAP en React, añadir `@gsap/react`, usar `useGSAP` con scope y cleanup, y cargar ScrollTrigger sólo donde se necesite.
- Probar en 375, 768, 1024 y 1440px, además de un móvil de gama media.

## 7. Plan por entregas

### Entrega 0 — Baseline y retiro de Vapi inseguro

Estado: ejecutada parcialmente en este diagnóstico.

- Retirar endpoints, documentación, parser y cliente Prisma duplicado de Vapi.
- Confirmar que no quedan imports o rutas `/api/vapi`.
- Mantener las dependencias de Motion y GSAP ya agregadas por el propietario del repositorio.
- Registrar baseline de typecheck, lint, formato y pruebas.

Criterio de salida: el build no depende del código retirado y los flujos internos permanecen tipados.

### Entrega 1 — Confianza, permisos y contratos

- Crear `TrpcResponse<TResult, TError>` común y normalizar todos los routers a `result`, `error`, `status`, `message`.
- Convertir errores externos a códigos serializables; nunca retornar `Error`, stack, SQL o datos internos.
- Crear policies reutilizables para `requireRole`, `requireClinicMembership`, `requireDoctorOwnership` y `requirePatientAccess`.
- Corregir citas: un paciente sólo actúa sobre sus citas y un doctor sólo sobre las de su clínica/agenda.
- Corregir servicios y horarios: ignorar `doctorId` arbitrarios para mutations del doctor autenticado.
- Restringir listados globales de pacientes, doctores, notificaciones y citas por tenant y rol.
- Mover reglas de disponibilidad, conflictos, reprogramación y cancelación a servicios de dominio transaccionales.
- Eliminar creación automática de servicios por defecto desde la reserva.
- Eliminar `any`, assertions amplias y promesas flotantes comenzando por el vertical de citas.
- Añadir pruebas de autorización y casos límite antes de hacer públicas las nuevas pantallas.

Criterio de salida: cero escrituras cross-tenant/cross-user en pruebas y ningún error interno serializado al cliente.

### Entrega 2 — Modelo SaaS de consultorio

- Diseñar `Clinic`, `ClinicLocation`, `ClinicMember` y roles internos: owner, admin, doctor, receptionist.
- Relacionar agenda, servicios, citas, pacientes y automatizaciones con `clinicId`.
- Definir zona horaria por clínica y ubicación; almacenar instantes de forma inequívoca.
- Añadir slugs públicos, estado de publicación y perfil verificable para doctor/clínica.
- Definir índices para búsquedas por clínica, doctor, paciente, fecha, estado y disponibilidad.
- Preparar estrategia de backfill desde el modelo actual de doctor individual.

Esta fase sólo debe editar `prisma/schema.prisma` y código. El agente no ejecutará migraciones ni comandos de base de datos; el propietario deberá revisar y ejecutar `pnpm db:push` cuando se le indique.

Criterio de salida: un usuario puede pertenecer a una clínica y todas las operaciones tienen frontera de tenant explícita.

### Entrega 3 — Design system y shells

- Traducir el `design.md` a tokens OKLCH/CSS con nombres semánticos en `globals.css`.
- Corregir la configuración de Geist/Geist Mono, `lang="es-MX"`, metadata, selección, focus rings y `antialiased`.
- Crear variantes de Button y Card para producto y marketing sin colores ad hoc.
- Construir shell de doctor: sidebar compacta, header, búsqueda/command menu, notificaciones, selector de clínica y nav móvil.
- Construir shell de paciente: navegación simple, próxima cita visible y CTA de reserva.
- Mover autorización inicial a layouts de servidor; evitar flashes y redirects sólo en `useEffect`.
- Añadir estados estándar `loading`, `empty`, `error` y `forbidden`.
- Convertir la primera pantalla de dashboard en golden path visual y accesible.

Criterio de salida: 100% de las superficies base usan tokens y primitives; navegación completa por teclado y sin scroll horizontal.

### Entrega 4 — Experiencia tipo Doctoralia para pacientes

- Directorio público con búsqueda real por especialidad, ubicación, modalidad, precio y disponibilidad.
- URLs indexables y metadata por doctor, clínica y especialidad.
- Perfil público con identidad, experiencia, servicios, ubicaciones, reseñas verificadas y siguiente disponibilidad.
- Flujo de reserva en pasos: servicio -> ubicación/modalidad -> fecha/hora -> datos -> revisión -> confirmación.
- Slots calculados por duración del servicio, zona horaria, horario, excepciones y solapamientos.
- Área del paciente con próximas citas, historial, reprogramación, cancelación y reseña post-consulta.
- Estados de error recuperables y preservación de datos si falla una operación.
- Responsive específico: filtros en Sheet, fechas táctiles de 44px y tablas convertidas a tarjetas cuando aplique.

Criterio de salida: un paciente puede descubrir, comparar y reservar sin datos mock ni campos vacíos de ubicación/precio.

### Entrega 5 — Operación diaria del consultorio

- Dashboard orientado a acciones: agenda de hoy, confirmaciones pendientes, huecos, pacientes por atender y alertas.
- Vistas de agenda día/semana con filtros, cambio de estado y reprogramación segura.
- CRM de pacientes con búsqueda, resumen, citas y acceso controlado al historial.
- Gestión de servicios, horarios, excepciones, ubicaciones y miembros de clínica.
- Notificaciones y centro de actividad con lectura, filtros y trazabilidad.
- Configuración organizada por tabs: clínica, equipo, agenda, comunicaciones, seguridad y facturación futura.
- Bulk actions sólo donde reduzcan trabajo sin elevar el riesgo clínico.

Criterio de salida: las cinco tareas frecuentes del consultorio se completan sin volver a la landing ni navegar por pantallas duplicadas.

### Entrega 6 — Automatizaciones con Sent

Sent se integra detrás de un puerto propio, no directamente desde componentes o routers.

```text
Evento de dominio
  -> Outbox transaccional
  -> Dispatcher con idempotency key
  -> Sent adapter (SMS / WhatsApp / RCS)
  -> Webhook firmado
  -> Inbox deduplicado
  -> Estado de entrega + siguiente automatización
```

- Crear interfaz `MessagingProvider` y adaptador `SentMessagingProvider`.
- Usar el API v3 y el SDK TypeScript sólo dentro de `server/integrations/sent`.
- Añadir outbox/inbox, reintentos con backoff, idempotencia y dead-letter visible.
- Verificar HMAC sobre el body crudo del webhook antes de parsear o mutar.
- Persistir mensaje, canal, template, estado, intentos, timestamps y correlación con cita.
- Incorporar consentimiento, opt-out, quiet hours, plantillas y redacción de PII en logs.
- Empezar con cinco recetas: confirmación al reservar, recordatorio 24h, recordatorio corto, recuperación de cancelación/no-show y solicitud de reseña.
- Soportar respuestas entrantes para confirmar, cancelar o solicitar reprogramación mediante comandos explícitos y auditables.
- Usar sandbox antes de habilitar envíos reales y observar delivered/read/failed/filtered/blocked.

Criterio de salida: ningún mensaje duplicado bajo retry, toda entrega es trazable y una caída del proveedor no rompe la creación de una cita.

### Entrega 7 — Vapi futuro, reconstruido sobre dominio seguro

No se restaurarán endpoints CRUD separados por acción. La integración futura tendrá una única frontera autenticada para `tool-calls` y eventos.

- Un endpoint de integración valida primero credenciales Bearer u HMAC configuradas en Vapi.
- Validar el envelope y cada tool con Zod; rechazar argumentos inesperados.
- Mapear número/assistant/tenant desde configuración del servidor, no confiar en IDs dictados por el modelo o la persona que llama.
- Los tools llaman a los mismos servicios de dominio usados por tRPC: buscar disponibilidad, crear una reserva pendiente, confirmar, reagendar o cancelar.
- Las acciones destructivas o con costo requieren lectura de resumen y confirmación explícita del usuario.
- No crear automáticamente usuarios con contraseñas temporales, servicios médicos o relaciones de clínica.
- Aplicar idempotencia por `callId + toolCallId`, auditoría, límites de tasa, timeout y redacción de transcripciones.
- Guardar sólo los artefactos autorizados por la política de privacidad aplicable.

Criterio de salida: Vapi no tiene acceso directo a Prisma y repetir un tool-call nunca duplica una cita.

### Entrega 8 — Calidad, observabilidad y lanzamiento

- Alcanzar cero errores de lint, cero `any` y formato limpio.
- Retirar `ignoreBuildErrors` e `ignoreDuringBuilds` cuando el repositorio esté limpio.
- Pruebas unitarias de dominio, integración de routers/policies y E2E de los recorridos críticos.
- Tests de contratos para Sent y Vapi con fixtures firmados y retries duplicados.
- Auditoría de accesibilidad: teclado, foco, labels, lectores, contraste y reduced motion.
- Visual regression de landing, shell, agenda, reserva, perfil y estados vacíos/error.
- Presupuestos web: CLS menor a 0.1, LCP menor a 2.5s e INP menor a 200ms en superficies públicas objetivo.
- Observabilidad sin PII: errores por flujo, latencia, tasa de reserva, no-show, entrega de mensajes y fallos de automatización.
- Rollout con feature flags para el nuevo shell, automatizaciones y cualquier integración externa.

Criterio de salida: `typecheck`, lint, format, tests y build pasan en CI; no hay regresiones críticas en móvil ni desktop.

## 8. Orden recomendado de verticales

```text
Seguridad + contratos ─┐
                      ├─> Design system + shells
Modelo de clínica ────┘              |
                                     v
                             Agenda y reserva
                                     |
                    ┌────────────────┴───────────────┐
                    v                                v
             Operación doctor                Experiencia paciente
                    └────────────────┬───────────────┘
                                     v
                              Automatizaciones Sent
                                     |
                                     v
                                  Vapi futuro
```

La primera vertical completa debe ser “reservar y confirmar una cita”. Obliga a resolver permisos, disponibilidad, UI, estados, notificación y pruebas sobre una sola historia de negocio, y crea el patrón para el resto.

## 9. Definition of Done por entrega

- Página delgada y detalles en `_components`.
- Server Component por defecto; justificación visible para cada `use client`.
- Sin `any`, `@ts-ignore`, errores crudos ni IDs de tenant confiados al cliente.
- tRPC devuelve exclusivamente el contrato común.
- Loading, empty, success, error y retry diseñados.
- Teclado, lector de pantalla, touch y reduced motion verificados.
- Mobile, tablet, desktop y wide revisados.
- Pruebas del happy path, autorización y error de dominio.
- Lint, typecheck, format y pruebas relevantes en verde.
- Documentación del módulo y decisión de arquitectura actualizadas.

## 10. Próxima entrega concreta

La siguiente implementación debe limitarse a dos PRs pequeños:

1. **PR de confianza:** contrato tRPC común, policies de appointments/services/schedule, errores seguros y tests de ownership.
2. **PR de golden path visual:** tokens del `design.md`, tipografía, primitives shadcn faltantes, shell de doctor y refactor de `/dashboard` a Server Component con componentes privados.

Después se implementa la reserva end-to-end y recién entonces se inicia Sent. De esta forma la automatización se conecta a reglas de negocio estables en lugar de amplificar la deuda actual.
