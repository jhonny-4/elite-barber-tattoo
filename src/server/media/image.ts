import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { BookingError } from "../bookings";
import { PHOTO_MAX_BYTES } from "../../domain/gallery";
import { adminClient } from "../supabase/clients";
import { BUCKET_PENDING } from "./gallery";

const ACCEPTED = new Set(["jpeg", "png", "webp", "heif"]);
const MAX_PIXELS = 60_000_000;

/**
 * Normaliza una foto subida: la decodifica de verdad (no se confía en el tipo declarado),
 * aplica la orientación EXIF, limita el lado largo a 1600 px sin recortar y la guarda como
 * WebP. Al reexportar se descartan EXIF y GPS del original.
 */
export async function normalizePhoto(input: Uint8Array) {
  if (input.byteLength === 0) throw new BookingError("El archivo está vacío.");
  if (input.byteLength > PHOTO_MAX_BYTES) throw new BookingError("La foto supera 8 MB.", 413);
  try {
    const source = sharp(input, { failOn: "error", limitInputPixels: MAX_PIXELS });
    const meta = await source.metadata();
    if (!meta.format || !ACCEPTED.has(meta.format)) throw new Error("formato");
    const { data, info } = await source
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw new BookingError("No pudimos leer la imagen. Usa una foto JPG, PNG o WebP.");
  }
}

/** Guarda una imagen ya normalizada en el bucket privado de pendientes: `{barber}/{prefijo}{uuid}.webp`. */
export async function storePending(barberId: string, data: Buffer, namePrefix = "") {
  const path = `${barberId}/${namePrefix}${randomUUID()}.webp`;
  const { error } = await adminClient().storage.from(BUCKET_PENDING).upload(path, data, { contentType: "image/webp", upsert: false });
  if (error) throw new Error("No se pudo guardar la imagen.");
  return path;
}
