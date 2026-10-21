// Reglas puras de la galería por barbero (claves de R2, tipos, tamaños, textos).
// Autocontenido (sin imports) para probarse con node --experimental-strip-types.

export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 80 * 1024 * 1024;
/** Tope de piezas pendientes por barbero: evita llenar el almacenamiento sin aprobación. */
export const PENDING_MAX_PER_BARBER = 40;
export const VIDEO_TYPES = { "video/mp4": "mp4", "video/webm": "webm" } as const;
export type VideoType = keyof typeof VIDEO_TYPES;
export const VIDEO_MIME_BY_EXT = { mp4: "video/mp4", webm: "video/webm" } as const;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const uuidRe = new RegExp(`^${UUID}$`);

/** El bucket de R2 es compartido con producción: fuera de producción todo vive bajo `dev/`. */
export const r2Prefix = (nodeEnv: string | undefined) => (nodeEnv === "production" ? "" : "dev/");

export const buildVideoKey = (prefix: string, barberId: string, uuid: string, ext: "mp4" | "webm") =>
  `${prefix}videos/${barberId}/${uuid}.${ext}`;

/** Descompone una clave de video; null si no tiene exactamente la forma esperada. */
export function parseVideoKey(key: string, prefix: string) {
  if (!key.startsWith(prefix)) return null;
  const match = new RegExp(`^videos/(${UUID})/(${UUID})\.(mp4|webm)$`).exec(key.slice(prefix.length));
  if (!match) return null;
  return { barberId: match[1], uuid: match[2], ext: match[3] as "mp4" | "webm" };
}

/** Ruta pública de un video (sin el prefijo del entorno): lo que ve el navegador. */
export const publicVideoPath = (key: string, prefix: string) => (key.startsWith(prefix) ? key.slice(prefix.length) : key);

export const checkVideoDeclared = (contentType: unknown, size: unknown) => {
  if (typeof contentType !== "string" || !(contentType in VIDEO_TYPES)) return "Solo se aceptan videos MP4 o WebM.";
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) return "Tamaño de video inválido.";
  if (size > VIDEO_MAX_BYTES) return "El video supera 80 MB.";
  return null;
};

/** Reconoce el contenedor por sus primeros bytes: el tipo declarado por el cliente no basta. */
export function sniffVideo(head: Uint8Array): "mp4" | "webm" | null {
  if (head.length >= 12 && head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) return "mp4";
  if (head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return "webm";
  return null;
}

export function checkAlt(value: unknown): string | null {
  if (typeof value !== "string") return "Describe la foto o el video (mínimo 3 caracteres).";
  const length = value.trim().length;
  if (length < 3) return "Describe la foto o el video (mínimo 3 caracteres).";
  if (length > 200) return "La descripción admite hasta 200 caracteres.";
  return null;
}

export function checkTitle(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > 80) return "El título admite hasta 80 caracteres.";
  return null;
}

/** Nuevo orden tras mover un elemento una posición; mismos ids si ya está en el borde. */
export function moveId(ids: string[], id: string, direction: "up" | "down") {
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return ids;
  const next = ids.slice();
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** Fila de galería lista para mostrar (panel y web pública). */
export type MediaView = {
  id: string;
  barberId: string;
  kind: "foto" | "video";
  title: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  url: string;
  posterUrl: string | null;
};
