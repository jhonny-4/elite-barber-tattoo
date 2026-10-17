# Elite Barber & Tattoo

Proyecto independiente de ZENKO para Elite Barber & Tattoo, Cartagena.

Estado: base funcional previa al diseño premium. Capturas revisadas en el chat, pendientes de importar como archivos; información comercial provisional.

## Ejecutar localmente

Node.js 24 y npm. En esta carpeta ejecutar `npm ci`, después `npm run dev` y abrir http://localhost:3000. Para producción local: `npm run build` y `npm start`. Comprobaciones: `npm run typecheck` y `npm test`.

## Estructura

- `src/app`: pantalla técnica provisional y metadata; se sustituirá durante el diseño High.
- `src/domain`: catálogo, tipos y validaciones independientes de la interfaz.
- `src/lib`: persistencia local versionada.
- `tests`: pruebas de cruces, cancelaciones y validación.
- `docs/CONTINUIDAD.md`: decisiones, datos provisionales y plan para diseño y producción.

No hay servidor de reservas ni autenticación. Usar datos ficticios. El panel es público y los datos solo se guardan en el navegador. La comprobación local de cruces no garantiza concurrencia real. Los archivos de referencia no se suben: solo se conserva su nombre. No hay integraciones externas activas.

## Imágenes

Crear `public/media/brand`, `public/media/barber` y `public/media/tattoo` al importar los archivos originales disponibles. Mantener originales sin editar y variantes web separadas. No atribuir cortes a un barbero sin confirmación. Documentar cada archivo y reemplazarlo sin cambiar las reglas del dominio. Los adjuntos del chat aún no están importados.

Un único local: @elite_barber_tattoo. Jean Carlos (@jeancarlostattoo19) es el artista de tatuajes del mismo establecimiento.

## Colaboración

Codex y Claude Code deben trabajar en ramas distintas, revisar cambios antes de integrarlos y evitar editar simultáneamente los mismos archivos. No subir credenciales ni archivos privados de clientes. No publicar ni desplegar sin autorización.

## Alcance acordado

Experiencia premium responsive, galería de cortes y tatuajes, perfil Jean Carlos, reservas de barbería, solicitudes de valoración de tatuaje y panel demo. Las simulaciones deben identificarse. No inventar precios, horarios ni datos comerciales.

La base usa Next.js y TypeScript. PostgreSQL/Supabase queda previsto para producción. La composición premium, Tailwind, galería y animación se implementarán en la etapa High solicitada por el usuario.
