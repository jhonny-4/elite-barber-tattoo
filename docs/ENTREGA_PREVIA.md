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
