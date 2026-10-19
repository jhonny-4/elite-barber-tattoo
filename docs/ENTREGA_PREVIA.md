# Vista previa integrada · 18 de octubre de 2026

Se recuperó el trabajo disponible de los siete módulos de Claude Code y se integró en la aplicación: portada, galería y artista, reserva/tatuaje, motor 3D, administración, turnos/PWA y adaptación de almacenamiento.

Los archivos largos de booking y administración se recuperaron completos. Los vectores Elite y JC, las variantes WebP y los iconos se regeneraron con el proceso original conservado. Se completaron importaciones, errores HTTP, escritura atómica compatible con Windows y estilos; el acabado público se ajustó a blanco, negro y gris.

## Comprobaciones realizadas

- Compilación de producción, TypeScript y lint: correctos.
- 46 pruebas de dominio, conflictos, idempotencia, referencias, almacenamiento, sincronización y PWA: correctas.
- Navegación revisada en anchos CSS aproximados de 355, 769 y 1440 px, sin desbordamiento horizontal en las vistas inspeccionadas.
- Reserva completa con datos ficticios, validaciones y comprobante; cita visible en el panel y cancelación comprobada.
- Galería filtrada, visor con imagen completa y cierre con Escape.
- Motor WebGL de Elite y JC en estado listo; el motor incluye pausa fuera de pantalla, limpieza y respaldo vectorial.
- Mapa por dirección y enlaces externos presentes; no se hicieron envíos por WhatsApp.

## Alcance real

Es la versión de presentación del proyecto en desarrollo. Los precios, nombres de barberos, duraciones y jornadas son de referencia. El panel y los permisos están simulados; usar datos ficticios. No hay pagos ni notificaciones reales y los tatuajes requieren valoración manual.

El archivo de respaldo `recovery/` preserva el material recuperado antes de la integración. Su informe de diferencias describe ese respaldo; las correcciones finales se encuentran en `src/` y en el historial de Git. No copiar `recovery/sources/` encima de la aplicación final.

Pendiente para producción: contenido original confirmado, autenticación/roles, PostgreSQL y restricciones transaccionales, archivos privados, notificaciones/pagos y verificación operativa en el proveedor. Ver `PRODUCCION.md` y `NETLIFY.md`.


## Actualización de la presentación

- WhatsApp verde, Instagram con degradado original y acentos rojos sobre la base monocroma.
- Inicio enlazado, instalación visible en la barra superior, marca Elite de fondo y tipografía de títulos con segundas líneas al mismo tamaño.
- Formulario de sesión de prueba con logo 3D, validación, mostrar/ocultar contraseña y datos públicos de ejemplo. No es autenticación real ni protege las rutas de API.
- Monitor con áreas de cabecera explícitas para evitar la superposición del reloj y el título; animaciones de tarjetas y estados con respeto a movimiento reducido.
- QR directo a reservas y ubicación corregida a Los Ejecutivos (mapa del sector).
- Carruseles de ángulos de un mismo trabajo y script de importación listos. Pendiente incorporar los archivos de las nuevas fotos; no llegaron al sistema de archivos de esta sesión.
- API publicada comprobada: lectura 200, creación ficticia persistida, reintento sin duplicación y conflicto 409. Se canceló la cita técnica y se liberó el horario. El timeout se resolvió usando el fetch capturado por el adaptador de Netlify, región compatible y SDK externo al bundle de Next.
- TypeScript, lint, 46 pruebas y build correctos tras la actualización principal. La conexión del navegador de automatización se cerró antes de la nueva inspección visual; la validación responsive visual anterior corresponde al acabado previo.


## Portafolio recibido por ZIP

Se recibieron 10 capturas: 9 fotografías útiles, agrupadas en 6 trabajos nuevos; la décima repite el Joker con menor resolución. Anubis agrupa 3 ángulos y Faith 2; Joker, mujer/cuervo, Zeus/águila y lettering tienen una vista. Se conservan los JPEG recibidos y se publican versiones WebP sin ampliación. Las barras de Instagram del lettering se ocultan mediante viewport, conservando íntegro el tatuaje.

El visor abre el ángulo seleccionado en la tarjeta. En escritorio la foto ocupa el alto disponible, con información lateral. Los controles se colocan debajo de cada tarjeta y se revisaron en móvil (355 px CSS), tableta (769 px) y escritorio. También se comprobó visualmente la cabecera del monitor: título, reloj y fecha ya no se superponen. Se corrigió la selección de fotos de barbería para que añadir tatuajes no cambie esas imágenes por depender de índices numéricos.

## Inicio compacto y citas en el monitor

- Inicio con menos texto repetido, información ampliable y selección de galería: 4 tarjetas en móvil y 6 en escritorio; «Ver todos los trabajos» conserva el portafolio completo.
- Contramarcas Elite más visibles, reflejos suaves y botón flotante JC para volver arriba. Se respeta movimiento reducido.
- En móvil, iniciar sesión e instalar app están en la cabecera fija con controles de al menos 44 px.
- Una reserva no equivale a una llegada. El día de la cita, el cliente puede registrar su llegada en la confirmación; el panel también ofrece «Registrar llegada». Después: «Llamar en pantalla» → «Iniciar atención» → «Finalizar». Iniciar directamente también muestra la cita en el monitor.
- Las citas usan códigos C y los turnos presenciales E. Se evita duplicar un contacto entre ambos. Las reservas futuras no entran en la fila de hoy; llamar/iniciar respeta horario y disponibilidad. Cancelar o reprogramar retira la llegada.
- El QR abre `/reservar`; no llama automáticamente ni incorpora voz o mensajes. El monitor comparte el estado del servidor, sin nombres ni teléfonos.
- Inicio de sesión de presentación; sin Supabase ni autenticación de producción. Las galerías personales de cada barbero quedan para cuando se reciban sus fotos e información.
- Validación: lint, 52 pruebas y build correctos. Incluye prueba HTTP con cliente que registra llegada y monitor independiente que consulta llamada, atención y cierre. Cabecera móvil, instalación, ausencia de desbordamiento y botón de subida revisados en navegador.
## Acabado visual final (19 de octubre)

Las 15 mejoras se concentran en `src/styles/final-effects.css`: llamados y atención en TV, scroll existente con bordes de luz progresivos, reflejo de logo, ambiente de contramarcas, transiciones entre secciones, sello de reserva Elite, visor cinematográfico, calendario, marco QR, menú por capas, colores sociales, pasos/progreso de reserva y trazo artístico. No se añadieron efectos a las tarjetas.

`BrandIntro` añade una presentación con capas SVG en perspectiva de 1,5 segundos al abrir el inicio; se recuerda por pestaña con sessionStorage. La salida tiene respaldo CSS y no intercepta clics ni bloquea la carga. Movimiento reducido conserva una presentación estática con salida suave. El objetivo es fluidez, sin prometer 60 FPS en cualquier hardware.

Se retiraron los enlaces al panel y a iniciar sesión de cabecera, menú, pie y confirmación de reserva. Jean Carlos puede abrir `/administracion` directamente. Esto no sustituye seguridad: el acceso sigue siendo una simulación y las API demo no están protegidas por roles reales. Autenticación en servidor, autorización y datos definitivos quedan para la fase de producción.