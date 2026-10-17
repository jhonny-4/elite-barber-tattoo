# Paso a producción

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
