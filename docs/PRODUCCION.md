# Paso a producción

**Actualización 21/10/2026:** consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Hostinger, Supabase, roles reales, agenda/panel/fila y Resend ya están implementados. Las fases siguientes son el plan histórico; no describen tareas enteramente pendientes. Bold, validaciones físicas y revisión de respaldos continúan pendientes según el estado vigente.

La interfaz y los módulos de dominio se conservan. Sustituir el adaptador local por persistencia remota; quitar etiquetas demo solo después de completar y verificar cada integración.

## Fase 1: contenido y reglas confirmadas

Recibir originales, profesionales, servicios, tarifas, duración, descansos, políticas, dirección y contacto. Acordar si barbería confirma automáticamente y cómo se gestionan cambios y anticipos. Tatuajes siempre requieren valoración antes de acordar cita. Separar borradores, preproducción y producción.

## Fase 2: datos, acceso y agenda

PostgreSQL/Supabase. Tablas previstas: clientes, profesionales, servicios, profesional_servicio, horarios recurrentes, excepciones, citas, solicitudes_tatuaje, referencias, cotizaciones, historial_estados y auditoría.

Usar fechas con zona horaria, visualizar en America/Bogota, y representar ocupación con rangos. Restricción de exclusión por profesional y rango para estados que bloqueen agenda, dentro de transacciones. Añadir tiempos de preparación si se confirman. Probar concurrencia entre dispositivos, reintentos, idempotencia y liberación de reservas temporales. El navegador nunca es autoridad para disponibilidad ni precios.

Supabase Auth y permisos RLS aplicados a cada tabla y archivo: administrador gestiona; profesional ve su agenda y lo necesario de sus clientes; cliente solo sus datos si se habilita cuenta. Autorización también en cada acción del servidor. No exponer credenciales de servicio al frontend. Revalidar entradas, limitar solicitudes automatizadas y registrar cambios relevantes sin guardar secretos en los registros.

Storage privado para referencias, URLs firmadas de duración limitada, validación de tipo y tamaño en servidor, política de retención. Portafolio público únicamente con autorización. Definir copias de base y archivos por separado y comprobar recuperación.

## Fase 3: tatuajes y comunicación

Valoración → cotización explícita con importe y condiciones → aceptación → fecha acordada → cita. Cada transición validada en servidor, con autor y fecha. Una etiqueta de estado no sustituye una cotización ni un bloqueo de agenda.

Correo transaccional y, si se acuerda, WhatsApp Business oficial. Cola de envío con reintentos e idempotencia. Mostrar fallos reales y permitir seguimiento. Una cita registrada no implica una notificación entregada.

## Fase 4: anticipos y pagos opcionales

Elegir proveedor según titular del comercio, requisitos y costos, por ejemplo Wompi en Colombia. Confirmar pagos mediante eventos firmados y estado verificado en servidor; nunca por el retorno del navegador. Gestionar expiración, devolución, conciliación y disponibilidad sin bloquear eternamente la agenda. Probar primero en sandbox.

## Fase 5: lanzamiento autorizado

Dominio y cuentas bajo titularidad acordada con el cliente, acceso delegado a ZENKO, contratos de servicios revisados por sus responsables. Completar pruebas funcionales, permisos, rendimiento, accesibilidad, respaldo y recuperación. Activar indexación y metadata pública con el dominio definitivo. Desplegar únicamente con autorización explícita.

## Cron de avisos y Web Push del equipo

`POST /api/cron/tick` (cada 5 min) envía recordatorios de cita (24 h y 2 h), la invitación a reseña (1–3 h después de una cita finalizada, solo si existe `GOOGLE_REVIEW_URL`), el resumen diario al dueño (8:00–8:14 Bogotá, con citas por barbero e ingresos estimados) y expira reservas sin pago. Exige `Authorization: Bearer <CRON_SECRET>`; sin `CRON_SECRET` responde 401. Es idempotente: `notifications` (y `daily_digest` para el resumen) impide duplicados y Resend recibe una clave de idempotencia por aviso.

### Variables en Hostinger

- `CRON_SECRET`: mínimo 32 caracteres. `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
- `GOOGLE_REVIEW_URL`: enlace https de reseñas del perfil de Google. Vacío: no se envía el correo de reseña.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:` del negocio): `npx web-push generate-vapid-keys`. Generar claves propias de producción; si se cambian, cada dispositivo debe volver a activar los avisos.

### Programación en Supabase (pg_cron + pg_net + Vault)

La migración `20261021000013_cron_avisos.sql` crea la tarea `elite-cron-tick`. Mientras no existan los secretos, no hace nada. Para activarla, en el SQL Editor del proyecto de producción (con autorización):

```sql
select vault.create_secret('https://elite-barber-tatto.com', 'cron_url', 'URL base del sitio para el cron');
select vault.create_secret('<mismo valor que CRON_SECRET en Hostinger>', 'cron_secret', 'Secreto del cron de avisos');
```

`cron_url` es la URL base, sin `/api/cron/tick`. Para cambiar un valor: `select vault.update_secret((select id from vault.secrets where name = 'cron_secret'), '<nuevo>');`. Comprobar: `select * from cron.job_run_details order by start_time desc limit 5;` y `select status_code, content from net._http_response order by created desc limit 5;`.

### Web Push del equipo

Cada miembro abre el panel en su dispositivo y pulsa «Recibir avisos en este dispositivo». Avisa al dueño y al barbero afectado al confirmarse una reserva, al entrar un turno a la fila y al llegar una solicitud de tatuaje (solo dueño). En iPhone solo funciona con la app instalada en la pantalla de inicio (iOS 16.4+). Las suscripciones caducadas se borran solas.
