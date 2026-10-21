import { BookingError } from "../../../../../server/bookings";
import { errorResponse, noStore, readJson, sameOrigin } from "../../../../../server/bookings/http";
import { adminClient } from "../../../../../server/supabase/clients";
import { audit, requireStaffApi } from "../../../../../server/panel/auth";
import { checkAlt, checkTitle, moveId } from "../../../../../domain/gallery";
import {
  BUCKET_PENDING,
  BUCKET_PUBLIC,
  authorizeMedia,
  invalid,
  isVideoPath,
  removeStored,
} from "../../../../../server/media/gallery";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

/** Copia un archivo pendiente al bucket público con el mismo nombre bajo `barberos/{barber}/`. */
async function copyToPublic(path: string) {
  const target = `barberos/${path}`;
  const storage = adminClient().storage.from(BUCKET_PENDING);
  const { error } = await storage.copy(path, target, { destinationBucket: BUCKET_PUBLIC });
  if (error) throw new Error("No se pudo publicar el archivo.");
  return target;
}

/** Aprobar, editar textos o reordenar. Solo el dueño: el barbero nunca publica ni edita. */
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    if (!sameOrigin(request)) throw new BookingError("Origen no permitido.", 403);
    const staff = await requireStaffApi(true);
    const row = await authorizeMedia(staff, (await params).id);
    const body = await readJson(request);
    const db = adminClient();
    const action = String(body.action ?? "");

    if (action === "editar") {
      invalid(checkAlt(body.alt));
      invalid(checkTitle(body.title));
      const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;
      const { error } = await db.from("media").update({ alt: String(body.alt).trim(), title }).eq("id", row.id);
      if (error) throw new Error("No se pudo guardar el cambio.");
    } else if (action === "aprobar") {
      if (row.published) throw new BookingError("Ya está publicado.");
      // Al frente de la galería del barbero: lo más nuevo se ve primero.
      const { data: first } = await db.from("media").select("sort_order").eq("barber_id", row.barber_id!).eq("published", true).order("sort_order").limit(1).maybeSingle();
      const sortOrder = (first?.sort_order ?? 0) - 1;
      const isVideo = isVideoPath(row.storage_path);
      const storagePath = isVideo ? row.storage_path : await copyToPublic(row.storage_path);
      let posterPath: string | null = null;
      try {
        posterPath = row.poster_path ? await copyToPublic(row.poster_path) : null;
      } catch (e) {
        if (!isVideo) await db.storage.from(BUCKET_PUBLIC).remove([storagePath]);
        throw e;
      }
      const { error } = await db
        .from("media")
        .update({ published: true, storage_path: storagePath, poster_path: posterPath, sort_order: sortOrder })
        .eq("id", row.id)
        .eq("published", false);
      if (error) {
        const undo = [storagePath, posterPath].filter((p): p is string => Boolean(p) && p !== row.storage_path);
        if (undo.length) await db.storage.from(BUCKET_PUBLIC).remove(undo);
        throw new Error("No se pudo publicar.");
      }
      // La copia ya es pública: el original privado sobra (un fallo aquí solo deja un huérfano privado).
      const leftovers = [isVideo ? null : row.storage_path, row.poster_path].filter((p): p is string => Boolean(p));
      if (leftovers.length) await db.storage.from(BUCKET_PENDING).remove(leftovers);
    } else if (action === "subir" || action === "bajar") {
      if (!row.published) throw new BookingError("Solo se ordena lo publicado.");
      const { data: list, error } = await db.from("media").select("id").eq("barber_id", row.barber_id!).eq("published", true).order("sort_order").order("created_at", { ascending: false });
      if (error) throw new Error("No se pudo reordenar.");
      const ids = moveId(list.map((r) => r.id), row.id, action === "subir" ? "up" : "down");
      // Se reescribe la secuencia completa: evita huecos y empates en sort_order.
      const results = await Promise.all(ids.map((id, index) => db.from("media").update({ sort_order: index }).eq("id", id)));
      if (results.some((r) => r.error)) throw new Error("No se pudo reordenar.");
    } else {
      throw new BookingError("Acción inválida.");
    }
    await audit(staff, `galeria_${action}`, "media", row.id, { barber_id: row.barber_id });
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Rechazar o eliminar. El dueño borra cualquiera; el barbero solo lo suyo que siga pendiente. */
export async function DELETE(request: Request, { params }: Ctx) {
  try {
    if (!sameOrigin(request)) throw new BookingError("Origen no permitido.", 403);
    const staff = await requireStaffApi();
    const row = await authorizeMedia(staff, (await params).id);
    if (staff.role !== "dueno" && row.published) throw new BookingError("Lo publicado solo lo retira el dueño.", 403);
    await removeStored(row);
    const { error } = await adminClient().from("media").delete().eq("id", row.id);
    if (error) throw new Error("No se pudo eliminar.");
    await audit(staff, "galeria_eliminada", "media", row.id, { barber_id: row.barber_id, was_published: row.published });
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
