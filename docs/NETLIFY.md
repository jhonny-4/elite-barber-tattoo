# Presentación en Netlify

Esta versión permite presentar el diseño y recorrer reservas, solicitudes y gestión con datos ficticios. No está lista para atender clientes reales.

## Ejecutar y publicar

1. Node 24 (`.nvmrc`), `npm ci`.
2. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
3. `npm run dev` para trabajar o `npm start` para revisar el build.
4. Netlify está conectado al repositorio GitHub. Un push a `main` inicia su build; revisar el resultado en el panel del sitio.
5. Configuración: `netlify.toml`, comando `npm run build`, salida `.next`. No subir `.env`, `var/`, credenciales ni datos personales.

## Almacenamiento de presentación

- Local: JSON en `var/demo/`, escritura atómica y cola de operaciones en un único proceso. `ELITE_DEMO_DIR` permite cambiar el directorio.
- En un contexto compatible de Netlify Blobs: almacenamiento de objetos con escrituras condicionales y reintentos. `ELITE_STORE=file|netlify-blobs` permite elegir explícitamente.
- Las imágenes de referencia se guardan separadas del estado y se sirven con una ruta propia. La API de estado no incluye data URLs.
- Sincronización local mediante SSE y sondeo; en un entorno sin SSE se usa sondeo adaptativo.
- `ELITE_BLOBS_SCOPE=site` comparte el almacén del sitio; por defecto se aíslan despliegues. No cambiarlo sin decidir qué datos se deben conservar entre versiones.

## Límites de esta versión

El panel tiene acceso simulado y las APIs no tienen autorización de producción. Ocultar enlaces o recordar la sesión no protege los contactos. Usar exclusivamente datos ficticios.

No hay pagos, notificaciones automáticas, integración de WhatsApp ni confirmación automática de tatuajes. Los botones sociales solo abren enlaces. Los tatuajes quedan pendientes de valoración manual.

## Producción posterior

Migrar a PostgreSQL/Supabase con restricciones y transacciones para disponibilidad y concurrencia; autenticación y roles comprobados en servidor; referencias privadas con acceso autorizado; protección de formularios y auditoría; después pagos y notificaciones con webhooks verificados. Ver `PRODUCCION.md`.

## Verificación

La integración recuperada pasó compilación, tipos, lint y 46 pruebas locales. El resultado de cada despliegue debe verificarse también en Netlify; estas pruebas no demuestran por sí solas el comportamiento del proveedor en producción.
