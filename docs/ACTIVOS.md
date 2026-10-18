# Registro de material visual

## Fuentes originales (no editar)

| Archivo local | Fuente | Uso |
| --- | --- | --- |
| `public/media/reference/elite-logo-source.jpeg` | IMG_3498.jpeg, captura del perfil de @elite_barber_tattoo | Origen del vector del logo Elite |
| `public/media/reference/jc-logo-source.png` | IMG_3497.png, historia de @jeancarlostattoo19 | Origen del vector del monograma JC |
| `public/media/reference/tattoo-source.jpeg` | IMG_3496.jpeg, captura de @jeancarlostattoo19 | Tatuajes provisionales (recortes por `viewBox`) |
| `public/media/reference/barber-source.jpeg` | IMG_3495.jpeg, captura de @elite_barber_tattoo | Referencia de cortes |
| `public/media/barber/barber-texture.png` | Primer corte individual enviado por el usuario; 1290 × 1165 | Original de la foto de barbería |
| `public/media/barber/barber-precision.png` | Segundo corte individual enviado por el usuario; 1290 × 1514 | Original de la foto de barbería |

Las capturas se conservan sin editar. No hay reconstrucción generativa, retoque de tatuajes ni ampliación «4K».

## Derivados para la web

| Archivo | Cómo se obtuvo | Uso |
| --- | --- | --- |
| `public/media/brand/elite-logo.svg` y `src/components/brand/logo-data.ts` (`eliteLogo`) | Vectorización de la captura del logo: letras E·L·I·T·E y barras medidas y reconstruidas con esquinas exactas; «BARBER» y «TATTOO» trazados automáticamente (potrace). El peso de esas dos palabras queda algo mayor que en el original por la baja resolución de la captura (357 × 193 px). | Cabecera, pie, hero 3D, iconos, imagen para compartir |
| `public/media/brand/jc-monogram.svg` y `jcMonogram` | Vectorización automática del monograma JC a partir de la captura de 1130 × 1255 px | Página de Jean Carlos, solicitud de tatuaje, 3D |
| `public/media/barber/*-720.webp`, `*-1290.webp` | Versiones WebP (calidad 84) de los dos cortes, sin recorte ni retoque | `srcSet` responsivo (de 1,1 MB a 31–81 KB) |
| `public/pwa/icons/elite-192.png`, `elite-512.png`, `elite-maskable-512.png`, `apple-touch-icon.png` | Logo vectorial blanco sobre negro; la versión *maskable* deja la zona segura del 80 % | Manifest PWA e icono de iOS |
| `src/app/opengraph-image.jpg` (+ `.alt.txt`) | Composición con el logo vectorial y la tipografía del sitio, 1200 × 630 | Vista previa al compartir el enlace (WhatsApp, redes) |
| `src/components/brand/logo-data.ts` (`brandGlyphs`) | Glifos de WhatsApp e Instagram de Simple Icons (CC0) | Botones de contacto con colores de marca |

## Sustitución cuando lleguen los originales

1. Guardar los logos oficiales en vector en `public/media/brand/` y reemplazar las rutas de `src/components/brand/logo-data.ts` (mismo formato: `width`, `height` y `d`). El 3D, la cabecera y el pie se actualizan solos.
2. Regenerar iconos PWA e imagen para compartir a partir del vector oficial.
3. Guardar fotografías autorizadas en `public/media/barber/` y `public/media/tattoo/`, preparar variantes WebP (720 y 1290 px) y añadir `original` + `srcSet` en el elemento de `src/domain/media.ts`; actualizar título, categoría y encuadre real.
4. Retirar la etiqueta «Captura de referencia» solo en las imágenes sustituidas.
5. Revisar portada, galería, lightbox y móvil.

No atribuir fotografías de cortes a un miembro concreto del equipo sin confirmación. No usar fotos generadas como evidencia del trabajo del establecimiento. No subir referencias privadas de clientes a `public/`.
