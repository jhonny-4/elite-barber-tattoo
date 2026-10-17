# V4 — verificación funcional

## Alcance

Fase funcional con Light sobre el proyecto existente. No es una entrega de producción ni la revisión visual final con High. La agenda V4 se guarda en el servidor local; los datos anteriores del navegador no se migran ni se borran automáticamente.

## Pruebas automatizadas

20 pruebas aprobadas: nueve anteriores más reglas V4, servidor y política offline.

- Cruces parciales, horarios contiguos y profesionales distintos.
- Liberación al cancelar, duración de servicios, fechas y horizonte de agenda.
- Jornadas, almuerzo, descansos, ausencias y profesional inactivo.
- Primer disponible y prevención de cita simultánea para el mismo contacto.
- Reprogramación conservando ID y validando colisiones del profesional y contacto.
- Rechazo de jornadas que invaliden citas existentes.
- Turnos numerados, contacto único y transiciones llamar → iniciar → finalizar.
- Respeto de citas y descansos; espera orientativa.
- Solicitudes de tatuaje pendientes, estados consecutivos y ausencia de cita automática.
- Idempotencia, escrituras concurrentes, persistencia, emisión de cambios y reset.
- Validación de origen LAN contra el encabezado Host, no contra la dirección interna de Next.js.
- Política del service worker: fallback offline, sin caché de API ni cola de escrituras.

Las pruebas de persistencia utilizan una carpeta temporal independiente. El sandbox Windows negó reemplazar un archivo temporal existente; fuera del sandbox pasaron las 20 pruebas. Se mantuvo la escritura atómica.

## Navegador

Se comprobaron dos clientes de navegador del mismo computador contra el mismo servidor:

- QR registra `E-001`; el panel recibe el turno.
- El almuerzo bloquea la llamada; al modificar la jornada demo cambia la disponibilidad.
- Llamada recibida en la pantalla del cliente sin recargar, mediante SSE.
- Monitor público muestra número y barbero; no nombres ni contactos.
- Inicio y finalización actualizan cliente, panel y monitor.
- Registro manual presencial crea un turno en la misma fila.
- Reserva con primer disponible, selección de fecha/hora, contacto, revisión y guardado compartido.
- Reprogramación y cancelación desde administración.
- Solicitud de tatuaje recibida como pendiente y avance manual a evaluación/cotizada, sin crear cita ni calcular importe.
- Anchos CSS de 390 y 768 px comprobados sin desbordamiento horizontal en turnos/reservas; panel móvil con navegación interna desplazable. También se revisó escritorio.

La prueba con dos clientes de navegador no equivale a dos teléfonos físicos. El escaneo con cámara, las condiciones reales de la red Wi-Fi y la instalación Android/iOS siguen pendientes de comprobación en esos dispositivos.

## PWA y contexto

Manifest con iconos PNG derivados del logo original, standalone, página offline y actualización mediante botón. Registro del service worker solo en producción y contexto seguro. La política offline está probada; no se afirman instalaciones en dispositivos físicos. HTTP por IP privada permite la web y la fila, pero no garantiza una instalación PWA.

## Límites antes de producción

- Permisos y acceso de propietario/barbero simulados. La API de gestión no tiene autenticación real. Usar datos ficticios, también en referencias.
- Un proceso Next.js local; la serialización no sustituye PostgreSQL ni transacciones distribuidas.
- Estimaciones de espera basadas en duraciones y agenda demo; no son compromisos de atención.
- Sin cobros, correos reales, WhatsApp automático o notificaciones push.
- Diseño con High, GSAP si corresponde y revisión visual completa quedan para la fase siguiente acordada.
- No se hizo push, merge ni despliegue V4.
