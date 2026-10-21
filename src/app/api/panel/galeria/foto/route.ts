import { BookingError } from "../../../../../server/bookings";
import { errorResponse, noStore, sameOrigin } from "../../../../../server/bookings/http";
import { adminClient } from "../../../../../server/supabase/clients";
import { audit, requireStaffApi } from "../../../../../server/panel/auth";
import { PENDING_MAX_PER_BARBER, PHOTO_MAX_BYTES, checkAlt, checkTitle } from "../../../../../domain/gallery";
import { authorizeBarber, countPending, invalid, BUCKET_PENDING } from "../../../../../server/media/gallery";
import { normalizePhoto, storePending } from "../../../../../server/media/image";

export const runtime = "nodejs";

/** Foto de un barbero: multipart (barberId, alt, title?, file). Queda pendiente hasta que el dueño la apruebe. */
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new BookingError("Origen no permitido.", 403);
    const staff = await requireStaffApi();
    // Rechazo temprano por cabecera; el tamaño real se vuelve a comprobar con el archivo.
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > PHOTO_MAX_BYTES + 64 * 1024) throw new BookingError("La foto supera 8 MB.", 413);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new BookingError("Formulario inválido.");
    }
    const barberId = await authorizeBarber(staff, form.get("barberId"));
    const alt = form.get("alt");
    const title = form.get("title");
    invalid(checkAlt(alt));
    invalid(checkTitle(title));
    const file = form.get("file");
    if (!(file instanceof File)) throw new BookingError("Falta la foto.");
    if (file.size > PHOTO_MAX_BYTES) throw new BookingError("La foto supera 8 MB.", 413);
    if ((await countPending(barberId)) >= PENDING_MAX_PER_BARBER) throw new BookingError("Hay demasiadas piezas pendientes de aprobar.", 429);

    const image = await normalizePhoto(new Uint8Array(await file.arrayBuffer()));
    const path = await storePending(barberId, image.data);
    const { data, error } = await adminClient()
      .from("media")
      .insert({
        section: "barbero",
        barber_id: barberId,
        kind: "foto",
        storage_path: path,
        title: typeof title === "string" && title.trim() ? title.trim() : null,
        alt: String(alt).trim(),
        width: image.width,
        height: image.height,
        published: false,
        created_by: staff.userId,
      })
      .select("id")
      .single();
    if (error) {
      // Sin fila no queremos dejar el archivo huérfano.
      await adminClient().storage.from(BUCKET_PENDING).remove([path]);
      throw new Error("No se pudo registrar la foto.");
    }
    await audit(staff, "galeria_foto_subida", "media", data.id, { barber_id: barberId });
    return Response.json({ ok: true, id: data.id }, { status: 201, headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
