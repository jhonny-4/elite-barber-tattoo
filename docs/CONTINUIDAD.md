# Continuidad para diseño High y Claude Code

Base funcional, no diseño terminado. Mantener Next.js para evolucionar al proyecto final sin reconstruir la app.

## Datos autorizados para el prototipo
- Corte: 20.000 COP. Corte con barba: 25.000 COP. Provisionales hasta confirmación del establecimiento.
- Barbero 1, Barbero 2, Barbero 3: identidades temporales, sin fotos ni experiencia inventadas.
- Jean Carlos, artista dentro del MISMO local Elite. Tatuajes cotizados según diseño.
- Duraciones 30/45 min y disponibilidad 10–18 son ejemplos técnicos, no información comercial.
- No inventar dirección, WhatsApp, testimonios, estadísticas ni años de experiencia.

## Material visto en el chat
Monograma JC blanco sobre negro; logo Elite negro sobre blanco; tres cortes; tatuaje lettering, leones y manga religiosa. Los archivos no están aún ubicados en el repositorio. No afirmar que se importaron ni mejoraron. No reconstruir artificialmente detalles del trabajo para presentarlos como reales. Una ampliación no recupera detalle perdido.

## Siguiente etapa High
Diseño premium original ZENKO. Portada cinematográfica, metal/luz, color de acento coherente con fotos reales, 3D selectivo, scroll coreografiado, galería filtrable y lightbox accesible, navegación y páginas modulares. Sustituir la página técnica actual. Tailwind y herramientas de animación se incorporarán al diseñar. Respetar reduced motion y rendimiento móvil. No atribuir trabajos a un barbero concreto sin confirmación.

## Límites actuales
Sin backend, login, cobros, correos ni WhatsApp integrado. Persistencia local; bloqueo de cruces solo demostrativo, no atómico entre dispositivos o pestañas simultáneas. Referencias: se valida el archivo y solo se persiste su nombre. Estados del panel editables para demostración, sin reglas de producción.

## Producción
PostgreSQL/Supabase con transacciones y restricciones por profesional y rango horario; Auth con roles administrador/profesional; Storage con referencias privadas; auditoría; backups de base y archivos; notificaciones con reintentos; pagos mediante eventos verificados si se contratan. Separar pruebas y producción. No desplegar sin permiso.
