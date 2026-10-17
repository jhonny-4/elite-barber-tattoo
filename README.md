# Elite Barber & Tattoo — Demo V4 / ZENKO

Base del producto comercial: Next.js, React, TypeScript, Tailwind y Three.js. Un único establecimiento en Cartagena; Jean Carlos es el tatuador del mismo local. La fase funcional V4 añade servidor demo, agenda compartida, fila QR y PWA. El acabado visual con High es la siguiente fase acordada.

## Continuar en Claude Code

Abrir la rama `feat/premium-pwa-v4`, que contiene el proyecto completo en la ra?z. Leer `CLAUDE.md` y [la gu?a de continuaci?n](docs/v4/CONTINUAR_EN_NUBE.md). No crear otra aplicaci?n porque main solo muestre la base inicial.

## Ejecutar

Requisitos: Node.js 24 y npm. Desde esta carpeta:

```sh
npm ci
npm run dev -- --hostname 0.0.0.0
```

Para presentar y comprobar la PWA:

```sh
npm run build
npm start -- --hostname 0.0.0.0
```

Computador: http://localhost:3000. Celular: `http://IP-DEL-COMPUTADOR:3000`, conectado al mismo Wi-Fi. El servidor debe permanecer encendido. No abrir puertos del router. En HTTP por IP funciona la web; la instalación PWA requiere localhost en el computador o HTTPS autorizado.

## Recorrido

| Ruta               | Función                                                               |
| ------------------ | --------------------------------------------------------------------- |
| `/`                | Marca, logo 3D, servicios, galería, equipo y ubicación                |
| `/reservar`        | Experiencia, profesional o primer disponible, fecha, datos y revisión |
| `/tatuaje`         | Solicitud pendiente con referencia opcional de hasta 1 MB             |
| `/jean-carlos`     | Artista, monograma y portafolio                                       |
| `/turnos`          | Registro QR, número, posición general y espera orientativa            |
| `/pantalla-turnos` | Monitor público: solo números, profesionales y estados                |
| `/administracion`  | Resumen, agenda, fila, solicitudes, clientes, equipo y avisos         |
| `/barbero`         | Vista demo de agenda y atención filtrada por profesional              |
| `/offline`         | Aviso de pérdida de conexión                                          |

El acceso **Panel administrativo · demo** aparece arriba. Pulsar **Abrir panel demo**. No hay contraseña ni autorización de producción. La vista del barbero también simula permisos; no protege datos frente a otros usuarios de la red.

Desde el panel se registran turnos presenciales o citas con fecha, se reprograma, cancela, llama, inicia y finaliza atención. Los horarios, descansos, almuerzos y ausencias se editan en Equipo. Los cambios que invaliden citas existentes se rechazan: reprogramar o cancelar primero.

## Datos y sincronización

El servidor Next.js es la única autoridad V4. Persiste en `var/demo/state.json`, excluido de Git, y serializa escrituras con reemplazo atómico. Las claves de idempotencia impiden repetir una operación cuyo resultado se perdió al desconectar. SSE notifica cambios y hay consulta periódica de respaldo. Solo se admite un proceso servidor local; PostgreSQL y transacciones reales serán necesarios para producción y múltiples instancias.

El antiguo `localStorage` permanece intacto como referencia V1; no se mezcla ni se usa para crear reservas V4. El token del turno se conserva en la pestaña para consultar su estado. **Restablecer demo compartida** limpia los datos y horarios V4 de todos los dispositivos, sin borrar el antiguo localStorage.

El registro en fila no garantiza hora. La espera es una proyección de duraciones, descansos y citas; puede no estar disponible. La llamada exige un profesional libre para el servicio completo y respeta los turnos anteriores compatibles. Las citas reservadas mantienen su espacio.

## Qué sigue siendo demo

- Corte $20.000 y corte con barba $25.000 COP; duraciones 30/45 minutos y Barbero 1–3, provisionales.
- Jornada inicial 10:00–18:00, almuerzo 13:00–14:00 y todos los días: configuración ficticia editable, no horario comercial confirmado.
- Confirmaciones y correos son registros simulados en Notificaciones. No hay envíos, pagos, reservas de producción ni cotizaciones automáticas.
- Formularios y API sin autenticación real: usar solo datos ficticios y referencias sin información privada. La API de gestión es accesible en esta red demo. El monitor público omite contactos; eso no convierte la demo completa en un sistema privado.
- WhatsApp abre `https://wa.me/573012329541`, número provisional del usuario. Instagram abre @elite_barber_tattoo. No se envían mensajes automáticamente.
- Dirección aportada: Cra. 59b #mz50-24, barrio Chiquinquirá, Cartagena de Indias, Bolívar. Google Maps busca el texto; no se ha verificado un pin comercial.
- Los dos cortes adjuntos fueron incorporados sin reconstrucción. Los tatuajes siguen usando capturas de referencia. Ver `docs/ACTIVOS.md`.

## PWA

Manifest, iconos basados en el logo original, modo standalone, página offline y actualización por botón. El service worker solo se registra en compilación de producción y contexto seguro. No cachea respuestas de API ni encola confirmaciones: sin conexión no se guardan citas o turnos.

Android: Chrome → menú → Instalar app. iPhone: Safari → Compartir → Añadir a pantalla de inicio. La disponibilidad depende del navegador y contexto. La opción de instalación en el pie informa de las limitaciones. Un QR con localhost no funciona desde otro celular: abrir el panel mediante la IP local o editar el enlace del QR.

## Verificar

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Las pruebas de persistencia crean su propia carpeta temporal y no usan la agenda de presentación. En el aislamiento de Windows, el reemplazo de archivos puede requerir ejecutar las pruebas fuera del sandbox; no se debe reemplazar la escritura atómica por una escritura parcial.

## Organización y siguiente fase

`src/domain/`: reglas puras. `src/services/`: contratos y adaptadores. `src/server/demo/`: persistencia y validación de comandos. `src/app/api/demo/`: HTTP y SSE. `src/components/admin/`, `queue/`, `pwa/`: interfaces. `tests/`: dominio, persistencia y política offline.

Detalles: `docs/v4/ESTRUCTURA.md`, `docs/v4/VALIDACION.md` y `docs/PRODUCCION.md`.

Rama local `feat/premium-pwa-v4`. Respaldo previo `c171aba`. No hacer push, merge ni despliegue sin autorización. No subir `var/demo`, credenciales o referencias privadas. Al terminar la revisión funcional, avisar al usuario para cambiar a High y refinar diseño, GSAP si procede, marcas de agua y animaciones.

## Actualización del proyecto

Repositorio público. Usar main: contiene el proyecto completo. Es el proyecto real en desarrollo; la versión de presentación mantiene flujos simulados, almacenamiento JSON local y no tiene base de datos de producción ni autenticación real. El mapa integrado y el acabado premium siguen pendientes.

