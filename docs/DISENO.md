# Sistema de diseño — Elite Barber & Tattoo

Dirección visual de la versión de presentación al cliente. Es la referencia obligatoria para cualquier cambio de interfaz. Los estilos viven en `src/styles/`; las rutas solo componen.

## Concepto

**Acero, hueso y tinta roja.** La barbería aporta precisión (acero, filo, simetría) y el tatuaje aporta carácter (tinta, trazo, rojo). Fondo negro profundo, tipografía de alto impacto, fotografía protagonista y rojo solo donde hay intención: acción, estado vivo, cifra clave o detalle de firma.

Proporción orientativa: 60 % negro, 30 % blanco/grises, 10 % rojo como máximo. Los botones de WhatsApp e Instagram usan sus colores de marca y no cuentan como acento.

## Paleta (tokens en `src/styles/tokens.css`)

| Token | Valor | Uso |
| --- | --- | --- |
| `--ink-950` | `#050505` | Fondo más profundo, pie |
| `--ink-900` | `#0a0a0a` | Fondo base de página |
| `--ink-800` | `#121212` | Superficies |
| `--ink-700` | `#1a1a1a` | Superficies elevadas, campos |
| `--ink-600` | `#262626` | Bordes fuertes |
| `--ink-500` | `#363636` | Bordes |
| `--steel-400` | `#6e6e6e` | Texto deshabilitado, decorativo |
| `--steel-300` | `#a3a3a3` | Texto secundario (7:1 sobre negro) |
| `--steel-200` | `#cfcfcf` | Texto terciario fuerte |
| `--bone-100` | `#eeebe5` | Superficies claras (hueso) |
| `--white` | `#fafaf8` | Texto principal |
| `--red-700` | `#6e0a12` | Canto 3D de botones rojos, sombras |
| `--red-600` | `#b5131f` | Relleno rojo con texto blanco (6,4:1) |
| `--red-500` | `#d91e2e` | Rojo de marca: rellenos, líneas, iconos grandes |
| `--red-400` | `#f2333f` | Texto rojo pequeño sobre negro (4,9:1) |
| `--red-glow` | `rgb(217 30 46 / 0.45)` | Halos, foco, luces 3D |

Reglas:

- Texto rojo pequeño sobre fondo oscuro: siempre `--red-400`. `--red-500` solo para texto grande, líneas o rellenos.
- Texto blanco sobre rojo: solo sobre `--red-600` o más oscuro, o el degradado del botón rojo.
- Estados sin verde: confirmado/activo = blanco, atención/en vivo = rojo, pasado/neutro = gris. Nunca comunicar solo con color: añade texto o icono.
- Las fotografías conservan sus colores naturales. No aplicar filtros de color a fotos de cortes ni tatuajes.

## Tipografía

| Rol | Fuente | Uso |
| --- | --- | --- |
| Display | Barlow Condensed 700/800, mayúsculas | Títulos H1/H2, cifras grandes, números de turno |
| Firma | Cormorant Garamond 500/600 itálica | Segunda línea emocional de títulos (`.serif`) |
| Texto/UI | Manrope 400–800 | Párrafos, formularios, botones, etiquetas |

Escala fluida (tokens `--fs-*`): display XL para el hero, L para secciones, M para páginas internas. Párrafos a 16–18 px con `line-height` 1.6–1.7 y medida máxima de 62ch. Etiquetas (`.eyebrow`) en Manrope 700, 12 px, mayúsculas, `letter-spacing` 0.2em.

Patrón de título: primera línea en display mayúsculas y segunda en `.serif` itálica. Ejemplo: `EL DETALLE` / *lo cambia todo.* El punto final puede ir en rojo (`.dot`).

## Retícula, espaciado y centrado

- Contenedor máximo `--container` (1320 px) con margen lateral `--gutter` (16 px en móvil, hasta 48 px).
- Secciones con aire vertical `--section-y` (88–176 px).
- **Secciones de presentación centradas:** títulos, textos, imágenes, tarjetas, banners y grupos de botones se centran en el eje horizontal. Las cuadrículas de tarjetas se centran como bloque y la última fila incompleta también queda centrada (`justify-content: center`).
- Formularios, agenda, tablas y paneles conservan alineación a la izquierda dentro de un contenedor centrado: el bloque está centrado, la lectura no.
- Ninguna página puede tener desplazamiento horizontal a 360, 390, 768, 1024 o 1440 px.

## Botones (sistema 3D)

Todos comparten profundidad física: canto inferior (`--btn-depth`), sombra proyectada, elevación en hover, hundimiento al pulsar, foco visible y estados disabled y loading.

| Clase | Aspecto | Uso |
| --- | --- | --- |
| `.button` | Metal claro (blanco a gris), texto negro | Acción principal genérica |
| `.button-accent` | Rojo Elite, texto blanco | Conversión: reservar, confirmar, enviar, tomar turno. Uno por vista, como máximo dos |
| `.button-outline` | Grafito oscuro, texto blanco | Secundaria |
| `.button-danger` | Grafito con borde y texto rojo | Cancelar, restablecer, borrar |
| `.button-whatsapp` | Verde WhatsApp `#25D366`, texto oscuro, chip blanco con glifo | Contacto por WhatsApp |
| `.button-instagram` | Degradado oficial de Instagram, texto blanco | Perfiles de Instagram |
| `.button-small` | Modificador de tamaño | Barras de herramientas y filas |
| `.icon-button` | Botón cuadrado 44 px | Menú, cerrar, navegación de galería |

Estados: `:hover` sube 2 px; `:active` baja hasta el canto; `:focus-visible` muestra anillo blanco con halo rojo; `:disabled` y `[aria-disabled="true"]` quedan planos al 45 %; `[aria-busy="true"]` muestra un indicador giratorio y bloquea clics. Objetivo táctil mínimo de 44 × 44 px.

Glifos de marca: `BrandGlyph` en `src/components/brand/logos.tsx`. El texto del botón siempre nombra el destino ("WhatsApp", "Instagram"); el glifo es decorativo.

## Superficies

- `.surface`: tarjeta flotante (degradado grafito, borde blanco al 8 %, brillo superior y sombra larga).
- Tarjetas interactivas: elevación y ligera inclinación 3D en hover con puntero fino; sin inclinación en táctil ni con movimiento reducido.
- Radios: 6 px (chips), 12 px (botones y campos), 20 px (tarjetas), 28 px (paneles grandes).
- Textura opcional: grano sutil (`.grain`) solo en fondos grandes, nunca sobre texto pequeño.

## Movimiento

- GSAP + ScrollTrigger (instalados) para la coreografía de scroll: revelados, parallax moderado, texto que se ilumina al avanzar y escultura 3D ligada al scroll. CSS para hover y pulsación.
- Duraciones: 160 ms (micro), 240 ms (UI), 600–900 ms (revelados). Curvas `--ease-out` (expo) y `--ease-in-out`.
- Sin secuestrar el scroll: desplazamiento nativo, sin suavizado artificial y sin bloqueos largos. Fijar (pin) solo si la sección sigue siendo legible y breve.
- `prefers-reduced-motion: reduce`: sin parallax, sin scrub, sin autoplay de marquesinas ni rotaciones; el contenido aparece inmediatamente y el 3D se dibuja estático.
- Rendimiento: animar solo `transform` y `opacity`; WebGL en pausa fuera de pantalla; `devicePixelRatio` máximo de 2; carga diferida de Three.js y GSAP.

## Marca y 3D

- Logos vectoriales en `src/components/brand/` (`EliteLogo`, `JCMonogram`), reconstruidos a partir de las capturas originales. No redibujar, deformar ni sustituir por otra marca. El logo de Elite debe estar presente en cabecera, hero, secciones clave y pie.
- Hero: logo Elite extruido en 3D a partir del vector (acero pulido, bisel, luz de borde roja). Debe verse completo en móvil y no tapar texto.
- Jean Carlos: monograma JC extruido con el mismo lenguaje material.
- Si WebGL no está disponible, se muestra el vector con profundidad CSS.

## Contenido y honestidad

- Es el proyecto real en desarrollo, mostrado al cliente con procesos simulados. Evitar la palabra «demo» en la experiencia pública. Mantener identificado con discreción lo provisional: precios ("precio de referencia"), Barbero 1–3, horarios de ejemplo y avisos simulados.
- El acceso al panel no tiene autenticación real: decirlo dentro del panel, no en la portada.
- No inventar reseñas, cifras, experiencia, integrantes, horarios ni datos de contacto. Los tatuajes siempre requieren valoración y cotización manual.

## Verificación visual obligatoria antes de entregar

1. Capturas a 390, 768 y 1440 px de cada ruta tocada, con movimiento normal y reducido.
2. Centrado: en las secciones de presentación, títulos, textos, fotos, imágenes, banners, tarjetas y grupos de botones quedan centrados (diferencia entre margen izquierdo y derecho ≤ 2 px). Usar `node scripts/qa/visual-qa.cjs`.
3. Sin desbordamiento horizontal; fotos completas sin recortar tatuajes; logo completo en móvil.
4. Contraste AA, foco visible con teclado y objetivos táctiles de 44 px.
