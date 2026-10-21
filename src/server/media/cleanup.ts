import "server-only";
import { adminClient } from "../supabase/clients";
import { VIDEO_MAX_BYTES } from "../../domain/gallery";
import { R2_PREFIX, deleteObject, listObjects, r2Configured } from "./r2";

/**
 * La URL firmada no puede fijar el tamaño del archivo: esta limpieza borra los videos que
 * nunca se registraron (más de 30 min) y los que superan el máximo, para que nadie deje
 * archivos huérfanos o enormes ocupando el almacenamiento.
 */
export async function cleanOrphanVideos(now = Date.now()) {
  if (!r2Configured()) return "sin_r2";
  const objects = await listObjects(`${R2_PREFIX}videos/`);
  if (!objects.length) return 0;
  const { data, error } = await adminClient().from("media").select("storage_path").eq("kind", "video");
  if (error) throw new Error("No se pudo leer la galería.");
  const known = new Set((data ?? []).map((m) => m.storage_path));
  let removed = 0;
  for (const o of objects) {
    const registered = known.has(`r2:${o.key.slice(R2_PREFIX.length)}`) || known.has(`r2:${o.key}`);
    const stale = now - o.modified > 30 * 60_000;
    if (o.size > VIDEO_MAX_BYTES || (!registered && stale)) {
      await deleteObject(o.key);
      removed++;
    }
  }
  return removed;
}
