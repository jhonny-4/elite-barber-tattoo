# Registro de material visual

| Archivo local                      | Fuente                                         | Uso                                 |
| ---------------------------------- | ---------------------------------------------- | ----------------------------------- |
| `reference/elite-logo-source.jpeg` | IMG_3498.jpeg, adjunto del chat de referencia  | Logo Elite, encuadre en navegador   |
| `reference/jc-logo-source.png`     | IMG_3497.png, adjunto del chat de referencia   | Monograma JC, encuadre en navegador |
| `reference/tattoo-source.jpeg`     | IMG_3496.jpeg, captura de @jeancarlostattoo19  | Tatuajes provisionales              |
| `reference/barber-source.jpeg`     | IMG_3495.jpeg, captura de @elite_barber_tattoo | Cortes provisionales                |

Se conservaron las capturas sin editar. Los `viewBox` del componente `Photo` muestran un área de la imagen original. No hay reconstrucción generativa, retoque del tatuaje ni ampliación 4K. Las marcas de interfaz aún visibles en algunas capturas se sustituyen al recibir fotografías individuales.

## Sustitución

1. Guardar logos originales autorizados en `public/media/brand/` y fotografías autorizadas en `public/media/barber/` y `public/media/tattoo/`.
2. Preparar variantes web fuera del repositorio si se requiere procesamiento. Conservar una copia original aparte. No subir referencias privadas de clientes a `public/`.
3. Añadir `original` en el elemento correspondiente de `src/domain/media.ts`; actualizar título, categoría y encuadre real. El atributo `position` admite un valor CSS como `50% 30%`.
4. Reemplazar el contenido de `Brand` y `JCMark` por los archivos finales. Mantener textos alternativos.
5. Revisar portada, filtros, ampliación y móvil. Retirar las etiquetas de captura provisional únicamente cuando corresponda.

No atribuir fotografías de cortes a un miembro concreto del equipo sin confirmación. No usar fotos generadas como evidencia del trabajo del establecimiento.
