# Ubicaciones de atención y Google Maps

## Configuración de Google Cloud

1. Crear un proyecto de Google Cloud, vincular facturación y habilitar Maps JavaScript API.
2. Crear una API key restringida por sitios web (HTTP referrers). Permitir localhost:3000 para desarrollo y los dominios exactos de Dopilot para producción; restringir también la API a Maps JavaScript API.
3. Crear un Map ID de tipo JavaScript para producción.
4. Configurar estas variables y reiniciar el servidor o desplegar nuevamente:

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=clave_del_proyecto
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=id_del_mapa
```

La clave de navegador es pública por diseño: las restricciones de dominio y API son necesarias. Configurar cuotas y alertas de presupuesto en Google Cloud. No se requiere Places ni Geocoding para colocar manualmente el pin; la dirección se captura por separado.

Sin clave, la dirección puede guardarse y Cómo llegar abre Google Maps. El mapa interactivo se carga únicamente al presionar Ubicar en Google Maps. El marcador se mueve al tocar el mapa o arrastrarlo, con soporte de teclado de Google Maps. No se muestran latitud/longitud como texto ni campos.

## Operación

- Consultorio → Ubicaciones: crear o editar dirección y referencias, colocar pin.
- Horarios: el doctor asigna la ubicación a cada día de atención. Con el modelo actual hay una ventana por día; distintas ventanas/sedes en el mismo día requieren ampliar ese modelo.
- El paciente elige fecha y hora, nunca ubicación. El servidor determina la sede según el horario y rechaza ubicaciones arbitrarias enviadas por el cliente.
- Un horario antiguo sin sede solo puede usar automáticamente la única ubicación activa de su clínica. Si hay varias, el doctor debe asignarla antes de ofrecer citas.
- Las nuevas citas conservan nombre, dirección, referencias y pin asignados como copia. Editar una sede no cambia silenciosamente estas citas. Reprogramar vuelve a asignar la ubicación del horario de destino.
- El resumen de reserva y el detalle de cita muestran dirección y Cómo llegar. La confirmación de Sent.dm incluye location_name, location_address, location_directions y location_maps_url: la plantilla aprobada debe consumir esos parámetros para que aparezcan en WhatsApp.
- Las citas antiguas sin copia usan la ubicación vinculada cuando existe; una cita sin ubicación muestra que el consultorio debe confirmar la dirección.

## Aplicación del esquema

El esquema está preparado; ejecutar personalmente `pnpm db:push` antes de probar el flujo. No se aplicaron cambios ni se consultaron datos desde el agente. No se realizaron pruebas de navegador ni llamadas reales a Google Maps/Sent.dm.

## Referencias

- https://developers.google.com/maps/documentation/javascript/advanced-markers/start
- https://developers.google.com/maps/documentation/javascript/advanced-markers/draggable-markers
- https://developers.google.com/maps/documentation/javascript/get-api-key