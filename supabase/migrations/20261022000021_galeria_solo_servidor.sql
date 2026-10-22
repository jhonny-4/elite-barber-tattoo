-- La galería de barberos se sube y se borra solo por las rutas del panel (service role),
-- que normalizan la foto (sin EXIF/GPS, WebP), aplican el tope de pendientes y fijan la
-- ruta en Storage. Con el JWT y la clave pública un barbero podía saltarse todo eso
-- subiendo directo al bucket o creando filas `media` con rutas arbitrarias.
drop policy media_barbero_alta on public.media;
drop policy media_barbero_borra on public.media;
drop policy pendiente_barbero_alta on storage.objects;
