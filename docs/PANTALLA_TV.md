# Pantalla de turnos para el televisor

Ruta: `/pantalla-turnos` (no se indexa). Muestra solo número, profesional y servicio; nunca teléfonos ni apellidos.

## Qué hace la pantalla

- Turno actual grande (llamado, en atención o siguiente) con el color del profesional.
- Una columna por profesional: "Atendiendo ahora" y "Siguientes" (3, con espera estimada y "+N más").
- Al llamar un turno: anuncio a pantalla completa unos 5 s, campanilla y voz. Mientras siga llamado, el resplandor late y la voz se repite como máximo 3 veces.
- Modo vitrina: tras 60 s sin cambios y sin turnos llamados rota fotos y videos publicados, precios e Instagram. Cualquier cambio en la fila (o un toque en la pantalla) vuelve a la fila al instante.
- QR permanente "Toma tu turno / Reserva aquí". El enlace se puede fijar desde la tarjeta QR del panel (se guarda en el navegador de la TV).
- Pantalla siempre activa (Wake Lock), reconexión automática ("Reconectando…") y desplazamiento de ±4 px cada 3 min contra el marcado en pantallas OLED.
- Probar la vitrina rápido en desarrollo: `/pantalla-turnos?demoVitrina=1` (se ignora en producción).

## Primer arranque (una sola vez)

1. Abrir la URL pública de la web + `/pantalla-turnos`.
2. Pulsar "Activar sonido de llamados" y marcar "Voz": los navegadores exigen un primer clic para reproducir audio.
3. Pulsar "Pantalla completa" (el botón se oculta al entrar).

## Modo kiosco

### PC o mini-PC con Chrome o Edge (recomendado)

```
chrome.exe --kiosk --noerrdialogs --disable-infobars --autoplay-policy=no-user-gesture-required --user-data-dir="C:\kiosco-elite" https://TU-DOMINIO/pantalla-turnos
```

- Con `--autoplay-policy=no-user-gesture-required` el sonido y la voz funcionan sin el primer clic.
- Poner ese acceso directo en `shell:startup` para que abra al encender el equipo.
- Salir del modo kiosco: `Alt+F4`.
- En Windows: Configuración > Sistema > Energía, "Pantalla y suspensión" en Nunca; activar el inicio de sesión automático.

### Smart TV o TV con navegador

1. Abrir el navegador de la TV, entrar a la URL y guardarla como favorito o página de inicio.
2. Pulsar "Pantalla completa".
3. Desactivar en la TV: ahorro de energía, apagado automático, protector de pantalla y "brillo automático". Si hay modo "Tienda" o "Hotel", usarlo.
4. Si el navegador de la TV es antiguo (sin Wake Lock o sin voz), conectar un mini-PC o Chromecast/Fire TV con navegador por HDMI.

### Tablet Android

Chrome > menú > "Añadir a pantalla de inicio", abrir desde el icono y activar pantalla completa. Desactivar suspensión en Ajustes > Pantalla.

## Notas

- El audio depende del navegador: si la TV lo bloquea, aparece "Pulsa para reactivar el sonido".
- Si se corta la red, la pantalla muestra "Reconectando…" y conserva el último estado hasta volver.
- Los videos de la vitrina se reproducen en silencio y en bucle; con redes lentas se ve la foto de portada.
