# Continuidad completa — Elite Barber & Tattoo / ZENKO

**ACTUALIZACIÓN VIGENTE 21/10/2026:** lee primero `docs/ESTADO_ACTUAL.md` y mantenlo actualizado en cada entrega. Las instrucciones y pendientes históricos de este documento quedan subordinados a ese estado: Hostinger autodespliega desde GitHub; Supabase, panel real, fila, tatuajes y Resend con cola/reintentos ya están conectados. El usuario autorizó publicar esta entrega en GitHub. No reconstruir ni volver a la demo en producción.

Retoma este repositorio como desarrollador full stack senior y director de diseño. Trabaja sobre el código existente; no reconstruyas la aplicación. Comunica en español, con mensajes breves y decisiones concretas.

## Estado vigente y arranque

- Repositorio público: `jhonny-4/elite-barber-tattoo`. `main` contiene el proyecto completo. Adjunta este repositorio a la sesión de Claude con acceso de escritura; si no está disponible, identifica el permiso que falta, sin crear otro repositorio.
- Es el proyecto real en desarrollo. La versión actual se mostrará al cliente como avance, con procesos simulados y sin base de datos de producción. Este documento prevalece sobre las referencias históricas a main vacío o repositorio privado.
- Lee `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/ACTIVOS.md`, `docs/PRODUCCION.md` y `docs/v4/VALIDACION.md`. Consulta las guías locales de Next indicadas por AGENTS antes de editar.
- Revisa estado Git y cambios remotos antes de empezar. Crea una rama de trabajo desde main actualizado, sin sobrescribir trabajo ajeno. Conserva historial; no uses force push.
- Node.js 24, `npm ci`, `npm run dev`. Next.js App Router, React, TypeScript, Tailwind, Three.js; conservar arquitectura modular.
- El usuario separó funciones con Light y diseño con High. La base funcional está hecha; ahora falta el acabado visual premium. No afirmes haber cambiado el modelo: usa el disponible y comunica si el usuario debe cambiarlo.

## Identidad y contenido confirmado

- Un único local: Elite Barber & Tattoo, Cartagena. `@elite_barber_tattoo` es la marca. Jean Carlos es el tatuador y dueño, dentro del mismo establecimiento; su portafolio artístico es `@jeancarlostattoo19`.
- Logo principal Elite geométrico y monograma JC gótico. Conservar su identidad; no sustituirlos por marcas inventadas. Reforzar la presencia de Elite a lo largo de toda la web.
- Dirección facilitada: Cra. 59b #mz50-24, barrio Chiquinquirá, Cartagena de Indias, Bolívar. Centralizada en `src/domain/business.ts`.
- WhatsApp oficial del negocio: `https://wa.me/573016697908` (+57 301 669 7908). Instagram de marca: `https://www.instagram.com/elite_barber_tattoo/`; artista: `https://www.instagram.com/jeancarlostattoo19/`. Son enlaces externos, sin automatización integrada.
- Corte $20.000 COP; corte + barba $25.000 COP: precios provisionales. Barbero 1, 2 y 3 son nombres temporales. Horarios/duraciones actuales son ejemplos. Tatuajes se cotizan según evaluación del diseño, nunca con confirmación automática.
- No inventar horarios reales, experiencia, estadísticas, reseñas, integrantes, precios adicionales, pagos o datos de contacto.
- Fotos y logos actuales son referencias/capturas, reemplazables cuando lleguen originales. No prometer detalle 4K por reescalar ni generar modificaciones que falseen los cortes o tatuajes reales.

## Prioridad 1 — diseño premium completo

El usuario quiere una primera versión visual cercana al producto final, única, profesional y organizada, sin aspecto de plantilla. Trabaja primero una dirección visual coherente y aplícala a todas las rutas.

1. Interfaz exclusivamente blanca, negra y grises, con alto contraste. Sin acentos verdes. Mantener colores naturales de las fotografías. Tipografía premium legible, jerarquías claras y espaciado consistente.
2. Centrar títulos, textos, imágenes y tarjetas en las secciones de presentación, como pidió el usuario; conservar legibilidad y orden en formularios, agenda y tablas administrativas.
3. Hero/banner protagonista con el logo original de Elite en 3D: relieve, iluminación y movimiento elegantes, profundidad real o convincente y animación fluida. Mejorar la escultura existente, sin tapar contenido ni cortar el logo en móvil. No sustituirlo por objetos genéricos.
4. Todos los botones con un sistema coherente de relieve/3D, estados hover, focus, pulsación, carga y disabled. Incluir WhatsApp e Instagram visibles en el inicio. Garantizar teclado y foco visible.
5. Scroll y transiciones cuidados: revelados, capas, profundidad y parallax moderado. Respetar `prefers-reduced-motion`, desplazamiento nativo y rendimiento móvil; no secuestrar el scroll. GSAP solo si aporta valor: actualmente no está instalado.
6. Sección Jean Carlos y monograma JC con mayor presencia y animaciones 3D coherentes con Elite. Dejar clara la relación artista/local.
7. Galería premium filtrable barbería/tatuajes, tarjetas flotantes ajustadas a la proporción completa de cada foto, sin recortar tatuajes. Lightbox accesible con cierre, teclado y navegación. Mantener los dos cortes seleccionados en `public/media/barber/barber-texture.png` y `barber-precision.png`; no volver a usar el corte descartado como imagen destacada.
8. Más contenido útil de barbería y «Quiénes somos», basado en hechos confirmados. Servicios, precios provisionales, equipo temporal y llamados a reservar bien organizados.
9. Calendario elegante con profundidad/3D, selección clara, disponibilidad, días y horas deshabilitados con explicación. Animaciones sin obstaculizar la reserva.
10. Mejorar footer/CTA «Tu próxima versión», ubicación, contacto y contraste, manteniendo identidad de Elite y crédito de ZENKO.
11. Revisar inicio, servicios/portafolio, Jean Carlos, reservas, solicitudes de tatuaje, equipo, panel, vista barbero, turnos y monitor. Nada debe quedar con diseño provisional inconexo.

## Prioridad 2 — mapa integrado (pendiente expreso)

Actualmente existe dirección y enlace a Google Maps; falta el mapa dentro de la página. Añade una sección de ubicación premium responsive con mapa integrado, dirección y botón «Cómo llegar». Usa carga diferida, título accesible y fallback/enlace si falla. No hardcodear claves ni atribuir un pin exacto a la dirección sin verificarlo. Si no hay URL/pin del negocio confirmado, presenta la búsqueda por dirección como referencia y deja su reemplazo centralizado. No bloquear el resto del trabajo por este dato.

## Prioridad 3 — preservar y pulir funciones

Ya existen reservas por servicio/profesional/primer disponible/fecha/hora, reprogramación, cancelación, jornadas, pausas, ausencias, turnos QR y presenciales, monitor público, solicitudes de tatuaje, clientes agrupados y notificaciones simuladas. No declararlas pendientes ni reescribirlas sin revisar.

- Profesionalizar visualmente el registro de reserva de cuatro pasos, resumen, validaciones, errores, carga, éxito y recuperación. Diferenciar cita de barbería de solicitud de evaluación de tatuaje.
- Las reglas de conflictos existentes funcionan en un único proceso servidor. Preservar idempotencia y comprobaciones de agenda; no presentarlas como garantía distribuida de producción.
- Solicitud de tatuaje: referencia opcional, estado inicial pendiente, evaluación manual y estados visibles. No cobrar, calcular precio real ni reservar automáticamente.
- Hacer el panel administrativo fácil de localizar durante la presentación. El usuario no encontraba el acceso: comprobar enlaces y navegación a `/administracion`, alias `/gestion`. Mejorar resumen, agenda, filtros, citas, clientes, profesionales, jornadas, solicitudes y notificaciones con estados vacíos claros.
- Explicar en la interfaz/demo que el acceso actual de propietario/barbero es simulado. En producción solo Jean Carlos/roles autorizados verán gestión mediante autenticación y autorización en servidor. No afirmar que ocultar un enlace o sessionStorage protege datos.
- QR real generado; monitor público solo número/barbero/servicio/estado, sin contactos. La espera es estimada. URL del QR configurable para el origen de presentación.
- No confirmar operaciones sin conexión. Mantener avisos honestos de fallos y offline, sin pagos, correos, WhatsApp automático ni push ficticiamente integrados.

## Arquitectura y límites actuales

Reglas: `src/domain/`; comandos/persistencia: `src/server/demo/`; contratos/adaptadores: `src/services/`; UI: `src/components/`; rutas: `src/app/`. `useDemo` sincroniza por HTTP + SSE y polling. Datos de presentación en `var/demo/state.json`, ignorado por Git. La nueva sesión de nube comienza vacía; datos locales previos no viajarán con Git.

Ese JSON es almacenamiento local de un servidor, no PostgreSQL ni persistencia fiable de un entorno efímero/serverless. API de gestión y roles aún sin autenticación real: usar exclusivamente datos ficticios. Repositorio público no significa aplicación desplegada. No desplegar, conectar Supabase, crear cuentas, cobrar ni enviar mensajes sin autorización posterior. No modificar otros proyectos ZENKO ni subir `.env`, tokens, datos personales o estado local.

PWA existente: manifest, iconos, offline y actualización. No cachear API ni encolar reservas offline. Instalación requiere contexto seguro; HTTP de IP privada no garantiza instalación. No dar por comprobado Android/iOS real.

## Validación y entrega

Tras los cambios, ejecutar `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Históricamente pasaron 20 pruebas, lint y build; reporta resultados nuevos, no copies los anteriores como si acabaran de ejecutarse.

Revisar navegación y UI en móvil, tablet y escritorio; contraste, foco, teclado, movimiento reducido, ausencia de desbordamiento, fotos completas, logo 3D, calendario y panel. Probar reservas/conflictos/reprogramación/cancelación, tatuajes, estados vacíos, errores y offline. Adjuntar capturas si el entorno lo permite. Escaneo QR con cámara, sincronización entre dos teléfonos físicos e instalación Android/iOS siguen pendientes; no fingir verificación si no tienes dispositivos.

Actualizar README, activos reemplazables y documentación del estado final. Eliminar instrucciones contradictorias sobre main vacío/privado. Entregar resumen breve: cambios, validaciones, límites y siguientes pasos. Guardar trabajo en una rama y preparar PR revisable; no desplegar ni hacer merge sin autorización.

## Fases posteriores, solo plan por ahora

1. Confirmar con Jean Carlos nombres/fotos originales, horarios, duraciones, precios, número definitivo, pin Google Maps y políticas de reserva/cancelación.
2. Diseñar PostgreSQL/Supabase: clientes, perfiles/roles, profesionales, servicios, jornadas, ausencias, citas, turnos, solicitudes/referencias, estados y auditoría. Transacciones/restricciones para impedir dobles reservas entre instancias.
3. Autenticación real, autorización servidor/RLS, almacenamiento privado de referencias, validación, límites de carga y protección de datos.
4. Notificaciones y pagos reales solo después de definir proveedor, permisos, credenciales y reglas comerciales.
5. Despliegue autorizado, dominio/HTTPS, backups, observabilidad y validación operativa.

Empieza inspeccionando el repositorio y explica brevemente las decisiones visuales. Después implementa el diseño y el mapa, conservando la base funcional. No te limites a proponer un plan.
