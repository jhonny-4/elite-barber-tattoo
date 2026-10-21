import { BookingError } from "../../../../../../server/bookings";
import { errorResponse, noStore, sameOrigin } from "../../../../../../server/bookings/http";
import { adminClient } from "../../../../../../server/supabase/clients";
import { requireStaffApi } from "../../../../../../server/panel/auth";
import { PHOTO_MAX_BYTES } from "../../../../../../domain/gallery";
import { BUCKET_PENDING, authorizeMedia } from "../../../../../../server/media/gallery";
import { normalizePhoto, storePending } from "../../../../../../server/media/image";

export const runtime = "nodejs";

/** Póster opcional de un video pendiente (un fotograma que genera el navegador). */
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new BookingError("Origen no permitido.", 403);
    const staff = await requireStaffApi();
    if (Number(request.headers.get("content-length") ?? 0) > PHOTO_MAX_BYTES + 64 * 1024) throw new BookingError("La imagen supera 8 MB.", 413);
    const form = await request.formData().catch(() => null);
    if (!form) throw new BookingError("Formulario inválido.");
    const row = await authorizeMedia(staff, form.get("id"));
    if (row.kind !== "video" || row.published) throw new BookingError("Solo los videos pendientes admiten póster.");
    const file = form.get("file");
    if (!(file instanceof File)) throw new BookingError("Falta la imagen.");
    const image = await normalizePhoto(new Uint8Array(await file.arrayBuffer()));
    const path = await storePending(row.barber_id!, image.data, "poster-");
    const { error } = await adminClient().from("media").update({ poster_path: path, width: image.width, height: image.height }).eq("id", row.id);
    if (error) {
      await adminClient().storage.from(BUCKET_PENDING).remove([path]);
      throw new Error("No se pudo guardar el póster.");
    }
    if (row.poster_path) await adminClient().storage.from(BUCKET_PENDING).remove([row.poster_path]);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
