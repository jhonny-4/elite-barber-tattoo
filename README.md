# Elite Barber & Tattoo · ZENKO

> **Estado vigente (21/10/2026): leer [docs/ESTADO_ACTUAL.md](docs/ESTADO_ACTUAL.md).** Hostinger está conectado a GitHub con despliegue automático. Reservas, panel, fila, monitor y tatuajes usan Supabase; acceso real con roles. Resend tiene cola y reintentos. Corte $25.000 / corte con barba $32.000, ambos 45 min. Galería actualizada desde el ZIP organizado. Lo siguiente conserva información histórica y no sustituye ese estado.

Versión navegable de presentación del proyecto real. Un único local en Cartagena: Elite es la marca del negocio y Jean Carlos es su dueño y tatuador. Interfaz blanca y negra con acentos rojos y colores originales de redes, con logos 3D, animación de scroll, galería, agenda, solicitudes, turnos y panel administrativo.

## Ejecutar

Node.js 24 y npm:

```sh
npm ci
npm run dev -- --hostname 0.0.0.0
```

Abrir `http://localhost:3000`. Desde el celular en el mismo Wi-Fi: `http://IP-DEL-COMPUTADOR:3000`. Mantener el servidor encendido; no abrir puertos del router.

Para revisar el build y la PWA:

```sh
npm run build
npm start -- --hostname 0.0.0.0
```

La instalación PWA requiere localhost o HTTPS. La web por IP local funciona sin instalación.

## Recorrido

| Ruta | Contenido |
| --- | --- |
| `/` | Elite 3D, quiénes somos, servicios, galería filtrable, equipo y mapa |
| `/jean-carlos` | Monograma JC 3D, identidad del artista y portafolio |
| `/reservar` | Servicio, profesional, fecha, horario, contacto y revisión |
| `/tatuaje` | Solicitud de valoración manual y referencia opcional de hasta 1 MB |
| `/turnos` | Registro, comprobante y seguimiento de turno |
| `/pantalla-turnos` | Monitor público sin contactos de clientes |
| `/administracion` | Panel administrativo: resumen, agenda, fila, solicitudes, clientes, equipo y avisos |
| `/barbero` | Agenda y atención filtradas por profesional |
| `/offline` | Estado sin conexión |

El equipo entra por `/ingresar` con cuentas reales de Supabase Auth (dueño y barberos, solo por invitación). Crear cuentas: `node --env-file=.env.local scripts/crear-cuenta.mjs dueno|barbero <correo> [slug]`. Base local: `npm run db:start`, `npm run db:test`.

## Qué funciona y qué se simula

Las reservas y turnos de prueba se guardan; se validan conflictos, duraciones, jornadas, descansos, ausencias e idempotencia. El panel permite reprogramar, cancelar y gestionar atención. Los tatuajes quedan pendientes de valoración, con transiciones manuales; no se convierten automáticamente en citas.

Localmente se usa JSON en `var/demo/` con escritura atómica, referencias separadas y sincronización SSE/sondeo. En Netlify existe un adaptador de Blobs para la presentación; no es PostgreSQL ni una solución transaccional de producción. Ver [Netlify](docs/NETLIFY.md).

No hay pagos ni mensajes automáticos. WhatsApp e Instagram son enlaces. Precios de referencia: corte $20.000 COP y corte con barba $25.000 COP. Barbero 1–3 y sus horarios son provisionales. El WhatsApp temporal autorizado pertenece al usuario, no al establecimiento.

## Estructura

```text
src/app/                  Rutas, metadata y API
src/components/home/      Secciones de portada
src/components/three/     Motor 3D, encuadre, luz y fallbacks
src/components/gallery/   Visor y utilidades de galería
src/components/booking/   Pasos y resumen de reserva
src/components/admin/     Panel administrativo
src/components/queue/     Turnos y monitor
src/styles/               Tokens, base, áreas y acabado premium y acentos rojos
src/domain/               Reglas de negocio y catálogo
src/services/             Contratos y sincronización
src/server/               Persistencia y comandos
public/media/             Material visual
tests/                    Pruebas de dominio e integración
recovery/                 Respaldo original de Claude, fuera de compilación
```

## Reemplazar material

Mantener los originales en `public/media/reference/`. Las fotos actuales son capturas de referencia, sin promesa de calidad 4K. Actualizar `src/domain/media.ts` con las fotos finales y sus variantes responsive, proporciones, texto alternativo y encuadre. Usar fotografías completas, sin recortar tatuajes.

Los vectores reconstruidos están en `src/components/brand/logo-data.ts` y `public/media/brand/`. Cuando lleguen los oficiales, sustituir sus trazados y revisar las cajas de encuadre de `src/components/three/presets.ts`; regenerar también iconos PWA e imagen social. Ver [activos](docs/ACTIVOS.md).

## Fotos nuevas y carruseles

Guardar las imágenes en `public/media/tattoos/nuevos/`, con nombres como `anubis-01.jpg`, `anubis-02.jpg` y `faith-01.jpg`, `faith-02.jpg`. Ejecutar:

```sh
npm run import:tattoos
```

El importador crea WebP sin ampliar ni alterar el diseño y genera `src/domain/portfolio-extra.json`. Cada prefijo agrupa un tatuaje en una tarjeta con controles de carrusel y varias vistas en el visor. El encuadre se conserva completo. El ZIP de Jean Carlos ya se incorporó: 9 fotografías de 6 tatuajes nuevos. Anubis tiene 3 vistas y el retrato Faith tiene 2. La segunda captura del Joker era la misma foto con menor resolución y se excluyó. Los originales recibidos se conservan en `nuevos/`; `manifest.json` define títulos y encuadres. El lettering usa un viewport para ocultar las barras de Instagram sin recortar el tatuaje.

Ubicación corregida a **Los Ejecutivos, Cartagena, Colombia**. El mapa muestra el sector, sin afirmar un pin exacto del local. El QR del monitor y del panel apunta a `/reservar`, incluida la migración del enlace guardado en este navegador. El acceso a la fila presencial continúa en `/turnos`.

## Verificación

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

La integración pasó 52 pruebas. Se revisaron portada y navegación en móvil, tableta y escritorio; reserva completa con validación y cancelación desde el panel; filtros y visor de tatuajes; monograma 3D y ausencia de desbordamiento horizontal en las vistas revisadas. Las animaciones respetan movimiento reducido y WebGL dispone de respaldo vectorial.

## Producción posterior

PostgreSQL/Supabase con transacciones y restricciones de agenda; cuentas y roles autorizados en servidor; referencias privadas; auditoría y protección de formularios. Después, pagos y notificaciones con webhooks verificados. La versión actual sirve para presentar y validar el proyecto, usando datos ficticios. Ver [plan de producción](docs/PRODUCCION.md).
