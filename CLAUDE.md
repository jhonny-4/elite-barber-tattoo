# Elite Barber & Tattoo — instrucciones del proyecto

Proyecto **en producción**: https://elite-barber-tatto.com. Antes de cambiar nada, leer `docs/ESTADO_ACTUAL.md` y actualizarlo en cada entrega (lo leen Claude y Codex). No reconstruir desde cero: conservar arquitectura, identidad, fotos y permisos.

## Cliente
- Un único local en Cartagena. Marca `@elite_barber_tattoo`; Jean Carlos (`@jeancarlostattoo19`) es el dueño y tatuador. Barberos: Ivan, Jean Carlos y Nelson.
- Precios oficiales: corte $25.000 y corte con barba $32.000 COP, 45 min cada uno. Tatuajes: valoración y cotización manual, nunca confirmación automática.
- WhatsApp oficial +57 301 669 7908 y dirección en `src/domain/business.ts`.
- No inventar equipo, experiencia, testimonios ni detalles de imágenes. Conservar logos y fotos reales.

## Stack y arquitectura
- Next.js 16 (App Router; `proxy.ts` en lugar de middleware; leer `AGENTS.md` y `node_modules/next/dist/docs`), React 19, TypeScript estricto, Tailwind, Three.js. Node 24.
- **Supabase** (proyecto `oospdgjdjoiyolsyuizv`, us-east-1): Postgres con RLS, Auth (solo invitación; roles `dueno`/`barbero`), Storage, pg_cron + pg_net. Migraciones en `supabase/migrations/` (solo hacia adelante), pruebas pgTAP en `supabase/tests/database/`.
- **Resend** para correos (`src/server/notify/email.ts`, plantilla clara de marca: legible con el modo oscuro de Gmail). **Web Push** del equipo con VAPID. **Bold** listo y apagado (`BOLD_ENABLED`).
- **Hostinger** despliega solo desde `main` (Node, salida `standalone`, `next.config.mjs`).
- Reglas puras en `src/domain/`; servidor en `src/server/` (bookings, notify, payments, panel, auth); rutas en `src/app/api/`. El panel conserva el diseño original (`src/components/admin/*`) alimentado por `src/lib/use-panel.ts`.
- `src/server/demo/` y `/api/demo` son legado: en producción responden 410.

## Entornos y secretos
- Local: `npm run db:start` (puertos 553xx), `.env.local` con llaves locales. `npm run dev`.
- Producción: valores en `.env.hostinger` (ignorado por Git) y en las variables de Hostinger. Nunca usar `.env.hostinger` para pruebas locales: crearía datos reales.
- Nunca subir `.env*`, credenciales ni datos de clientes. Nunca pegar llaves secretas en el chat.

## Reglas de trabajo
- Producción (migraciones, cambios de datos, push a `main`) solo con aprobación explícita del usuario. Trabajar en `feat/produccion`; sin force push.
- Al modificar: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run db:test`.
- Pruebas automáticas: `npm run qa:prod` (solo lectura contra producción, no ocupa cupos) y `npm run qa:local` (flujo completo, se niega a correr si no es Supabase local).
- Cambios de base: migración nueva + prueba pgTAP + `supabase gen types` a `src/server/supabase/database.types.ts`.
