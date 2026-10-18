# Fotos de tatuajes

Guardar aquí los archivos originales o las capturas, con estos nombres:

- `anubis-01.jpg`, `anubis-02.jpg`, `anubis-03.jpg`
- `zeus-aguila-01.jpg`
- `faith-01.jpg`, `faith-02.jpg`
- `mujer-cuervo-01.jpg`
- `joker-01.jpg`
- `lettering-estrellas-01.jpg`

Ejecutar `npm run import:tattoos`. El sufijo numérico agrupa los ángulos en una sola tarjeta con carrusel. El importador genera WebP sin ampliar las imágenes ni alterar el tatuaje. Las capturas se identifican como referencias. Para fotos originales, cambiar `capture` a `false` en el manifiesto generado.

Importación completada desde `Portafolio_Tatuajes_Jean_Carlos.zip`: 9 imágenes útiles de 6 trabajos. La captura Foto_10 repetía el Joker de Foto_02 con menor resolución y barras de Instagram; no se duplicó en la web. Los nombres están agrupados según la lista anterior. `manifest.json` conserva títulos y el encuadre del lettering, que oculta solo la interfaz de Instagram. Ejecutar de nuevo el importador reproduce el portafolio.
