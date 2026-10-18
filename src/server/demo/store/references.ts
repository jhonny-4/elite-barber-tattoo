import type { SharedState } from "../../../services/contracts/demo.ts";
import type { TattooRequest } from "../../../domain/demo.ts";

/**
 * Referencias de tatuaje: la imagen se guarda fuera del estado compartido y el
 * estado solo conserva `referenceName` y `referenceUrl` (`/api/demo/reference/<id>`).
 */
export type ReferenceContentType = "image/jpeg" | "image/png" | "image/webp";
export type StoredReference = {
  contentType: ReferenceContentType;
  bytes: Uint8Array;
};

export const REFERENCE_PATH = "/api/demo/reference/";
/** Igual que el formulario: archivos JPG, PNG o WebP de hasta 1 MB. */
export const MAX_REFERENCE_BYTES = 1024 * 1024;
/** Longitud máxima del data URL recibido (1 MB en base64 más el prefijo). */
export const MAX_REFERENCE_DATA_URL_LENGTH = 1_450_000;
/** Referencias guardadas a la vez en la presentación; un reset las libera. */
export const MAX_STORED_REFERENCES = 50;
export const REFERENCE_ERROR = "Referencia inválida o mayor a 1 MB.";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATA_URL_PREFIX = /^data:(image\/(?:jpeg|png|webp));base64,/;
// Clase de caracteres simple (sin grupos repetidos): segura con cadenas de 1,4 MB.
const BASE64_BODY = /^[A-Za-z0-9+/]+={0,2}$/;

/** IDs generados por `createDemoId` (UUID v4 en minúsculas). */
export const isReferenceId = (id: unknown): id is string =>
  typeof id === "string" && ID.test(id);

export const referenceUrlFor = (id: string) => `${REFERENCE_PATH}${id}`;

export function referenceIdFromUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url.startsWith(REFERENCE_PATH)) return null;
  const id = url.slice(REFERENCE_PATH.length);
  return isReferenceId(id) ? id : null;
}

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

/** Tipo real según la firma del archivo; `null` si no es JPEG, PNG ni WebP. */
export function sniffImageType(bytes: Uint8Array): ReferenceContentType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (byte, index) => bytes[index] === byte,
    )
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 12) === "WEBP"
  )
    return "image/webp";
  return null;
}

/**
 * Valida y decodifica el data URL del formulario. Exige tipo declarado
 * jpeg/png/webp, base64 canónico, tamaño ≤ 1 MB y que la firma del archivo
 * coincida con el tipo declarado (el servidor nunca sirve un tipo falso).
 */
export function decodeReferenceDataUrl(dataUrl: unknown): StoredReference {
  if (
    typeof dataUrl !== "string" ||
    dataUrl.length > MAX_REFERENCE_DATA_URL_LENGTH
  )
    throw new Error(REFERENCE_ERROR);
  const match = DATA_URL_PREFIX.exec(dataUrl.slice(0, 40));
  if (!match) throw new Error(REFERENCE_ERROR);
  const body = dataUrl.slice(match[0].length);
  if (body.length === 0 || body.length % 4 !== 0 || !BASE64_BODY.test(body))
    throw new Error(REFERENCE_ERROR);
  const bytes = new Uint8Array(Buffer.from(body, "base64"));
  const contentType = match[1] as ReferenceContentType;
  if (
    bytes.length === 0 ||
    bytes.length > MAX_REFERENCE_BYTES ||
    sniffImageType(bytes) !== contentType
  )
    throw new Error(REFERENCE_ERROR);
  return { contentType, bytes };
}

const servableLegacy = (request: TattooRequest) =>
  typeof request.referenceDataUrl === "string" &&
  DATA_URL_PREFIX.test(request.referenceDataUrl.slice(0, 40)) &&
  isReferenceId(request.id);

/**
 * Estado apto para respuestas HTTP: nunca incluye data URLs. Las solicitudes
 * antiguas con `referenceDataUrl` se publican mediante `/api/demo/reference/<id
 * de la solicitud>`; un `referenceUrl` que no apunte a esa ruta se descarta.
 */
export function toPublicState(state: SharedState): SharedState {
  let changed = false;
  const requests = state.requests.map((request) => {
    const hasData = request.referenceDataUrl !== undefined;
    const validUrl =
      request.referenceUrl === undefined ||
      referenceIdFromUrl(request.referenceUrl) !== null;
    if (!hasData && validUrl) return request;
    changed = true;
    const copy: TattooRequest = { ...request };
    delete copy.referenceDataUrl;
    if (!validUrl) delete copy.referenceUrl;
    if (copy.referenceUrl === undefined && servableLegacy(request))
      copy.referenceUrl = referenceUrlFor(request.id);
    return copy;
  });
  return changed ? { ...state, requests } : state;
}

export type ReferenceSource =
  | { kind: "stored" }
  | { kind: "legacy"; dataUrl: string };

/** Solo se sirven referencias enlazadas desde el estado vigente (tras un reset, ninguna). */
export function findReferenceSource(
  state: SharedState,
  id: string,
): ReferenceSource | null {
  if (state.requests.some((r) => referenceIdFromUrl(r.referenceUrl) === id))
    return { kind: "stored" };
  const legacy = state.requests.find(
    (r) =>
      r.id === id &&
      referenceIdFromUrl(r.referenceUrl) === null &&
      servableLegacy(r),
  );
  return legacy?.referenceDataUrl
    ? { kind: "legacy", dataUrl: legacy.referenceDataUrl }
    : null;
}

/** Copia exacta en un ArrayBuffer propio (Buffer puede compartir memoria de un pool). */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
