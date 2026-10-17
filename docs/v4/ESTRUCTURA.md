# Elite V4 — estructura y orden de trabajo

Estado actual: estructura implementada con servidor demo, comandos validados, persistencia, SSE, reservas compartidas, gestión de equipo, fila QR, monitor público y PWA. Ver README y `VALIDACION.md` para el alcance probado. Algunos `.gitkeep` se conservan como marcadores de la preparación inicial.

## Base conservada

Next.js App Router, React, TypeScript y Tailwind. Three.js y animaciones CSS/IntersectionObserver existentes. GSAP no figura actualmente entre las dependencias; su incorporación se evaluará en la fase visual. Las páginas, componentes, dominio, persistencia local y pruebas actuales permanecen en sus ubicaciones.

Los cambios pendientes anteriores quedaron guardados en el commit local `c171aba` de `feat/demo-foundation`. El trabajo V4 continúa en `feat/premium-pwa-v4`, sin push, merge ni despliegue. Este respaldo conserva el trabajo en curso; no certifica una nueva versión final validada.

## Carpetas nuevas

```text
src/
  app/
    turnos/                 futura inscripción por QR y consulta del turno
    pantalla-turnos/        futura pantalla pública sin datos personales
    barbero/                futura vista de atención del profesional
    offline/                futura pantalla sin conexión
    api/demo/
      bookings/             futuras reservas, cancelación y reprogramación
      queue/                futuros turnos y cambios de atención
      team/                 futuros horarios, pausas y ausencias
      events/               futura sincronización SSE
      reset/                futuro restablecimiento de la presentación
  components/
    admin/                  nuevos componentes de gestión
    queue/                  interfaz de fila, QR y monitor
    pwa/                    instalación, conexión y actualización
  domain/
    scheduling/             disponibilidad unificada y reglas de agenda
    queue/                  numeración, estados y asignación de turnos
    team/                   jornadas, almuerzos, descansos y ausencias
    notifications/          confirmaciones y notificaciones simuladas
  services/
    contracts/              interfaces para separar UI y datos
    adapters/               adaptadores de demo y futuro backend
  server/demo/
    store/                  persistencia local y escrituras serializadas
    events/                 revisiones y emisión de cambios
public/pwa/icons/           iconos derivados de logos originales
var/demo/                   futuros datos locales, excluidos de Git
tests/integration/          futuras pruebas de API y sincronización
tests/e2e/                  futuros recorridos de presentación
docs/v4/                    arquitectura y seguimiento de esta fase
```

## Orden funcional seguido con Light

1. Definir contratos y reglas de barberos, jornadas y agenda. Reutilizar el dominio existente.
2. Implementar servidor demo local como autoridad de reservas y turnos, con persistencia y prevención de duplicados. Migrar la UI de forma incremental, sin dos fuentes de verdad.
3. Añadir reservas con primer disponible, cancelación, reprogramación y registro presencial.
4. Incorporar fila QR, pantalla pública, acciones de atención y agenda unificada.
5. Conectar gestión y notificaciones simuladas mediante SSE. La pantalla pública solo mostrará números y estados.
6. Implementar PWA: manifest, service worker, iconos, modo offline y actualizaciones. Bloquear confirmaciones sin conexión. Instalar y comprobar únicamente bajo localhost o HTTPS; una IP privada por HTTP no garantiza instalación.
7. Validar reglas, recorridos, sincronización entre dispositivos, build, lint y pruebas existentes. Documentar qué sigue simulado.

## Después: mejoras visuales con High

Avisar al usuario cuando las funciones estén terminadas y revisadas. En esa fase se afinan composición, GSAP si corresponde, marcas originales animadas, 3D y microinteracciones. Mantener accesibilidad, movimiento reducido, contraste y estabilidad del layout.

No conectar servicios externos ni realizar envíos, pagos, autenticación de producción o publicaciones en esta fase. No subir datos locales ni credenciales a Git. El servidor demo no sustituye autenticación, permisos y PostgreSQL del producto final.
