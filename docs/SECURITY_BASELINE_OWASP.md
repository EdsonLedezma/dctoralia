# Línea base de seguridad web

Este documento registra controles técnicos presentes en Dctoralia y tareas de despliegue que todavía deben completarse. Es una guía de implementación, no una certificación OWASP ni una garantía de cumplimiento legal.

## Controles implementados en el código

- Las operaciones de escritura del endpoint tRPC y las cargas de archivos validan `Origin` y Fetch Metadata para rechazar solicitudes claramente cross-site.
- Los endpoints de carga limitan el tamaño del JSON de control mientras se lee el stream, aceptan solo tipos permitidos y comprueban firmas binarias después de subir los archivos al almacenamiento privado.
- Los archivos clínicos se vinculan a paciente, clínica y episodio tras volver a comprobar la autorización del actor. Los endpoints de descarga deben conservar la comprobación de acceso y auditoría antes de entregar contenido.
- Las respuestas de errores internos tRPC son genéricas en producción. Los logs de operaciones clínicas y cargas no imprimen el mensaje ni el objeto de error.
- Se desactivó el logging de consultas Prisma en desarrollo para no enviar parámetros potencialmente clínicos a la consola.
- Las rutas `/api/*` declaran `private, no-store`; los headers globales añaden `nosniff`, protección contra framing, política de referrer y HSTS en producción. Camera, microphone y geolocation quedan limitados al mismo origen.
- La sesión JWT de NextAuth dura ocho horas y `AUTH_SECRET` requiere al menos 32 caracteres en producción.
- Se retiraron endpoints públicos de autenticación redundantes que permitían consultar existencia de correo o probar contraseñas sin crear una sesión. El login usa el flujo de NextAuth.
- Las respuestas del directorio público de doctores ya no exponen correo, identidad de pacientes ni reseñas privadas.
- La caché de React Query se limpia al cerrar sesión y al cambiar de usuario autenticado.

## Bloqueadores y trabajo pendiente antes de producción

1. **Rate limiting distribuido:** ya está conectado a Upstash Redis REST para credenciales (20/15 min por IP y correo), registro (8/h por IP), directorio público (60/min por IP) y cargas (20/h por IP). Agregar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` a producción antes de habilitar tráfico: las rutas cubiertas responden 503 si falta Redis o no se puede verificar el límite. Configurar también límites de volumen en Vercel Firewall para cubrir ataques antes de entrar a las funciones.
2. **MFA:** añadir segundo factor, al menos obligatorio para administradores y disponible para doctores; revisar recuperación de cuenta y revocación de sesiones.
3. **CSP:** falta Content Security Policy. Inventariar scripts, mapas, pagos y recursos de terceros; desplegar primero en `Content-Security-Policy-Report-Only`, corregir violaciones y después imponer la política.
4. **Análisis de archivos:** las firmas binarias y límites de tamaño no detectan malware ni contenido políglota. Para documentos clínicos, integrar análisis antimalware y, donde aplique, CDR antes de habilitar descarga.
5. **Controles de infraestructura:** verificar cifrado en reposo y backups de Neon/Blob, permisos mínimos, separación de entornos, rotación de credenciales, restauración de backups y acceso de operadores.
6. **Auditoría y respuesta:** establecer retención y alertas para accesos/cambios clínicos, accesos privilegiados, fallos de autenticación, descargas masivas y eventos del proveedor. Definir proceso de incidentes y recuperación de cuentas.
7. **Verificación independiente:** ejecutar pruebas de autorización BOLA/IDOR por rol y clínica, revisión de configuración y pentest antes de habilitar datos reales. Validar también headers y flujos de carga en un deployment protegido de staging.

## Límites conocidos

- La protección `Origin`/Fetch Metadata es defensa CSRF adicional; cada mutación debe seguir autenticando y autorizando el recurso en servidor. Los clientes no navegador que omiten `Origin` siguen aceptándose.
- La validación de tipo y firma no equivale a escaneo antimalware, y la validación posterior a la carga no impide que el objeto exista temporalmente en el bucket privado.
- MFA, CSP, análisis antimalware y certificación ASVS siguen pendientes.
- Las auditorías de producción (`pnpm audit --prod`) no reportan vulnerabilidades conocidas. La auditoría completa conserva un hallazgo alto en `braces@3.0.3`, una dependencia de desarrollo sin versión corregida publicada en el advisory consultado; revisar y actualizar cuando el upstream publique el parche.
- El cumplimiento aplicable al tratamiento de datos personales y datos de salud en México requiere revisión legal y operativa especializada; estos cambios técnicos no sustituyen esa revisión.

## Referencias

- [OWASP API Security: Broken Object Level Authorization](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/)
- [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Next.js security headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)
