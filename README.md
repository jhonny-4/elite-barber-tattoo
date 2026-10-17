# Elite Barber & Tattoo — ZENKO

Prototipo navegable que evoluciona al proyecto final. Un único establecimiento en Cartagena: Elite (`@elite_barber_tattoo`) y su artista Jean Carlos (`@jeancarlostattoo19`).

## Ejecutar

Requisitos: Node.js 24 y npm. En esta carpeta:

```sh
npm ci
npm run dev
```

Abrir http://localhost:3000. Para una presentación local sin herramientas de desarrollo:

```sh
npm run build
npm start
```

La compilación utiliza Webpack para reproducir el entorno comprobado en Windows. No requiere claves ni servicios externos. Las fuentes se sirven localmente.

```sh
npm run typecheck
npm run lint
npm test
```

## Recorrido de presentación

| Ruta              | Experiencia                                                                           |
| ----------------- | ------------------------------------------------------------------------------------- |
| `/`               | Portada, objeto 3D, servicios, galería filtrable y ampliable, artista y equipo        |
| `/jean-carlos`    | Identidad JC, proceso de valoración y selección de tatuajes                           |
| `/reservar`       | Servicio → profesional → calendario con relieve → hora → contacto → confirmación demo |
| `/tatuaje`        | Idea, zona, tamaño, referencia con previsualización y solicitud pendiente             |
| `/administracion` | Entrada aparte del propietario y panel administrativo demo                            |
| `/gestion`        | Alias del panel, con la misma entrada de propietario                                  |

Se pueden preseleccionar `?servicio=corte-barba` y `?profesional=barbero-2` en `/reservar`. `/administracion?tab=solicitudes` abre las solicitudes después de entrar al modo propietario.

La navegación principal no incluye el panel. El enlace **Propietario · Panel administrativo** del pie abre la entrada separada en `/administracion`. Para presentarlo, elegir **Probar panel administrativo · demo**. La sesión simulada se conserva en esta pestaña; **Salir de la demo** vuelve a la entrada. El enlace público lleva a la entrada, no abre directamente la gestión. Esto organiza la experiencia, pero no constituye autenticación ni autorización real: Supabase Auth, validación en servidor y RLS son obligatorios antes de usar datos reales.

### Ver desde el celular

Ejecutar `npm run dev -- --hostname 0.0.0.0`. Conectar el celular al mismo Wi-Fi que el computador y abrir `http://IP-DEL-COMPUTADOR:3000`. La IP puede cambiar al reconectar. El computador debe permanecer encendido y el servidor activo. `localhost` desde el celular apunta al propio teléfono. No se abre ningún puerto del router ni se modifica el firewall. `next.config.ts` permite únicamente los nombres locales y las IP del computador como orígenes de desarrollo.

Para demostrar: crear cita, verla en gestión, cancelarla; enviar tatuaje con imagen, revisar la referencia y avanzar su estado; pausar un profesional y comprobar su agenda. Usar siempre contactos ficticios.

## Qué está simulado

- Corte $20.000 COP y corte con barba $25.000 COP: valores provisionales aportados por el usuario.
- Barbero 1, 2 y 3: perfiles temporales sin nombres, retratos ni experiencia inventados.
- Duraciones de 30/45 minutos, horas 10:00–18:00 y horizonte de 60 días: exclusivamente demo.
- Se comprueban cruces parciales y disponibilidad por profesional antes de guardar. Web Locks serializa las escrituras locales cuando el navegador lo soporta. Esto **no sustituye** las transacciones y restricciones del servidor entre dispositivos.
- Datos en `localStorage`, clave `zenko.elite.demo.v1`. La imagen opcional se conserva como data URL, hasta 1 MB por archivo, sujeto al espacio del navegador. Se informa de errores de lectura, formato o falta de espacio. No se sube ningún archivo.
- Entrada separada y sesión de propietario simulada, sin autenticación real. Sin correos, WhatsApp, cobros, reservas ni cotizaciones de producción.
- Los tatuajes comienzan pendientes. Los estados posteriores se marcan manualmente en gestión para ilustrar el proceso: no generan precios, citas ni mensajes.
- Dirección, horario comercial, teléfono, biografías y datos no confirmados no se publican como hechos.
- Páginas con `noindex` mientras sean un prototipo. No se ha desplegado.

## Organización

```text
src/app/             páginas, metadata, errores y estilos
src/components/      calendario, formularios, galería, objeto 3D y panel
src/domain/          catálogo, disponibilidad, validación y catálogo visual
src/lib/             persistencia y sincronización local
public/media/        capturas de referencia y futuros originales
tests/               pruebas de comportamiento del dominio
docs/                continuidad, activos y paso a producción
```

React + Next.js + TypeScript + Tailwind CSS. Paleta monocromática, Space Grotesk / Manrope / Cormorant Garamond servidas localmente, botones con relieve, entradas con IntersectionObserver y progreso de scroll. Escultura Three.js inspirada en la geometría del logo Elite, con extrusión, biseles, luz de estudio y respuesta sutil al puntero y scroll. Alternativa CSS con el logo cuando no hay WebGL. Movimiento reducido respetado; resolución del lienzo limitada; render fuera de pantalla evitado. El calendario es una interfaz HTML accesible con profundidad CSS, botones nativos y flechas de teclado. Las fotografías de la galería se presentan en blanco y negro y conservan su color original al ampliarlas.

## Reemplazar fotografías y logos

Leer `docs/ACTIVOS.md`. Las cuatro capturas recuperadas del chat anterior se conservan sin modificar; el navegador encuadra las áreas relevantes. No son fotografías 4K y no se han inventado detalles. Los ocho adjuntos posteriores aún no están disponibles como archivos del proyecto.

En `src/domain/media.ts`, cada trabajo admite `original: '/media/tattoo/archivo.webp'` y `position` opcional. Añadir originales autorizados dentro de `public/media/` y cambiar ese campo. Sustituir las referencias de los componentes `Brand` y `JCMark` cuando lleguen los logos originales. No asignar un corte a un barbero concreto hasta confirmarlo.

## Colaboración y producción

Codex y Claude Code trabajan en ramas separadas y revisan antes de integrar. No editar los mismos archivos a la vez. No subir credenciales, datos de clientes ni referencias privadas al repositorio. Los archivos `.env` están excluidos.

El repositorio y las vistas locales no publican el sitio en Internet. Cualquier despliegue requiere autorización. El plan de PostgreSQL/Supabase, roles, almacenamiento privado, pagos y notificaciones está en `docs/PRODUCCION.md`.
