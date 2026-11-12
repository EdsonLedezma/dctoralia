# Dctoralia · shadcn + Apple

Contrato de diseño vigente · 29 de octubre de 2026 · Revisión 4: descubrimiento, perfil profesional y reserva con cristal neutro.

## 1. Dirección

Una herramienta clínica silenciosa, precisa y humana. Blanco, negro y grises neutros; tipografía legible; navegación estable; una siguiente acción evidente. La sofisticación viene de las proporciones, la respuesta al tacto y la profundidad del material.

Base: componentes shadcn/Radix existentes, Tailwind 4, Geist y Lucide. Liquid Glass se interpreta para la web con CSS/SVG y WebGPU; no es una implementación oficial de Apple. Se conserva el sidebar y sus destinos, mejorando agrupación, material, selección, accesibilidad y proporciones.

Este archivo reemplaza `vercel-DESIGN.md`, `MASTER.md`, `PLAN_UX_PRODUCTO_CLINICO.md` y `PLAN_IMPLEMENTACION.md` como dirección de diseño. Las decisiones de datos, permisos e integraciones siguen en sus documentos de dominio y en el código. No regenerar otro Master ni instalar otro sistema visual.

## 2. Fuentes consultadas y qué tomamos

| Fuente | Aplicación en Dctoralia |
| --- | --- |
| [Apple: Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | Liquid Glass como capa funcional de navegación y controles; material regular para legibilidad; uso selectivo. |
| [Apple: Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/liquid-glass) | Jerarquía, continuidad entre dispositivos, posiciones predecibles y contenido como protagonista. |
| [@developer-hub/liquid-glass](https://www.npmjs.com/package/@developer-hub/liquid-glass) | `GlassCard` como capa óptica decorativa, encapsulada detrás del DOM semántico. Se corrigen su sombra y texto blanco predeterminados. |
| [vgpu: TypeGPU Liquid Glass](https://vgpu.sh/examples/typegpu-liquid-glass) | Referencia real de refracción: campo SDF, gradientes, desenfoque y composición multipaso. Original descargado y verificado en `typegpu-liquid-glass/`. |
| [vgpu: Liquid Layout](https://vgpu.sh/examples/liquid-layout) | Separación entre controles DOM y óptica GPU, continuidad espacial y limpieza de recursos. El reordenamiento y la fusión de tarjetas quedan como referencia, no como obligación de UX clínica. |
| [TypeGPU: Build Plugin](https://docs.swmansion.com/TypeGPU/tooling/unplugin-typegpu/) | Transformación de funciones `use gpu` y sus referencias antes de generar WGSL. |

Las páginas de vgpu publican también versiones `.md` y `source.md`, consultadas para revisar el código completo. La documentación incluida con la versión instalada de vgpu prevalece para las APIs.

## 3. Principios que gobiernan cada pantalla

1. El usuario reconoce dónde está, qué necesita atención y qué puede hacer en los primeros segundos.
2. El contenido clínico vive sobre superficies sólidas; los controles pueden flotar sobre él.
3. Una acción primaria por contexto. Los demás controles tienen peso menor. En claro, la prioridad se expresa con una burbuja luminosa, tipografía y elevación; no con un bloque negro.
4. Una misma función conserva nombre, icono, posición y comportamiento.
5. La interfaz responde inmediatamente al presionar; guardar depende de la respuesta real del servidor.
6. El estado siempre se expresa con texto y, cuando ayuda, un icono. El color no es el único canal.
7. La GPU es una mejora progresiva: navegación, lectura y reserva funcionan sin ella.

## 4. Paleta y tokens

La UI usa una escala acromática. Se eliminan tintes verdes, cian, fondos crema y gradientes de color decorativos. Fotografías, mapas y archivos del paciente conservan sus colores originales. Los errores se comunican mediante etiqueta, icono y mensaje; una excepción cromática futura requiere una decisión explícita.

| Token semántico | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `background` | `#f7f7f8` | `#101012` | Lienzo |
| `foreground` | `#18181b` | `#fafafa` | Lectura principal |
| `card` / `popover` | `#ffffff` | `#1c1c1f` | Contenido y paneles |
| `primary` | `#18181b` | `#fafafa` | Tinta y énfasis; no prescribe el relleno del botón |
| `primary-foreground` | `#ffffff` | `#18181b` | Contraparte de tinta para superficies sólidas excepcionales |
| `secondary` / `accent` | `#f0f0f2` | `#29292d` | Selección y hover |
| `muted` | `#f4f4f5` | `#242427` | Agrupación secundaria |
| `muted-foreground` | `#606068` | `#b5b5bd` | Texto secundario |
| `border` / `input` | `#dedee3` | `#414147` | Separación y controles |
| `ring` | `#18181b` | `#fafafa` | Foco visible |
| `destructive` | `#27272a` | `#e4e4e7` | Estado peligroso con etiqueta e icono |
| `sidebar` | `#18181b` | `#141416` | Navegación estructural oscura |
| `sidebar-foreground` | `#eeeeef` | `#eeeeef` | Texto sobre sidebar |

Usar `bg-background`, `text-foreground`, `border-border`, etc. Los valores directos se permiten en la definición del material y en los originales de terceros. No corregir colores con filtros globales ni convertir fotografías a grises.

## 5. Tres materiales, con responsabilidades distintas

| Material | Apariencia | Dónde |
| --- | --- | --- |
| Papel | Sólido, blanco, borde neutro, sombra mínima | Agenda, expediente, formularios, tablas y notas |
| Glass regular | Fondo claro 82–94%, blur 20–28 px, borde interior luminoso, sombra corta | Navegación móvil flotante, toolbar contextual, popover breve |
| Graphite glass | Fondo oscuro 90–96%, blur 24 px, borde blanco 8–12%, texto claro | Sidebar y selector de consultorio |

El fondo del glass siempre existe sin soporte de `backdrop-filter`. Aumentar opacidad cuando haya texto detrás. En blanco y negro, la sensación de cristal se crea con borde, luminosidad, refracción sutil y separación espacial; no con manchas de color.

Evitar capas independientes de blur apiladas. En un segmented control, la pista y la burbuja seleccionada forman un solo control óptico: el thumb puede tener luz y volumen propios sin duplicar el filtro de fondo. No aplicar refracción a texto, tablas, notas o medicación. No colocar un canvas sobre los controles capturando sus eventos. No hacer transparentes las filas de una agenda para demostrar el efecto.

Las cards también deben participar del acabado: perímetro suave iluminado, esquinas continuas y sombra corta. El interior que contiene información clínica mantiene una base estable y legible. La alternativa a una card plana no es distorsionar su texto.

`GlassSurface` mantiene sus hijos semánticos fuera de los filtros SVG del paquete. El efecto es decorativo, `aria-hidden`, sin captura de puntero y cargado de forma diferida. La presentación sólida se mantiene durante la carga.

## 6. Tipografía, espacio y geometría

- Geist Sans para interfaz; Geist Mono sólo para identificadores técnicos. Horas y métricas usan números tabulares.
- Título de página: 28–32 px, peso 600, tracking −0.035 em, interlineado 1.15.
- Título de sección: 16–18 px, peso 600. Cuerpo: 14–16 px, interlineado 1.5.
- Metadatos: 12–13 px; ninguna instrucción esencial depende de un texto de 10–11 px.
- Evitar etiquetas técnicas en mayúsculas sobre cada bloque. El contexto útil ocupa su lugar.
- Escala de espacio: 4, 8, 12, 16, 24, 32, 48 px. Página: 16 px móvil, 32 px escritorio.
- Contenido máximo: 1280 px, ampliable para agenda semanal. Formularios de lectura: 640–720 px.
- Radios: 10–12 px campos, 16–24 px cards/paneles y 20–28 px superficies flotantes; píldora en botones burbuja, triggers de fecha, segmentos breves y navegación móvil.
- Objetivos táctiles: 44 × 44 px como mínimo; una etiqueta visual pequeña puede tener una zona táctil mayor.
- Los controles conservan su tamaño al cargar. Los skeletons representan la estructura final.

## 7. Sidebar: evolución del existente

Conservar expansión/colapso, selector de consultorio, búsqueda, navegación por rol, notificaciones y cuenta.

- Ancho expandido objetivo 232–248 px; colapsado 72 px. El ajuste no cambia los destinos ni el estado de trabajo.
- Fondo graphite neutral, borde interior tenue y márgenes consistentes. Un solo acento de selección, acromático.
- Marca compacta y control de colapso arriba. Selector de consultorio con nombre y contexto legibles.
- Grupo principal: Resumen, Agenda, Pacientes, Seguimiento. Grupo secundario: Consultorio, Servicios, Horarios y Notificaciones. Cuenta al pie.
- Reemplazar el texto `Workspace` por `Consultorio`; evitar términos de infraestructura en producto.
- Selección con fondo claro translúcido, mayor peso de texto y `aria-current`. Hover más tenue que selección.
- Iconos Lucide de 18–20 px y trazo consistente. Modo colapsado con nombre accesible y tooltip.
- Búsqueda con `Ctrl K` en Windows/Linux y `⌘ K` en macOS. Si sólo busca secciones, decir “Buscar sección”.
- Ningún botón visible queda sin acción. Si ayuda aún no existe, usar un enlace útil o retirar el botón.
- El sidebar permanece disponible mientras se recorre contenido largo; su navegación puede desplazarse internamente.

En móvil: hasta cuatro destinos frecuentes y “Más”. Barra flotante con safe area, etiquetas visibles, foco y espacio reservado debajo del contenido. La reserva conserva su acción principal cerca del pulgar.

## 8. Componentes shadcn

| Componente | Contrato |
| --- | --- |
| Button | Burbuja clara translúcida con texto oscuro en tema claro; burbuja grafito con texto claro en oscuro. La acción primaria gana luz, contorno y peso. Secundario más discreto; ghost para acciones terciarias. Presión inmediata y foco visible. |
| Card | Perímetro de material con luz interior, borde tenue y volumen contenido. Base de lectura estable para datos clínicos. Sólo las tarjetas accionables cambian al hover. |
| Input / Textarea | Etiqueta persistente, fondo sólido, error asociado al campo, ayuda breve; 16 px en móvil para evitar zoom involuntario. |
| Select / Combobox | Búsqueda cuando la lista lo requiere, selección clara, estado vacío útil y teclado completo. |
| Tabs / Segmented control | Pista de vidrio y thumb elevado translúcido, siguiendo la referencia clara del usuario. Sustituir la selección negra del prototipo. Usar roles y navegación del primitive. |
| Dialog / Sheet | Primitives Radix para foco, Escape y retorno al disparador. Contenido sólido, glass sólo en chrome breve. Pie de acciones visible en móvil. |
| Dropdown / Popover | Material regular suficientemente opaco, acciones con etiqueta, separación de peligrosas, sin brillo continuo. |
| Table / List | Cabecera discreta, filas alineadas, separadores suaves y acciones accesibles sin hover. En móvil priorizar los campos esenciales. |
| Badge | Etiqueta explícita y opcionalmente icono; grises con diferencias de borde/peso para distinguir estados. |
| Toast | Confirmar el resultado real, no repetir mensajes innecesarios; la explicación de un error de formulario permanece junto al campo. |
| Empty / Error | Explicar qué ocurre y ofrecer una acción concreta. Error con reintento y conservación de datos introducidos. |

Construir sobre los componentes existentes. No reinstalar shadcn ni reemplazar Radix con elementos genéricos para conseguir el material.

## 9. Composición por recorrido

### Resumen del médico

Cabecera compacta con fecha, consultorio y “Nueva cita”. Debajo: agenda de hoy como bloque dominante, pendientes por confirmar y seguimientos por vencer. Ocupación y análisis mensual quedan después de la operación inmediata. Evitar diez métricas antes de la primera cita.

### Agenda

Una toolbar para fecha, Hoy y Día/Semana; filtros en una segunda línea sólo cuando aporten contexto. Citas con hora, paciente, servicio, duración y estado. Día vacío sigue vacío. Acciones de llegada, inicio, expediente, reprogramar y cancelar visibles según contexto y permisos.

### Reserva y reprogramación

Tres pasos: paciente/servicio, fecha/hora y confirmación. Resumen persistente sin duplicación. Disponibilidad validada al guardar; un conflicto conserva lo introducido y permite elegir otra hora. Precio y duración claros antes de confirmar. Móvil con footer fijo y contenido desplazable.

### Expediente

Identidad y alertas relevantes primero, después contexto de consulta y cronología. Notas, medicamentos, alergias, observaciones y documentos sobre papel. Diferenciar borrador, firmado, enmienda y anulado con texto. Nunca refractar contenido clínico ni ocultar la procedencia o fecha de una medición.

### Paciente y directorio

Próxima consulta como prioridad, con fecha, hora, profesional y acción útil. Después recetas compartidas e historial. Directorio con búsqueda persistente, filtros recuperables, lista/mapa sincronizados y reserva con el servicio/horario seleccionado. Mostrar datos de demostración sólo en la vista explícita de diseño.

### Marketing

Promesa breve, demostración creíble del producto y una acción principal. WebGPU puede demostrar el material en una escena aislada. Conservar legibilidad, atribución del ejemplo y alternativa sólida. El logo TypeGPU pertenece a la demostración, no reemplaza la identidad de Dctoralia.

## 10. Movimiento

- Press: escala 0.98 o cambio de luminosidad, 100–140 ms; el feedback comienza al presionar.
- Hover/foco: color y borde, 120–160 ms.
- Popover/dialog: 160–220 ms, salida algo más rápida, origen coherente con el disparador.
- Colapso de sidebar: spring sin rebote, interrumpible, sin bloquear enlaces.
- Listas: animar únicamente nuevas entradas o cambios relevantes; máximo seis elementos y desplazamiento de 4–8 px.
- El render GPU preserva la refracción del ejemplo; no desencadena re-renders React por frame.
- La animación no retrasa navegación, validación, lectura de estados ni acciones clínicas.

Motion resuelve continuidad de la interfaz. CSS resuelve estados simples. vgpu resuelve la óptica de la demostración. GSAP existente puede seguir en marketing cuando aporte un propósito; no añadir otra biblioteca de animación.

## 11. Integración WebGPU

Versiones de partida: `vgpu 0.6.0`, `@vgpu/wgsl 0.6.0`, `typegpu 0.12.9`, `unplugin-typegpu 0.12.7` y `@developer-hub/liquid-glass 1.2.3`. Consultar `package.json` y `pnpm-lock.yaml` para la resolución efectiva.

El ejemplo usa WebGPU, no WebGL. Se conserva el original completo en `typegpu-liquid-glass/index.tsx` y `renderer.ts`, con manifiesto y hashes en `vgpu-example.json`. La adaptación de aplicación se mantiene aparte en `src/components/liquid-glass/`.

En Windows, el `examples pull` de vgpu 0.6.0 devuelve `VGPU-EXAMPLES-FILESYSTEM`: “Safe destination storage is unsupported on win32”. La descarga realizada usa `examples show` para verificar el manifiesto oficial, descarga cada URL de esa revisión y compara bytes y SHA-256 antes de aceptarla. No se alteraron los originales ni el paquete instalado.

- Cargar el renderer sólo en cliente y cuando su superficie sea visible. El resto de la aplicación no importa TypeGPU.
- Mantener las funciones TypeGPU y el flujo SDF → gradiente → blur horizontal/vertical → composición.
- Apariencia acromática sólo en el canvas de demostración; no filtrar el contenido DOM ni medios clínicos.
- Suscribir resize para conservar proporción y nitidez. Limitar DPR a 2 como el ejemplo.
- Capturar rechazo de inicialización, errores GPU y pérdida del dispositivo. Mostrar alternativa CSS sin romper acciones.
- Al salir de pantalla, ocultar pestaña o desmontar: detener loop, desconectar observers/listeners y liberar GPU, surface y targets. Desmontar durante `init()` también debe liberar el dispositivo cuando termine.
- Con movimiento reducido, transparencia reducida o contraste aumentado: usar la composición estática opaca; ninguna dependencia funcional de la animación.
- No renderizar ni capturar expedientes, nombres o información clínica en una textura.

El MCP remoto se registra globalmente para Codex en `https://vgpu.sh/api/mcp`; la skill `vercel-labs/vgpu` queda instalada en el proyecto. Su disponibilidad en una sesión nueva no sustituye las APIs documentadas de la versión local.

## 12. Accesibilidad y comportamiento responsive

Contraste objetivo: texto normal 4.5:1, texto grande y límites de controles 3:1. Medir el estado final sobre los fondos reales, especialmente el glass. El fondo sólido es la referencia para comprobar la alternativa.

Respetar `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast: more` y `forced-colors`. Mantener foco visible, orden de tabulación, nombres accesibles y retorno de foco. Una capa decorativa tiene `pointer-events: none` y no entra en el árbol accesible.

Probar 375/390, 768, 1024 y 1440 px, además de zoom 200%. Los formularios conservan scroll interno cuando el teclado reduce el viewport. Ninguna acción depende sólo de hover, drag o color. Los efectos no pueden provocar scroll horizontal ni tapar el contenido detrás de la barra móvil.

## 13. Entrega inicial y continuidad

Esta entrega consolida las guías, prepara dependencias/skill/MCP, integra el renderer verificado en una vista de diseño y establece una primera base compartida acromática para shell y componentes. La vista `/design-system` permite revisar materiales e interacción sin iniciar sesión ni consultar datos clínicos.

La migración de todas las pantallas se realiza por recorridos: resumen → agenda → reserva → expediente → paciente/directorio. Los estilos locales heredados que sigan presentes son deuda de migración; no constituyen variantes de este contrato. Una guía nueva no equivale a declarar terminado el rediseño completo.

## 14. Criterios de aceptación

- [ ] La pantalla tiene una prioridad operativa y una acción principal claras.
- [ ] Paleta acromática y tokens compartidos; ninguna nueva paleta local.
- [ ] Glass limitado a navegación/controles, lectura clínica sobre papel.
- [ ] Botones reales, labels visibles, foco, teclado y targets táctiles comprobados.
- [ ] Loading, vacío, error, éxito y conflicto de disponibilidad revisados.
- [ ] Sin GPU y con preferencias de accesibilidad, la experiencia conserva contenido y acciones.
- [ ] El renderer presenta píxeles reales y libera recursos al desmontar.
- [ ] Sin errores nuevos de consola, tipos o lint.
- [ ] Capturas de escritorio y móvil verificadas; registrar cualquier limitación de dispositivo.

No dar por terminado un recorrido sólo porque compila. Registrar qué se probó y qué queda pendiente.

## 15. Verificación de la integración inicial

- `pnpm build`: compilación de producción completada, incluida `/design-system`.
- `pnpm test`: 74 pruebas existentes aprobadas.
- `pnpm test:design`: cuatro pruebas de navegador aprobadas: render real y liberación del dispositivo al reducir movimiento o salir de pantalla; formulario y foco sin WebGPU; móvil de 390 px; diálogo oscuro y alto contraste.
- `vgpu doctor`: adaptador D3D12 saludable, render y lectura real de un target de 16 × 16 px.
- Las pruebas WebGPU usan Chromium completo con aceleración habilitada explícitamente para el proceso de pruebas. En esta máquina se obtuvo el adaptador Intel; no se cambiaron preferencias del navegador del usuario.
- Capturas verificadas en `test-results/`: escritorio, móvil, escena GPU y oscuro. La carpeta es local y está excluida de Git.
- Los dos archivos originales conservan sus SHA-256 publicados.

Queda pendiente validar todos los recorridos clínicos autenticados, el sidebar con datos reales y un teléfono físico. Las pruebas de la vista de diseño no sustituyen esa validación de producto. Estos resultados corresponden a la integración inicial; no acreditan la implementación del plan siguiente.

## 16. Referencias visuales del usuario: criterio de aceptación

Se conservan las cinco capturas en `docs/design/references/` para que el plan no dependa de archivos temporales. Son referencias visuales suministradas por el usuario, no documentación de APIs ni instrucciones de terceros.

| Referencia | Qué conservar | Adaptación al producto |
| --- | --- | --- |
| [Calendario oscuro](references/glass-calendar-dark.png) | Trigger píldora; popover con radio amplio, volumen, borde luminoso y navegación de mes discreta; selección circular. | Español de México, días no disponibles distintos de días fuera del mes, lectura y teclado claros. Selección acromática; el azul de la captura no cambia la paleta acordada. |
| [Segmented claro](references/glass-segmented-light.png) | Pista translúcida, thumb elevado con luz interior y separación delicada; sensación de lente. | Aplicar a Día/Semana, filtros de periodo, tabs compactos y apariencia. La selección no se convierte en rectángulo negro. |
| [Sidebar oscuro](references/glass-sidebar-dark.png) | Panel grafito con margen, radio grande, reflejo perimetral y selección plateada translúcida. | Mantener destinos, colapso, roles, cuenta y consultorio; dar más espacio y presencia al estado activo sin añadir colores. |
| [Selector claro](references/glass-theme-switch-light.png) | Burbuja de control ligera, contorno exterior e interior y halo contenido. | Claro/Oscuro/Sistema con etiquetas accesibles. Los colores azul y amarillo no se incorporan por defecto; se toma la geometría y el material. |
| [Prototipo actual por corregir](references/current-toolbar-to-replace.png) | El usuario señala la barra de periodo y sus botones. | Quitar el thumb negro, reducir el gris pesado de la pista y construir selección de burbuja. Esta imagen documenta el problema, no el resultado objetivo. |

La landing debe seguir la misma familia. Sus CTA “Crear cuenta”, “Comenzar gratis” y las acciones del cierre usan burbuja clara, no el `bg-primary` negro heredado. La prominencia se consigue con tamaño, luz de borde, separación y texto, manteniendo una sola acción dominante.

## 17. Material contextual y comportamiento de los controles

### Matriz de fondo, opacidad y blur

El blur no garantiza contraste por sí solo. Primero asegurar una base luminosa estable, luego ajustar desenfoque y perímetro. Estos valores son puntos de partida para la implementación; deben medirse sobre capturas reales antes de aprobarse.

| Contexto detrás del control | Material claro inicial | Blur inicial | Tratamiento |
| --- | --- | --- | --- |
| Fondo liso blanco/gris | Base blanca 65–82% | 8–14 px | La burbuja se reconoce por reflejo superior, borde doble y sombra suave; no inventar ruido detrás. |
| Contenido, texto o filas en scroll | Base blanca 88–96% | 20–28 px | Proteger lectura del control y atenuar las formas del fondo; activar borde de scroll sólo cuando haya solapamiento. |
| Imagen, mapa o escena GPU | Base blanca 90–97% | 24–32 px | Luminancia estable, contorno definido y sombra de separación; probar fondos claros, oscuros y contrastados. |
| Tema oscuro | Grafito 80–94%; 94–98% sobre contenido denso | 18–28 px | Reflejo blanco tenue, texto claro, hover menor que la selección. No invertir toda la página con filtros. |
| Transparencia reducida / contraste aumentado | Superficie opaca | 0 px | Misma geometría, foco y selección; el estado no depende de la refracción. |

El contexto será explícito en una API compartida, por ejemplo `backdrop="plain|content|media"`, junto a intención y tema. El nombre final se decide al implementar. Los componentes no hacen capturas del DOM ni muestrean píxeles de datos clínicos para decidir el contraste. Cuando la toolbar pase de fondo liso a solaparse con contenido, usar un estado de scroll compartido y eventos discretos; no recalcular filtros continuamente por movimiento del puntero.

### Especificación de interacción

- Botones: normal, hover, pressed, foco, loading y disabled. Loading conserva ancho y nombre accesible; disabled baja el énfasis sin desaparecer. El brillo acompaña el press; no hay destellos ni animaciones infinitas.
- Segmentados: thumb con geometría consistente, transición interrumpible entre posiciones y respuesta de teclado. Día/Semana y Claro/Oscuro/Sistema no son CTAs de relleno sólido. Si son tabs, conservar semántica tablist; si seleccionan una preferencia, usar un grupo de selección apropiado.
- DatePicker: trigger de fecha con icono y etiqueta; calendario con mes/año, anterior/siguiente, hoy, seleccionado, fuera de mes, deshabilitado y sin disponibilidad. No bloquear el acceso al año/mes para fechas de nacimiento. Permitir entrada de fecha validada mediante teclado; no limitar todo al clic en una celda.
- TimeSlotPicker: agrupar mañana/tarde/noche y expresar cada hora como burbuja seleccionable. El seleccionado gana un aro y volumen, no fondo negro. Mostrar duración/zona cuando corresponda y explicar la ausencia de horarios.
- Cards: distinguir informativa, accionable, seleccionable y contenedora de formulario. La selección de servicio/doctor tiene texto o marca adicional; no volver clicable una card sólo por su material.
- Popovers, menú y select: conservar Radix, anclaje, escape, retorno de foco, teclado y portales con el tema correcto. La lista abierta usa material más opaco que su trigger.
- Calendario móvil: siete columnas dentro del viewport, zonas táctiles cómodas y sin scroll horizontal. Cuando no quepa un popover, abrir sheet con el mismo calendario y la misma selección.
- Apariencia: Claro, Oscuro y Sistema persistentes en un proveedor global. La selección del prototipo actual es local y no equivale a un sistema de temas de toda la app. Evitar salto de tema al hidratar.

## 18. Inventario completo de rutas existentes

Inventario obtenido de `src/app/**/page.tsx`: **27 rutas, de las cuales 26 presentan interfaz y una redirige**. Los IDs siguientes permiten cerrar el plan sin omitir páginas pequeñas. Todas están pendientes de la migración de esta revisión, incluida la vista de diseño.

### Sitio, acceso y laboratorio: 6 rutas

| ID | Ruta / archivo | Vistas y estados que se deben migrar | Resultado esperado | Ola |
| --- | --- | --- | --- | --- |
| R01 | `/` · `src/app/page.tsx` | Header, hero, CTA, features, sección de automatización, cierre, footer, escena GPU. | Botones burbuja claros; material contextual en header/CTA; jerarquía y escena equilibradas. | 2 |
| R02 | `/login` · `src/app/login/page.tsx` | Formulario, mostrar contraseña, credenciales incorrectas, envío, retorno al destino autorizado. | Card con acabado de material, campos sólidos y acción burbuja; errores junto al formulario. | 2 |
| R03 | `/register` · `src/app/register/page.tsx` | Selector Doctor/Paciente, ambos formularios, validación por campo, registro en curso, error y éxito. | Segmentado de lente y anatomía de formulario compartida; no perder datos al corregir errores. | 2 |
| R04 | `/doctor/[id]` · `src/app/doctor/[id]/page.tsx` | Identidad, servicios, precios, reseñas, horario/contacto, carga y perfil no disponible. | Perfil público legible con reserva visible y cards seleccionables consistentes. | 3 |
| R05 | `/book-appointment/[doctorId]` · `src/app/book-appointment/[doctorId]/page.tsx` | Pasos actuales Consulta, Disponibilidad y captura previa; resumen, autenticación requerida, envío, conflicto y solicitud enviada. | DatePicker/horas/servicios unificados; revisar “Tu brief” por lenguaje comprensible; conservar parámetros de servicio/fecha/hora. | 3 |
| R06 | `/design-system` · `src/app/design-system/_components/design-preview.tsx` | Claro/oscuro, toolbar, formulario demo, cards y escena GPU. | Referencia comprobable de botones, pickers y sidebar en ambos temas y tres tipos de fondo. | 1 |

### Área del médico: 12 rutas

| ID | Ruta / archivo | Vistas y estados que se deben migrar | Resultado esperado | Ola |
| --- | --- | --- | --- | --- |
| R07 | `/dashboard` · `src/app/dashboard/page.tsx` | Saludo/fecha, indicadores, actividad, agenda de hoy, seguimientos, próximas citas y accesos. | Agenda y pendientes primero; métricas históricas después; cero tarjetas verdes/negras heredadas sin contrato. | 4 |
| R08 | `/dashboard/appointments` · `src/app/dashboard/appointments/page.tsx` | Día, semana, navegación de fecha, filtros, cita, llegada/inicio, confirmación/completado, reagendar y cancelar. | Toolbars y segmentado glass, selección de fecha/horario común, acciones accesibles en touch. | 4 |
| R09 | `/dashboard/appointments/new` · `src/app/dashboard/appointments/new/page.tsx` | Diálogo/escritorio y sheet/móvil; paciente/servicio/ubicación, fecha/hora, datos y confirmación; falta de configuración y conflicto. | Un wizard claro; footer fijo y resumen; mismo material de selección en cada paso. | 4 |
| R10 | `/dashboard/patients` · `src/app/dashboard/patients/page.tsx` | Directorio, búsqueda, fila/card, sin pacientes y sin coincidencias. | Lista de trabajo limpia y alta de paciente visible; estado de búsqueda conservado. | 4 |
| R11 | `/dashboard/patients/new` · `src/app/dashboard/patients/new/page.tsx` | Información personal, nacimiento, emergencia, datos médicos, seguro, guardar y errores. | Agrupar por tarea, DatePicker apto para nacimiento y acciones consistentes. | 4 |
| R12 | `/dashboard/patients/[patientId]` · `src/app/dashboard/patients/[patientId]/page.tsx` | Identidad, documentos, episodios, borrador, firma, enmienda, recetas/anulación, cronología, tareas, resultados, observaciones y exportación. | Jerarquía clínica clara con lectura estable; controles de material común y separación por tareas. Desglose en §19. | 5 |
| R13 | `/dashboard/follow-ups` · `src/app/dashboard/follow-ups/page.tsx` | Búsqueda, filtro activo/completado, tareas, responsables, vencimiento, acciones y actividad. | Bandeja accionable, estado explícito y filtros de lente; sin anteponer analítica al trabajo pendiente. | 5 |
| R14 | `/dashboard/services` · `src/app/dashboard/services/page.tsx` | Listado, alta, edición, activación/desactivación, precio, duración y vacío. | Cards de servicio y editor coherentes con los que se usan al reservar. | 6 |
| R15 | `/dashboard/schedule` · `src/app/dashboard/schedule/page.tsx` | Días recurrentes, intervalos, hora inicio/fin, alta, activación y confirmación de eliminación. | Selección de día/hora común, solapamientos y errores legibles, acciones touch. | 6 |
| R16 | `/dashboard/workspace` · `src/app/dashboard/workspace/_components/workspace-view.tsx` | Sin consultorio/crear, miembros, invitar/retirar, invitaciones/revocar, sedes/crear/editar/archivar, facturación, mensajería y voz. | Organización por tareas y permisos; formularios y estados de integración dentro del sistema. Desglose en §19. | 6 |
| R17 | `/dashboard/profile` · `src/app/dashboard/profile/page.tsx` | Lectura, edición, avatar/progreso/error, datos profesionales y ubicación de consulta. | Identidad y formulario diferenciados; feedback de guardado y avatar sin saltos. | 6 |
| R18 | `/dashboard/notifications` · `src/components/notifications/notification-inbox.tsx` | Filtros, leído/no leído, marcar, eliminar, abrir destino, error y vacío. | Una misma bandeja compartida con paciente, adaptada por rol. | 6 |

### Área del paciente: 9 rutas

| ID | Ruta / archivo | Vistas y estados que se deben migrar | Resultado esperado | Ola |
| --- | --- | --- | --- | --- |
| R19 | `/patient/dashboard` · `src/app/patient/dashboard/_components/dashboard-view.tsx` | Próxima consulta, historial reciente, doctores, receta vigente y medicamentos declarados. | Próxima acción visible, cards neutras y una navegación consistente con el médico. | 7 |
| R20 | `/patient/doctors` · `src/app/patient/doctors/page.tsx` | Buscar, especialidad, ciudad, ordenar, resultados, selección, mapa, sheets de filtros/mapa, sin resultados y error de teselas. | Cards y filtros de material; mapa conserva legibilidad, atribución y controles táctiles. | 3 |
| R21 | `/patient/appointments` · `src/app/patient/appointments/page.tsx` | Lista, búsqueda, estados, reagendar, cancelar, enlaces a detalle y vacío. | La misma cita y DatePicker que en doctor, con acciones según rol. | 7 |
| R22 | `/patient/appointments/[id]` · `src/app/patient/appointments/[id]/page.tsx` | Detalle, profesional, servicio, ubicación, estado y cita no disponible. | Resumen prioritario y próxima acción clara; comportamiento de acceso intacto. | 7 |
| R23 | `/patient/appointments/book` · `src/app/patient/appointments/book/page.tsx` | Redirección existente a `/patient/doctors`; su loading devuelve `null`. | Validar redirección y retorno. No crear un segundo formulario de reserva ni contabilizarla como pantalla independiente. | 3 |
| R24 | `/patient/medical-history` · `src/app/patient/medical-history/page.tsx` | Tabs Historial, Información personal, Alergias, Medicamentos y Vacunas; consultas firmadas, recetas, consentimiento, crónicos y cirugías. | Tabs de lente y lectura sólida; diferenciar información declarada de la compartida por el médico. | 7 |
| R25 | `/patient/profile` · `src/app/patient/profile/page.tsx` | Lectura/edición, avatar, nacimiento, emergencia, datos y preferencias/consentimientos de comunicación. | Editor coherente con perfil médico y controles claros para permisos y cambios pendientes. | 7 |
| R26 | `/patient/notifications` · `src/components/notifications/notification-inbox.tsx` | La misma bandeja que R18 con destinos/autorización del paciente. | Reutilización real de la UI y foco conservado tras acciones. | 6/7 |
| R27 | `/patient/doctor/[doctorId]/review` · `src/app/patient/doctor/[doctorId]/review/page.tsx` | Seleccionar cita elegible, puntuación, comentario, envío, éxito y sin citas elegibles. | Rating accesible por teclado/touch y confirmación clara; no sugerir reseñar citas no elegibles. | 7 |

Las rutas `src/app/api/**` no son pantallas. Sus respuestas alimentan estados de UI y mantienen sus permisos. `/patient/doctors` está bajo layout autenticado: el rediseño no lo convierte por accidente en un directorio público. La reserva pública permite explorar, pero actualmente exige sesión de paciente al enviar.

## 19. Vistas internas y transversales que también cuentan

### Shell y tema global

- Sidebar médico y paciente: expandido, colapsado, hover, seleccionado, scroll interno, notificaciones y cambio de consultorio en curso/error.
- Móvil: header, cuatro destinos, “Más”, sección activa dentro de “Más”, safe areas y teclado abierto.
- Búsqueda de sección: vacía, consulta, resultados, sin coincidencias, foco de teclado y cierre/retorno.
- Selector de consultorio: uno o varios, seleccionado y permisos. Cuenta y cerrar sesión.
- Tema claro/oscuro/sistema en todas las rutas, portales, mapas, toasts y diálogos; no sólo dentro del laboratorio.

### Reserva y agenda

- Pickers de paciente, servicio y sede: búsqueda, seleccionado, sin opciones, carga y error.
- Fecha, mes, año y horas: hoy, seleccionado, no disponible, límite de rango, carga de disponibilidad, sin horarios y horario que se ocupó al confirmar.
- Nueva cita: avanzar, volver, cerrar, reabrir y cambios no guardados; no perder datos por cambiar la capa visual.
- Cita: pendiente, confirmada, llegada registrada, iniciada, completada, cancelada y ausencia según las acciones que ya ofrece el código.
- Reagendar del médico y paciente: fecha/hora anteriores, nueva elección y validación real al guardar.
- Cancelar, eliminar horario, desactivar servicio: distinguir acción reversible de una confirmación que evita pérdida real.

### Expediente R12: dividir la entrega para poder revisarla

| Vista | Alcance visual e interacción |
| --- | --- |
| Identidad y contexto | Paciente, consultorio, antecedentes relevantes, acceso denegado/no disponible. |
| Documentos | Elegir archivo, subiendo, progreso, error, listado, descarga autorizada y sin documentos. |
| Episodios | Seleccionar/crear episodio y asociar la consulta correcta. |
| Consulta | Crear borrador, editar borrador, guardar en curso/error y resumen que se comparte con el paciente. |
| Firma | Confirmación con contexto; el resultado firmado debe ser claramente distinto del borrador. |
| Enmienda | Lectura de versión, motivo, corrección y confirmación; conservar procedencia y auditoría. |
| Recetas | Elegir consulta firmada, capturar medicamento/dosis/vía/frecuencia/duración, emitir y leer. |
| Anular receta | Motivo, confirmación, resultado anulado y posible error. |
| Cronología | Consultas, enmiendas, tareas, documentos y mediciones, con fecha y procedencia reconocibles. |
| Seguimiento | Crear/asignar tarea, prioridad, vencimiento, iniciar/completar y estado del aviso por canal. |
| Instrumentos/resultados | Elegir instrumento/versión, registrar medición, serie temporal y sin resultados comparables. |
| Observaciones clínicas | `observation-panel.tsx`: últimas lecturas, tendencia, registrar, corregir y anular con motivo. |
| Exportación | Alcance, confirmación, generando, error y descarga JSON. No presentar un archivo parcial como expediente completo. |

Son vistas del mismo recorrido, no nuevas rutas obligatorias. El archivo actual tiene más de 2,000 líneas; extraer piezas a `_components` por tarea durante esta ola facilita revisar la UI sin cambiar contratos de datos.

### Consultorio R16

- Crear consultorio cuando falta; estado de acceso sin permisos.
- Miembros: carga, lista, invitar doctor, retiro confirmado y límites del plan.
- Invitaciones: pendientes, revocar, error y ausencia de invitaciones.
- Ubicaciones: listado, crear/editar, coordenadas/enlace, archivar con confirmación y límite de sedes.
- Facturación: resumen, estado de suscripción, elegir plan, abriendo Stripe, error, retorno de checkout/portal y permisos de propietario. La pantalla de Stripe es externa, no se rediseña desde este proyecto.
- Mensajería: configuración y estados de entrega disponibles; acceso restringido según rol.
- Voz: sin número, solicitud en curso, pendiente, activa y error. Mantener explícito qué está solicitado y qué está realmente activo.

### Estados de infraestructura y vistas faltantes

| Vista | Situación comprobada | Acción del plan |
| --- | --- | --- |
| Loading por ruta | Hay nueve `loading.tsx`; el de la redirección R23 devuelve `null`. Hay skeletons locales adicionales. | Revisar las nueve y cubrir con skeletons coherentes los recorridos que hoy dependen de un blank o de un spinner genérico. No duplicar el shell durante carga. |
| Error recuperable | No hay archivos `error.tsx` propios encontrados en `src/app`. | Añadir boundaries donde aporten recuperación: raíz y áreas médico/paciente; botón reintentar y salida segura. |
| 404 / recurso no disponible | No hay `not-found.tsx` propio; algunas páginas presentan estados locales. | Diseñar 404 global y estados de doctor/paciente/cita no disponibles sin filtrar datos protegidos. |
| Sesión vencida / rol incorrecto | Los layouts redirigen y hay wrappers cliente. | Revisar transición, retorno autorizado y conservación del contexto de reserva; no cambiar autorización por estilo. |
| Red desconectada / disponibilidad obsoleta | Errores locales en varios flujos; no se encontró una pantalla offline dedicada. | Estado de conectividad y reintento; conservar formularios, impedir confirmar horarios obsoletos. Esto no promete soporte offline ni PWA. |
| Aceptación de invitación | Existe operación de invitación/aceptación en servidor, pero no hay una `page.tsx` de aceptación en el inventario. | Registrar como brecha de producto: definir destino desde el enlace, válida/expirada/revocada/correo distinto y éxito. Implementación aparte de la migración visual; no inventar que ya existe. |
| Componentes de prueba/alternativos | `AuthTest`, `ProfileManager`, `RegistrationForm` y el post de ejemplo no aparecen importados como componentes en las rutas inspeccionadas. | Verificar referencias completas antes de retirarlos o migrarlos. No contarlos como vistas de producción ni gastar la ola visual en duplicados sin uso. |

## 20. Componentes compartidos: construir una vez y migrar usos

Todos los nombres nuevos de esta tabla son propuestas de implementación; no afirman que esos componentes ya existan.

| ID | Pieza / archivos de partida | Trabajo necesario | Consumidores principales |
| --- | --- | --- | --- |
| C01 | Materiales · `globals.css`, `liquid-glass/glass-surface.tsx` | Unificar presets de fondo/blur/perímetro; evitar el gris pesado del prototipo; controles siguen en DOM. | Todo el sistema |
| C02 | Button · `ui/button.tsx` | Variantes de burbuja, secundaria, ghost, peligro y loading; mapear todos los overrides negros de las páginas. | Landing, acceso, reserva, CRUD y diálogos |
| C03 | Segmentado / apariencia · `ui/tabs.tsx`, providers | Thumb de lente reutilizable y proveedor global Claro/Oscuro/Sistema; estados persistentes. | Agenda, historial, registro, filtros, shell |
| C04 | Card · `ui/card.tsx` | Acabado de referencia y variantes informativa/accionable/selección/formulario; preservar lectura. | Marketing, servicios, pacientes, expediente |
| C05 | DatePicker · `ui/calendar.tsx`, `ui/popover.tsx`, `ui/sheet.tsx` | Componer trigger + calendario + entrada validada; modos nacimiento/reserva/filtro y comportamiento móvil. | Agenda, alta de paciente, perfiles, reagendas, reserva y formularios demo |
| C06 | Hora · `ui/time-slot-picker.tsx`, selects de horario | Selector compacto con lista agrupada y sheet móvil con confirmación; se descarta la cuadrícula de botones. Intervalos recurrentes y disponibilidad son contratos distintos. | Nueva cita, reagendas, reserva pública y horarios |
| C07 | Select/Combobox · `ui/select.tsx`, `ui/searchable-select.tsx`, `ui/command.tsx` | Trigger, lista, búsqueda, estado seleccionado, teclado, vacío/error y portales con tema. | Paciente, servicio, ubicación, filtros y planes |
| C08 | Formularios · input, textarea, label, checkbox, radio y validation-errors | Alturas, foco, ayuda/error persistente, disabled/read-only y grupos largos. | Acceso, perfiles, alta, consulta y ajustes |
| C09 | Capas · dialog, alert-dialog, sheet, dropdown-menu y popover | Geometría de referencia, scrim, scroll, foco, móvil/teclado y tema heredado en portal. | Todas las operaciones secundarias |
| C10 | Datos · table, badge, avatar, skeleton, listas | Densidad, status icon+texto, fila/card móvil, carga, vacío y error. | Agenda, pacientes, consultorio, historial y avisos |
| C11 | Shell · `shell/product-shell.tsx` | Sidebar de la referencia, selección plateada, navegación móvil burbuja, búsqueda y cuenta. | Médico y paciente |
| C12 | Feedback · alert, sonner y headers | Toast sobrio, estados en contexto y títulos coherentes, sin trasladar todos los errores a un toast. | Todas las rutas |

También revisar `ui/map.tsx` y `patient/doctors/_components/doctors-map.tsx`: controles y popups siguen el tema, pero teselas/fotos y atribución conservan sus requisitos. No ejecutar `shadcn init`, no instalar otra familia de iconos ni agregar motores para conseguir un radio o una sombra.

## 21. Plan de ejecución por olas

Cada ola termina con un resultado visible y verificable. Una ruta sólo se marca terminada después de migrar sus vistas internas y estados aplicables. La ola 0 está **parcialmente completada**: inventario, referencias y contrato listos; falta el baseline visual por recorrido. La ola 1 tiene una **primera entrega implementada** (§23); la landing ya recibe el CTA de burbuja, la ola 2 está en implementación (§24) la ola 3 tiene implementación visual (§25) y las olas 4–8 siguen pendientes; la validación autenticada real continúa abierta.

| Ola | Dependencias | Alcance | Entregable revisable y criterio de salida |
| --- | --- | --- | --- |
| 0 · Contrato y baseline | Ninguna | Este plan, referencias, capturas actuales y lista de overrides. | Matriz R01–R27 y C01–C12 confirmada; registrar estados/tema/viewport de las capturas. No etiquetar el prototipo actual como objetivo aprobado. |
| 1 · Materiales y laboratorio | 0 | C01–C10/C12, tema global y R06. | Galería de botones burbuja, cards, DatePicker, horas, select, segmentos, menús y diálogos sobre fondo liso/contenido/media, en claro/oscuro. Salida: comparación con las cuatro referencias objetivo, teclado y contraste medidos. |
| 2 · Shell, landing y acceso | 1 | C11, R01–R03. | Sidebar de referencia y barra móvil; landing sin CTA negro; registro y login consistentes. Salida: acceso por rol y retorno al destino conservados. |
| 3 · Descubrir y reservar | 1–2 | R04, R05, R20, R23. | Lista/mapa → perfil → servicio → fecha/hora → solicitud. Salida: parámetros conservados, login requerido correcto, conflicto de horario recuperable y confirmación legible. |
| 4 · Operación del médico | 1–2 | R07–R11. | Resumen centrado en hoy, agenda día/semana, alta y reagenda, pacientes y alta de paciente. Salida: flujo paciente → cita → llegada/inicio/completado verificable sin depender de hover. |
| 5 · Expediente y continuidad | 4 | R12–R13, observaciones y desglose clínico de §19. | Subentregas: identidad/documentos/episodios; consulta/firma/enmienda; recetas; mediciones/tendencias; tareas/exportación. Salida: cada estado clínico se distingue y conserva permisos/datos. |
| 6 · Configuración y comunicación | 1–2; patrones de 4 | R14–R18 y base de R26. | Servicios, horarios, consultorio y todos sus ajustes, perfil médico, bandeja compartida. Salida: límites/roles claros, estados externos honestos y formularios accesibles. |
| 7 · Experiencia del paciente | 3; componentes de 5–6 | R19, R21–R22, R24–R27. | Inicio, citas/detalle, historial de cinco contextos, perfil, avisos y reseña. Salida: reservar → consultar cita → reagendar → leer información compartida → reseñar mantiene continuidad visual. |
| 8 · Cobertura completa | 2–7 | Errores, loading, 404, sesión/red, consistencia y brechas de §19. | Recorrido de las 27 rutas y checklist de subviews; ninguna página pendiente se oculta detrás de “ya usa el Button compartido”. Registrar aparte la aceptación de invitación si requiere nueva funcionalidad. |

Orden recomendado de trabajo: **0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**. El cambio de componentes base precede al cambio masivo de páginas. No hacer reemplazos globales de `bg-black` sin revisar si el elemento es botón, texto, scrim, superficie oscura o un estado semántico.

### Primera implementación concreta

La primera entrega implementa la base de C01–C07 en `/design-system` (§23): botón principal claro burbuja, thumb de selección claro, card con acabado, calendario como la referencia, picker de horas y selector de apariencia. Incluir el mismo CTA sobre un fondo liso, una lista en scroll y una escena GPU. Con esa anatomía comprobada, llevar C02 a la landing y C11 al shell. Esta secuencia evita repetir el prototipo de selección negra en otras 26 vistas.

## 22. Validación y cierre de cada ola

- Capturas: 390 px y 1440 px por ruta migrada; 375, 768 y 1024 px en shell, agenda, formularios, mapa y expediente. Revisar también zoom 200% y teclado móvil.
- Apariencia: claro/oscuro/sistema, selector persistente y portales del mismo tema. Probar normal/hover/pressed/foco/loading/disabled/error de cada control.
- Material: comparar fondo liso, texto detrás y mapa/imagen/GPU; medir contraste real con la opacidad final. No aprobar sólo porque el blur “se ve bonito”.
- Teclado: Tab/Shift+Tab, flechas donde corresponda, Escape, retorno de foco y entrada de fecha sin ratón. Touch: ninguna acción requiere hover o arrastre.
- Datos: pruebas con fixtures/mock o entorno de prueba autorizado; no usar datos clínicos reales en capturas de diseño ni ejecutar escrituras en producción para revisar un material.
- Regresión funcional: mantener sesión/rol, consultorio activo, filtros, formularios, parámetros de reserva, zona horaria y contratos tRPC. Una fecha de calendario no debe cambiar por convertirla innecesariamente a otra zona.
- Verificación técnica: `pnpm check`, `pnpm test`, `pnpm test:design`; build al cerrar una ola que cambie rutas, imports o bundling. Añadir pruebas de recorridos representativos, no una prueba por cada sombra.
- GPU: no alterar los originales verificados; conservar resize, render y cleanup en la adaptación. Probar scene visible, fuera de pantalla, desmontaje, preferencias y pérdida/fallo de inicialización.
- Entrega: indicar IDs R/C terminados, capturas y validaciones realizadas, estados pendientes y deuda observada. La verificación inicial de §15 no se reutiliza como prueba de estas olas.

**Estado de la primera entrega (actualización en §24):** materiales y controles disponibles en `/design-system`; CTA de burbuja aplicado a la landing. Las demás rutas todavía requieren migración y verificación individual. El inventario R01–R27 sigue siendo el alcance completo.


## 23. Primera entrega implementada · 29 de octubre de 2026

Esta entrega establece la anatomía compartida antes de migrar las vistas clínicas. No marca las 27 rutas como terminadas ni cierra toda la ola 1.

| Alcance | Resultado visible | Límite de esta entrega |
| --- | --- | --- |
| C01 / materiales | Presets `plain`, `content` y `media`: blur de 12 / 24 / 30 px, opacidad, borde, luz y sombra adaptados al tema. Muestras sobre fondo liso, agenda detrás y escena GPU. | El preset se declara según el contexto; no hay detección automática de fondos. Las capas anidadas evitan acumular blur. |
| C02 / botones | CTA claro de burbuja, secundaria, ghost, peligro, foco, loading y disabled. Objetivo mínimo de 44 px en controles nuevos. Landing utiliza enlaces con apariencia de Button, sin anidar botones en enlaces. | Falta revisar overrides locales de las demás rutas. |
| C03 / selección y tema | Segmentado con lente móvil, flechas de teclado y movimiento reducido; tabs con selección clara; Claro / Oscuro / Sistema persistentes en el proveedor global. | Aplicar el selector y revisar estilos locales en el shell y acceso en la ola 2. |
| C04 / cards | Superficie estable para lectura, radio de 24 px, borde y brillo tenue. | Variantes accionables, de selección y formularios largos se completan con sus recorridos. |
| C05 / fechas | `DatePicker` controlado por fecha local `yyyy-mm-dd`, entrada `dd/mm/aaaa` validada, límites, modo nacimiento con mes/año y sheet en móvil. Recuperación del foco y calendario inline sincronizado con la fecha de muestra. | Sustituir campos existentes según su contrato y validar reservas/reagendas contra disponibilidad real. |
| C06 / horas | Burbujas agrupadas, selección circular/contorneada y texto accesible. | No modifica la lógica de intervalos recurrentes ni disponibilidad del servidor. |
| C07 / listas | Select y búsqueda de opciones con el mismo material, tema heredado, foco, teclado y resultado seleccionado. | Los estados de red/error y listas extensas se validan al migrar sus consumidores. |
| R06 / laboratorio | Agenda de muestra, nueva cita demo, calendario, horas, servicios, búsqueda de profesionales, nacimiento y muestras de material. | Todos los datos son ficticios; confirmar la demo no crea citas. |
| R01 / landing, parcial | Botones principales de burbuja clara y apariencia global. | No es una auditoría completa de la landing ni de su recorrido de acceso. |

Se corrigió un conflicto real de foco entre el diálogo y sus pickers: coexistían dos versiones de `@radix-ui/react-focus-scope` (1.1.7 y 1.1.16). `Dialog` y `Select` ahora usan las primitivas de `radix-ui`, igual que `Popover` y `Sheet`, para compartir el manejo de capas. La búsqueda ya no necesita un portal dentro del contenedor con scroll del diálogo.

La escena WebGPU y sus shaders permanecen en la adaptación existente. Esta entrega no altera los dos originales verificados de `typegpu-liquid-glass/`. Las pruebas de navegador verifican frames GPU y liberación del dispositivo al cambiar preferencias, además del funcionamiento de los controles cuando la API no está disponible.

Validación de cierre de esta entrega:

- `pnpm check`: typecheck correcto y lint sin errores; continúan 14 advertencias previas en avatar-upload, notification-inbox y appointment, fuera de estos cambios.
- `pnpm test`: 19 archivos y 77 pruebas correctas, incluidas fechas locales, límites y años bisiestos.
- `pnpm test:design`: 11 pruebas de navegador correctas. Cubren render/cleanup WebGPU, periodos por teclado, fecha escrita inválida/válida, foco y confirmación dentro del diálogo, sheet móvil dentro del diálogo, nacimiento por mes/año, búsqueda de profesionales, tema persistente/sistema, CTA de landing y los tres presets de material.
- `pnpm build`: compilación de producción correcta. Capturas verificadas en un preview local del build: sesión anónima HTTP 200 y ningún error JavaScript de la UI. Ese proceso temporal usó `AUTH_TRUST_HOST=true` para localhost, sin modificar configuración persistente; el endpoint de Vercel Analytics ausente fuera de Vercel se excluyó del smoke local.
- Capturas de la implementación en `docs/design/previews/`: [claro](previews/wave-1-light.png), [oscuro](previews/wave-1-dark.png), [móvil 375 px](previews/wave-1-mobile.png) y [calendario oscuro](previews/wave-1-calendar-dark.png). Son evidencia de esta entrega, no sustituyen las referencias objetivo del usuario ni el baseline pendiente del resto de rutas.

El contraste de texto principal de los tres presets se comprueba con composición de opacidad sobre extremos claro/oscuro; esta comprobación no certifica todavía todos los textos, estados o fondos dinámicos de las demás rutas.

Siguiente entrega: C11 y R01–R03 completos — sidebar, navegación móvil, login y registro — conservando rol, consultorio y retorno al destino. Después continúa la reserva pública según la ola 3.


## 24. Revisión 3 · Cristal neutro, picker de horas y shell/acceso

### Correcciones explícitas del usuario

- Se probó un tinte azul en claro y el usuario lo rechazó. [Captura del tratamiento descartado](references/rejected-blue-controls.png). **No conservar azul como variante ni reintroducirlo para simular cristal.** La paleta sigue siendo blanca, negra y gris; el volumen claro procede de reflejo blanco, borde doble, sombra gris y profundidad interior. El acabado de los botones oscuros se conserva.
- Se descarta la [cuadrícula de botones de horas](references/rejected-time-button-grid.png). C06 muestra una sola hora en un selector compacto. En escritorio abre una lista con grupos Mañana / Tarde / Noche; en móvil abre un sheet con elección y confirmación. Cancelar conserva la hora anterior. La hora debe seguir existiendo en la disponibilidad actual para poder confirmarse.
- Las superficies de lectura siguen siendo estables. Más volumen en un control no significa añadir refracción al texto ni llenar toda la pantalla de burbujas.

### Implementación de esta revisión

| Área | Implementado | Pendiente de verificar como recorrido completo |
| --- | --- | --- |
| Material claro / C01–C03 | Perímetro y reflejos convexos neutros más visibles; selección elevada; accesibilidad de contraste/transparencia conserva la superficie sólida. | Capturas y contraste en los fondos de las rutas clínicas aún pendientes. |
| Horas / C06 | `TimeSlotPicker` conserva `slots`, `selectedTime` y `onSelectTime`; lista accesible en escritorio, sheet con borrador/confirmación en móvil, agrupación, vacío y rechazo de valores que desaparezcan de `slots`. | Reserva real, conflictos del servidor e intervalos recurrentes de la ola 3/6. |
| Shell / C11 | Sidebar flotante grafito con radio amplio y selección luminosa; objetivos de 44 px, colapso persistente, consultorio, avisos, cuenta, apariencia global y barra móvil con selección. La búsqueda ahora vive fuera del sidebar oculto y puede abrirse en móvil. | Sesiones reales de ambos roles, permisos y cambio de consultorio contra el servidor, además de revisar contenido de cada ruta. |
| Acceso / R02 | Formulario legible en ambos temas, contraseña visible/oculta, pending, error con credenciales conservadas y retorno interno permitido según rol. | Inicio de sesión real en entorno autorizado. |
| Registro / R03 | Misma composición que login; doctor/paciente conserva borradores separados, validadores existentes, errores asociados al campo, especialidad/cédula, requisitos de contraseña sin códigos técnicos y éxito después de respuesta real. Retorno conservado entre registro y login. | Creación de cuenta real y casos del servidor contra entorno autorizado; las pruebas de UI usan respuestas simuladas. |
| Laboratorio / R06 | Nuevo subrecorrido `/design-system/shell` usa la misma presentación del shell con datos ficticios y callbacks locales; no concede una sesión ni permite saltar autorización. | No sustituye el recorrido autenticado. Los enlaces continúan apuntando a rutas protegidas reales. |

`ProductShell` conserva sesión, limpieza de caché al cambiar usuario, queries, mutation de consultorio y logout. `ProductShellView` recibe datos y acciones para que la misma interfaz pueda revisarse sin datos clínicos. Las páginas de acceso son composición delgada; sus formularios están localizados en `_components` y comparten estructura y contraseña. Los parámetros de retorno sólo admiten destinos internos del producto: no URLs externas, rutas de API ni bucles de login/registro. Esto complementa, y no reemplaza, la autorización del servidor.

Esta revisión deja la ola 2 **en progreso**: el shell y acceso tienen implementación visual; falta acreditar acceso real por rol, cambio de consultorio y sus recorridos. R01 conserva los CTA actualizados; el resto de la landing y el inventario de rutas no se declara cerrado.

Validación de esta revisión:

- `pnpm check`: sin errores de lint o TypeScript; las mismas 14 advertencias previas fuera de esta entrega.
- `pnpm test`: 20 archivos / 80 pruebas correctas, incluidos retorno interno, límites por rol y rechazo de redirección externa.
- Navegador: 17 casos cubiertos. Trece pasaron en la ejecución completa y los cuatro restantes pasaron al corregir sus selectores/sincronización y repetirlos. Se comprobaron frames y cleanup WebGPU, materiales/tema, fechas, selector de horas por teclado, borrador/confirmación móvil, sidebar persistente, consultorio de muestra, búsqueda móvil, credenciales conservadas al fallar y creación de paciente con respuesta simulada. Ningún alta real ni escritura clínica fue necesaria.
- Los SHA-256 de los originales TypeGPU siguen coincidiendo con los publicados.
- `pnpm build`: correcto, incluida la nueva vista de laboratorio del shell. Formato Prettier correcto.
- Smoke del build local: cero errores JavaScript de la UI y sesión anónima HTTP 200. Se utilizó el mismo ajuste de host sólo para el proceso local descrito en §23; Vercel Analytics no existe en ese servidor local.
- Se comprobó además que la confirmación del sheet de horas queda completamente dentro del viewport de 375 × 812, sin tener que desplazar el pie para encontrarla.

Capturas de esta revisión (datos ficticios y formularios sin enviar):

| Área | Capturas |
| --- | --- |
| Controles / horarios | [Claro](previews/revision-3-light.png), [picker compacto](previews/revision-3-picker.png), [lista de horas](previews/revision-3-hours-list.png), [horas en móvil](previews/revision-3-hours-mobile.png) |
| Shell | [Doctor](previews/revision-3-shell-doctor.png), [paciente](previews/revision-3-shell-patient.png), [oscuro](previews/revision-3-shell-dark.png), [móvil](previews/revision-3-shell-mobile.png) |
| Login | [Claro](previews/revision-3-login.png), [oscuro](previews/revision-3-login-dark.png), [móvil](previews/revision-3-login-mobile.png) |
| Registro | [Doctor](previews/revision-3-register-doctor.png), [paciente](previews/revision-3-register-patient.png) |




## 25. Revisión 4 · Descubrir profesional y reservar

Se continúa con R04, R05 y R20; R23 conserva su redirección. El cristal permanece neutro y selectivo. No se retoma el azul rechazado ni la cuadrícula de botones de horas.

| Área | Cambio implementado | Límite / siguiente validación |
| --- | --- | --- |
| R20 / directorio | Encabezado, búsqueda, cards y filtros en ambos temas; especialidades con etiquetas legibles; se eliminan idiomas vacíos, iconos decorativos repetidos y botones anidados dentro de enlaces. | La ruta real mantiene el layout autenticado de paciente. No se convierte en directorio público. |
| Búsqueda y orden | Consulta, especialidad, ciudad y orden en la URL con History API integrada en Next; se conservan al recargar y en el enlace de vuelta. Búsqueda tolerante a acentos y códigos con guiones. Orden de disponibilidad compara fecha y hora, no sólo hora. | Se conserva el límite de 100 resultados del endpoint existente; no se implementa una búsqueda nacional ni paginación del servidor. |
| Mapa | Se carga al abrirlo, en panel lateral o inferior según viewport; sólo recibe ubicaciones de los resultados filtrados. Controles, popup y fallback siguen el tema; coordenadas y atribución mantienen sus contratos. | Sin proveedor disponible se ofrecen ubicaciones externas; no se simulan teselas. Falta validación real del proveedor/teselas en dispositivos objetivo. |
| R04 / perfil público | Hero y secciones de lectura con cards, tema global, servicios/precio/duración, reseñas y horarios. Reservar un servicio conserva su ID y el retorno al directorio. El visitante anónimo vuelve al inicio, no a una ruta privada. | Datos públicos y permisos permanecen en el servidor. |
| R05 / reserva pública | Navegación pública antes de sesión; shell correspondiente al rol cuando hay sesión. Tres pasos: consulta, fecha/hora y confirmación/datos. Precio y duración antes del envío. | La solicitud real requiere perfil de paciente; no se amplía autorización desde UI. |
| C05 / fechas | `DatePicker.availableDates` restringe tanto selección como entrada escrita a días disponibles dentro del rango permitido. Se conserva la fecha de calendario local como string hasta el contrato de envío existente. | La disponibilidad del servidor decide; el calendario no inventa días ni garantiza un horario hasta enviar. |
| C06 / horas | La reserva pública utiliza el picker compacto compartido; se descartan también aquí las filas de botones de días y horas. Vacío, carga y error tienen mensajes y reintentos. | Intervalos recurrentes y otras pantallas se migran en sus olas. |
| Sesión y continuidad | Servicio, fecha, hora y directorio de origen sobreviven a login/registro mediante retorno interno permitido. Los datos clínicos se solicitan después de iniciar sesión como paciente. | No se guardan síntomas/alergias/medicación en URL ni almacenamiento local para atravesar login. |
| Conflictos | Antes de enviar se exige servicio válido y disponibilidad actual. Respuesta 409/horario ocupado vuelve a fecha/hora y actualiza disponibilidad; conserva el motivo y datos ya escritos. Bloqueo de doble envío y de Atrás durante envío. | Pruebas con respuestas simuladas; falta envío real en entorno autorizado. El servidor sigue siendo la autoridad final. |
| R23 / redirección | Se mantiene `/patient/appointments/book` → `/patient/doctors`; no se crea otra reserva ni se elimina el layout privado. | La petición anónima sigue redirigiendo a login. Validación autenticada real pendiente. |

Las páginas se mantienen como composición; los detalles propios están en `_components`. Cards, filtros/modelo del directorio y mapa viven en `components/doctors` porque son usados por la ruta real y el laboratorio. `/design-system/discovery` muestra esos mismos componentes con datos ficticios y estados de resultados/vacío/error/carga. No consulta doctores reales ni crea una sesión; sus enlaces conservan destinos reales.

La ola 3 tiene implementación visual y pruebas de UI con fixtures; **no se declara cerrada como recorrido de producción**. Continúan pendientes cuentas reales de ambos roles, solicitudes contra un entorno autorizado y teselas/mapa en dispositivos reales. La migración de las otras vistas y la revisión completa de la landing siguen abiertas.

Validación de cierre:

- `pnpm check`: lint y TypeScript sin errores; continúan las mismas 14 advertencias previas fuera de esta entrega.
- `pnpm test`: 21 archivos / 84 pruebas correctas. Incluye búsqueda normalizada, orden por fecha/hora, servicios activos/precio y retorno interno del directorio.
- `pnpm test:design`: 23 casos de navegador correctos en la ejecución de regresión. Después de los ajustes de foco/acciones móviles se repitieron los seis casos nuevos contra el build de producción: los seis correctos, incluidos mapa y navegación entre rutas, sin recarga de código de desarrollo durante la prueba.
- Verificaciones nuevas: filtros conservados al recargar; sheet de filtros y mapa; perfil → servicio → fecha válida/no disponible → hora → login → registro con retorno; conflicto 409 y recuperación del motivo/alergias; vacío de disponibilidad; reintento de servicios; perfil inexistente; petición anónima al directorio privado redirigida a login.
- El campo enfocado se mantiene por encima de las acciones y navegación móviles. Se comprueba la visibilidad del pie y del campo de alergias en 390 × 844. Las capturas móviles de reserva muestran el viewport real, no una captura larga con barras fijas superpuestas al contenido.
- `pnpm build`: correcto, incluidas las rutas nuevas y modificadas. `PLAYWRIGHT_BASE_URL` permite repetir UI contra un preview local de producción; el comportamiento predeterminado conserva el servidor de desarrollo.
- Los originales TypeGPU conservan sus hashes verificados. La regresión mantiene frames y limpieza del dispositivo.
- Todas las solicitudes de reserva y respuestas de doctores usadas en las pruebas fueron interceptadas con fixtures; no se creó ninguna cita, paciente ni cuenta real.

Capturas del build con datos ficticios:

| Área | Evidencia |
| --- | --- |
| Directorio | [Claro](previews/revision-4-directory-light.png), [oscuro](previews/revision-4-directory-dark.png), [móvil](previews/revision-4-directory-mobile.png), [mapa móvil](previews/revision-4-map-mobile.png) |
| Perfil | [Perfil profesional](previews/revision-4-profile.png) |
| Reserva pública | [Servicio](previews/revision-4-booking-service.png), [fecha y hora](previews/revision-4-booking-availability.png), [continuar por login](previews/revision-4-booking-login.png) |
| Reserva móvil | [Datos de consulta y foco visible](previews/revision-4-booking-details-mobile.png), [conflicto recuperable](previews/revision-4-booking-conflict-mobile.png), [solicitud enviada](previews/revision-4-booking-success-mobile.png) |

Siguiente alcance visual: operación diaria del médico (R07–R11), conservando las verificaciones reales pendientes de las olas anteriores.
