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
  let removed = 0;
  for (const o of objects) {
    const stale = now - o.modified > 30 * 60_000;
    if (o.size <= VIDEO_MAX_BYTES && !stale) continue;
    // Comprobación individual antes de borrar: no depende del límite de filas de una consulta masiva.
    const paths = [`r2:${o.key}`, `r2:${o.key.slice(R2_PREFIX.length)}`];
    const { count, error } = await adminClient().from("media").select("id", { count: "exact", head: true }).in("storage_path", paths);
    if (error) throw new Error("No se pudo comprobar un video antes de borrarlo.");
    const registered = (count ?? 0) > 0;
    // Un video registrado nunca se borra aquí (dejaría la galería apuntando a nada).
    if (!registered && (stale || o.size > VIDEO_MAX_BYTES)) {
      await deleteObject(o.key);
      removed++;
    }
  }
  return removed;
}
