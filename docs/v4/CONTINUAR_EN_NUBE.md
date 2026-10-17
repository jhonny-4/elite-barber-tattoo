# Abrir el proyecto en Claude Code

Repositorio: `jhonny-4/elite-barber-tattoo`.

Seleccionar `feat/premium-pwa-v4`: contiene el proyecto completo. Antes de esta entrega, `main` solo tenía README y `.gitignore`. No es necesario crear otra web ni otra carpeta.

1. Abrir el repositorio en Claude Code y seleccionar la rama V4, o crear una rama desde ella.
2. Leer `CLAUDE.md` y el README.
3. Usar Node.js 24 y ejecutar `npm ci`.
4. Ejecutar `npm run dev`; para PWA, `npm run build` y `npm start`.
5. Revisar `docs/v4/VALIDACION.md`: las pruebas físicas pendientes no deben darse por realizadas.

Para un checkout vacío basado en main, revisar primero cambios locales y luego:

```sh
git fetch origin
git switch --track origin/feat/premium-pwa-v4
npm ci
```

Si la rama ya existe localmente, usar `git switch feat/premium-pwa-v4`. No usar reset, borrar archivos ni crear otra aplicación para corregir una selección de rama.

La agenda local y sus datos de ejemplo no se suben a GitHub. Una nueva instancia comienza vacía. Las imágenes estáticas autorizadas sí están en el repositorio. La persistencia de una sesión de nube temporal no es un backend de producción.

La fase siguiente acordada es el acabado visual con High. Revisar el PR antes de integrar en main; no hacer merge ni desplegar sin autorización específica.
