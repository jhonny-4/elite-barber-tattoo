import "server-only";
import { BookingError } from "../bookings";
import type { Staff } from "../auth/staff";
import { adminClient, supabaseUrl } from "../supabase/clients";
import type { Database } from "../supabase/database.types";
import { publicVideoPath, uuidRe, type MediaView } from "../../domain/gallery";
import { deleteObject, R2_PREFIX } from "./r2";

export type MediaRow = Database["public"]["Tables"]["media"]["Row"];

export const BUCKET_PENDING = "galeria-pendiente";
export const BUCKET_PUBLIC = "galeria";
const SIGNED_SECONDS = 3600;

/** Lo ya aprobado vive en `galeria/barberos/{barber}/…`; lo pendiente, en `galeria-pendiente/{barber}/…`. */
export const isPublicPath = (path: string) => path.startsWith("barberos/");
export const isVideoPath = (path: string) => path.startsWith("r2:");

export const publicStorageUrl = (path: string) =>
  `${supabaseUrl()}/storage/v1/object/public/${BUCKET_PUBLIC}/${path.split("/").map(encodeURIComponent).join("/")}`;

/** Convierte un Error de validación del dominio en una respuesta 400. */
export function invalid(message: string | null): void {
  if (message) throw new BookingError(message);
}

/** El dueño actúa sobre cualquier barbero; el barbero solo sobre el suyo. Devuelve el id verificado en la base. */
export async function authorizeBarber(staff: Staff, barberId: unknown) {
  if (typeof barberId !== "string" || !uuidRe.test(barberId)) throw new BookingError("Profesional inválido.");
  if (staff.role !== "dueno" && staff.barberId !== barberId) throw new BookingError("Solo puedes gestionar tu propia galería.", 403);
  const { data } = await adminClient().from("barbers").select("id").eq("id", barberId).maybeSingle();
  if (!data) throw new BookingError("Profesional no encontrado.", 404);
  return data.id;
}

/** Fila existente + permiso: el barbero solo ve y toca lo suyo. */
export async function authorizeMedia(staff: Staff, id: unknown) {
  if (typeof id !== "string" || !uuidRe.test(id)) throw new BookingError("Referencia inválida.");
  const { data } = await adminClient().from("media").select("*").eq("id", id).maybeSingle();
  if (!data || !data.barber_id) throw new BookingError("Elemento no encontrado.", 404);
  if (staff.role !== "dueno" && staff.barberId !== data.barber_id) throw new BookingError("Solo puedes gestionar tu propia galería.", 403);
  return data;
}

export async function countPending(barberId: string) {
  const { count, error } = await adminClient().from("media").select("id", { count: "exact", head: true }).eq("barber_id", barberId).eq("published", false);
  if (error) throw new Error("No se pudo contar lo pendiente.");
  return count ?? 0;
}

/** URLs de lectura: públicas si está publicado; firmadas (1 h) para el equipo si sigue pendiente. */
export async function toViews(rows: MediaRow[]): Promise<MediaView[]> {
  const pendingPaths = rows.flatMap((r) =>
    r.published ? [] : [r.kind === "foto" ? r.storage_path : null, r.poster_path].filter((p): p is string => Boolean(p)),
  );
  const signed = new Map<string, string>();
  if (pendingPaths.length) {
    const { data } = await adminClient().storage.from(BUCKET_PENDING).createSignedUrls(pendingPaths, SIGNED_SECONDS);
    for (const entry of data ?? []) if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
  }
  const read = (path: string | null, published: boolean) =>
    !path ? null : published ? publicStorageUrl(path) : (signed.get(path) ?? null);
  return rows.map((r) => ({
    id: r.id,
    barberId: r.barber_id ?? "",
    kind: r.kind,
    title: r.title,
    alt: r.alt,
    width: r.width,
    height: r.height,
    published: r.published,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    url: r.kind === "video" ? `/api/media/video/${publicVideoPath(r.storage_path.slice(3), R2_PREFIX)}` : (read(r.storage_path, r.published) ?? ""),
    posterUrl: read(r.poster_path, r.published),
  }));
}

/** Borra el archivo (Storage o R2) y su póster. Un fallo se propaga: no dejamos la fila sin su archivo. */
export async function removeStored(row: MediaRow) {
  const db = adminClient();
  if (isVideoPath(row.storage_path)) await deleteObject(row.storage_path.slice(3));
  else {
    const bucket = row.published ? BUCKET_PUBLIC : BUCKET_PENDING;
    const { error } = await db.storage.from(bucket).remove([row.storage_path]);
    if (error) throw new Error("No se pudo borrar el archivo.");
  }
  if (row.poster_path) {
    const bucket = row.published ? BUCKET_PUBLIC : BUCKET_PENDING;
    const { error } = await db.storage.from(bucket).remove([row.poster_path]);
    if (error) throw new Error("No se pudo borrar el póster.");
  }
}
