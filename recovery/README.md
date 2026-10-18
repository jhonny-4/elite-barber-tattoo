# Recuperaci?n parcial de Claude en la nube

Se rescataron 33 archivos completos: 23 desde el visor y el resto desde escrituras registradas en el historial importado por el comando oficial de Claude. El ZIP conserva fuentes; no es una aplicaci?n completa ni debe extraerse directamente sobre main. Algunos archivos corresponden a versiones intermedias.

La sesi?n de Claude dej? de permitir lectura/descarga: el visor inform? ?Esta sesi?n no est? disponible ahora mismo?. Faltan m?dulos de las ?reas, backend, vectores, recursos y configuraci?n de dependencias. No se afirma recuperaci?n completa, compilaci?n ni despliegue.

## Material

- `claude-cloud-partial.zip`: fuentes recuperadas sin datos de agenda ni credenciales.
- `manifest.json`: rutas, tama?os y hashes SHA-256.

## Pr?ximo paso

Reactivar el entorno de la sesi?n original y exportar el repositorio completo, incluidos cambios sin commit, excluyendo node_modules, .next, .git, .env y var/demo. Comparar con este respaldo antes de integrar.

El proyecto funcional sigue en main. No se cambi? Netlify ni se public? este c?digo incompleto.
