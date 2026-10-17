# Continuar Elite Barber & Tattoo

Este repositorio ya contiene el proyecto. No reconstruirlo desde cero.

**Leer primero `PROMPT_CLAUDE.md`: contiene el encargo completo, las prioridades y el estado vigente para continuar en la nube.**

## Abrir y ejecutar

- Rama de partida: `main`, que contiene el proyecto completo. Repositorio público.
- Leer `README.md`, `docs/v4/VALIDACION.md` y `AGENTS.md` antes de modificar.
- Código en la raíz: `src/`, `public/`, `tests/`, `docs/`. No crear otra aplicación dentro de otra carpeta.
- Node.js 24. Ejecutar `npm ci` y `npm run dev`. Para PWA: `npm run build` y `npm start`.

## Cliente y arquitectura

Elite Barber & Tattoo es un único local en Cartagena. @elite_barber_tattoo es la marca; @jeancarlostattoo19 es Jean Carlos, tatuador del mismo local. Conservar logos y fotos. No inventar equipo, experiencia, testimonios ni detalles de imágenes.

Corte $20.000 y corte con barba $25.000 COP son provisionales. Barbero 1–3 y jornadas son de ejemplo. Los tatuajes requieren evaluación, sin confirmación automática. Dirección en `src/domain/business.ts`. WhatsApp provisional: +57 301 232 9541.

Next.js App Router, React, TypeScript, Tailwind y Three.js. Reglas en `src/domain/`; persistencia y comandos en `src/server/demo/`; contratos en `src/services/`. `useDemo` usa HTTP + SSE. Un proceso servidor guarda en `var/demo/state.json`, excluido de Git. El antiguo localStorage se conserva, pero no crea reservas V4.

Hay reservas, primer disponible, reprogramación, cancelación, jornadas, pausas, turnos QR/presenciales, monitor público, gestión de tatuajes y avisos simulados. Acceso de propietario/barbero sin autenticación real: no usar datos reales.

## Continuar

Acuerdo: funciones con Light; luego acabado visual con High. Base funcional comprobada con 20 pruebas, build y lint. Sigue revisar alineación, contraste, 3D, animaciones y marcas originales. GSAP no está instalado: incorporarlo cuando corresponda, respetando movimiento reducido y rendimiento.

Pendientes físicos: instalación Android/iOS, escaneo QR con cámara y sincronización desde dos teléfonos. HTTP por IP privada no garantiza instalación PWA. No confirmar operaciones offline.

El usuario autorizó subir esta entrega a GitHub; no futuros merges, despliegues o cambios de visibilidad. No conectar servicios reales sin nuevas instrucciones. Conservar historial, sin force push. Nunca subir `.env`, credenciales o `var/demo`.

Al modificar implementación: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build`. Mantener documentadas simulaciones y limitaciones.

## Actualización del proyecto

Repositorio público. Usar main: contiene el proyecto completo. Es el proyecto real en desarrollo; la versión de presentación mantiene flujos simulados, almacenamiento JSON local y no tiene base de datos de producción ni autenticación real. El mapa integrado y el acabado premium siguen pendientes.

