# Continuidad — Elite / ZENKO

## Estado

Primera dirección visual y flujos demo implementados sobre Next.js. Este proyecto es la base del producto final; no reconstruirlo desde cero. El usuario solicitó un calendario de aspecto 3D premium y autorizó continuar con el resto del prototipo.

## Decisiones

- Elite y Jean Carlos pertenecen al mismo establecimiento. JC es identidad del artista.
- Dirección revisada por el usuario: solo blanco, negro y grises. Space Grotesk / Manrope / Cormorant Garamond. Escultura 3D del logo principal Elite, sin figura abstracta ni collage en portada. Botones de relieve coordinados. Conservar colores reales en las imágenes ampliadas.
- Objetos 3D decorativos; calendario HTML con relieve CSS para conservar accesibilidad, controles táctiles y rendimiento.
- Precio provisional: corte 20.000 COP, corte y barba 25.000 COP. Tatuajes sujetos a cotización del diseño.
- Nombres temporales Barbero 1–3, retratos pendientes. No inventar dirección, teléfono, biografías ni testimonios.
- Calendario: días anteriores deshabilitados, máximo 60 días, intervalos de 15 min, duración por servicio y horarios ocupados bloqueados.
- Referencias de solicitudes locales de hasta 1 MB; sin backend ni envío. Solo datos ficticios en gestión.
- Las solicitudes no se convierten automáticamente en citas. Los estados del panel son ilustrativos y progresan secuencialmente; cerrar es terminal.
- Panel administrativo en `/administracion`, con acceso discreto **Propietario** en el pie solicitado para encontrarlo fácilmente. Lleva a la entrada, no al dashboard directamente. Sesión de propietario solo simulada en `sessionStorage`; NO es seguridad de producción. El dueño tendrá cuenta y rol verificados en servidor y RLS cuando se conecte Supabase. `/gestion` queda como alias con el mismo control de presentación.
- Más presencia de Elite en las secciones, presentación ampliada de quiénes somos y bloque de barbería, sin inventar datos comerciales. Animación inicial de ensamblaje del logo, luz móvil, monograma JC en capas CSS 3D y órbitas. Galería con marcos flotantes y proporción natural; ampliación con `contain` para no recortar el encuadre disponible de las capturas.
- Vista LAN mediante `npm run dev -- --hostname 0.0.0.0`. Se añadió generación de IDs compatible con HTTP local de teléfonos, donde `crypto.randomUUID` puede no existir.

## Material

Cuatro capturas accesibles del primer chat fueron copiadas a `public/media/reference`. Los ocho adjuntos más recientes se vieron en la conversación, pero no se recuperaron como archivos. No afirmar que se importaron ni mejoraron. Sustituir por los originales cuando estén disponibles, siguiendo `ACTIVOS.md`.

## Pendientes del cliente

Logos originales, fotos individuales de trabajos y profesionales, nombres, servicios y duraciones confirmados, horario, dirección, contacto, políticas, personas que gestionan la agenda. Antes del lanzamiento confirmar tarifas, permisos de uso de imágenes y el contenido comercial final.

## Continuar

Revisar visualmente con el usuario esta primera dirección; ajustar efectos, composición y galería según su respuesta. Mantener la misma arquitectura. La autenticación, base remota y demás integraciones se implementan por fases según `PRODUCCION.md`. No desplegar sin permiso.
