# Datos de demostración de Dopilot

El seed está preparado; no se ejecutó contra ninguna base de datos desde el agente. La skill `stack-web` exige que el propietario realice las operaciones de base de datos.

## Qué crea

- 3 workspaces: Pro independiente, Enterprise con cuatro doctores y Custom con tres.
- 8 doctores, 24 pacientes, 5 ubicaciones, 24 servicios y horarios semanales.
- 408 citas desde hace 28 días hasta dentro de 14 días; cada doctor tiene tres citas hoy.
- Consultas completadas, canceladas, no-show, pendientes y confirmadas; reseñas coherentes con consultas completadas.
- Expedientes ficticios y notificaciones leídas/no leídas.
- 15 mensajes simulados con `provider=demo` y sandbox; el dispatcher de Sent no los procesa.

No crea cobros, clientes Stripe, claves, tokens de invitación ni mensajes enviables. Los teléfonos `DEMO-xxxx` son deliberadamente no marcables. No publiques estos perfiles como doctores reales. Las suscripciones demo son activas sólo para ejercitar permisos del frontend; no acreditan un pago.

## Preparación

1. Comprueba que el esquema actual ya está aplicado en la base destino.
2. Usa de preferencia una base de desarrollo o una copia de tus datos, sin claves live de Stripe/Sent.
3. El seed carga tus archivos `.env` con la misma precedencia de Next.js y usa `POSTGRES_PRISMA_URL`, la conexión existente de la app. No necesitas variables nuevas ni modificar esos archivos. Las variables ya definidas en tu terminal tienen prioridad.

Puedes revisar cantidades sin conexión ni credenciales con `pnpm demo:preview`.

## Anexar datos demo conservando los existentes

En PowerShell, desde la raíz del proyecto:

```powershell
pnpm demo:seed --allow-existing
```

Todas las cuentas demo nuevas usan `password123`, almacenada como hash Argon2. Es una contraseña pública de prueba: no uses estas cuentas en producción. El comando se niega a correr con `NODE_ENV=production`; no cambia las políticas de contraseña de la aplicación.

El modo `--allow-existing` agrega cuentas y workspaces nuevos. **No llena tu cuenta personal ni asigna pacientes ficticios a tus doctores reales**: inicia sesión con una cuenta demo para ver la actividad. El directorio sí mostrará los doctores demo en la base elegida.

## Base dedicada vacía

Ejecuta `pnpm demo:seed` sin `--allow-existing`. Este modo rechaza cualquier usuario o workspace ajeno al dataset y usa la misma conexión existente.

## Accesos

| Recorrido                               | Correo                       |
| --------------------------------------- | ---------------------------- |
| Doctor, propietario Enterprise          | `doctora@demo.dopilot.test`  |
| Paciente con historial y próximas citas | `paciente@demo.dopilot.test` |
| Doctor independiente Pro                | `pro@demo.dopilot.test`      |
| Propietario Custom                      | `custom@demo.dopilot.test`   |

La contraseña `password123` y los correos principales están en `scripts/demo/demo-data.ts` (`DEMO_PASSWORD` y `DEMO_ACCOUNTS`). El resto de pacientes usa `paciente2@demo.dopilot.test` hasta `paciente24@demo.dopilot.test`. Si ya cargaste una cuenta antes con otra contraseña, conserva la anterior: el seed no la restablece.

Para verlos en la app, su conexión `POSTGRES_PRISMA_URL` debe apuntar a la misma base donde cargaste el seed. El script no cambia conexiones ni inicia servidores.

## Repeticiones y conservación

La carga usa una transacción e IDs deterministas. Sólo inserta registros ausentes: no borra nada, no reemplaza citas, no modifica usuarios existentes y no restablece contraseñas. Las colisiones de identidad demo cancelan la carga. Repetir el comando no mueve las fechas de citas existentes; para una nueva demostración con fechas recientes usa una base demo nueva, no borres tu base actual.

La simulación no prueba integraciones externas ni sustituye pruebas de reserva con datos reales.

## Si falla

El script muestra la fase y un código sin revelar credenciales. Un fallo no significa automáticamente que tu base esté mal:

- `MISSING_URL`: falta la conexión habitual `POSTGRES_PRISMA_URL`.
- `P1000` / `P1001`: credenciales rechazadas o servidor inaccesible.
- `P2021` / `P2022`: falta una tabla o columna. Comprueba primero que la conexión apunte a la base correcta y después aplica manualmente el esquema si corresponde.
- `EXISTING_DATA`: usa `--allow-existing` para conservar y acompañar tus datos actuales.
- `IDENTITY_COLLISION`: una identidad demo ya existe con datos distintos; se cancela sin reemplazarla.

Las inserciones se ejecutan juntas en una transacción. El script no modifica el esquema automáticamente.
