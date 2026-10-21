import { BookingError } from "../../../../../server/bookings";
import { errorResponse, noStore, readJson, sameOrigin } from "../../../../../server/bookings/http";
import { adminClient } from "../../../../../server/supabase/clients";
import { audit, requireStaffApi } from "../../../../../server/panel/auth";
import { VIDEO_MAX_BYTES, VIDEO_MIME_BY_EXT, checkAlt, checkTitle, parseVideoKey, sniffVideo } from "../../../../../domain/gallery";
import { authorizeBarber, invalid } from "../../../../../server/media/gallery";
import { R2_PREFIX, deleteObject, getObject, headObject } from "../../../../../server/media/r2";

export const runtime = "nodejs";

/** Registra un video ya subido a R2: comprueba que existe, que es del barbero y que de verdad es MP4/WebM. */
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new BookingError("Origen no permitido.", 403);
    const staff = await requireStaffApi();
    const body = await readJson(request);
    invalid(checkAlt(body.alt));
    invalid(checkTitle(body.title));
    const key = typeof body.key === "string" ? body.key : "";
    const parsed = parseVideoKey(key, R2_PREFIX);
    if (!parsed) throw new BookingError("Clave de video inválida.");
    // El barbero de la clave debe ser el autorizado: nadie registra el video de otro.
    const barberId = await authorizeBarber(staff, parsed.barberId);

    const head = await headObject(key);
    if (!head) throw new BookingError("El video no llegó al almacenamiento. Vuelve a subirlo.", 404);
    const reject = async (message: string) => {
      await deleteObject(key);
      throw new BookingError(message);
    };
    // El límite no se puede imponer en la URL firmada: se verifica aquí y, si se excede, se borra.
    if (head.size <= 0 || head.size > VIDEO_MAX_BYTES) await reject("El video supera 80 MB.");
    const probe = await getObject(key, "bytes=0-15");
    const kind = sniffVideo(new Uint8Array(await probe.arrayBuffer()));
    if (!kind || kind !== parsed.ext || head.contentType !== VIDEO_MIME_BY_EXT[kind]) await reject("El archivo no es un video MP4 o WebM válido.");

    const { data, error } = await adminClient()
      .from("media")
      .insert({
        section: "barbero",
        barber_id: barberId,
        kind: "video",
        storage_path: `r2:${key}`,
        title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : null,
        alt: String(body.alt).trim(),
        published: false,
        created_by: staff.userId,
      })
      .select("id")
      .single();
    if (error) {
      // 23505: la clave ya estaba registrada; ese objeto pertenece a la otra fila, no se borra.
      if (error.code === "23505") throw new BookingError("Ese video ya está registrado.", 409);
      throw new Error("No se pudo registrar el video.");
    }
    await audit(staff, "galeria_video_subido", "media", data.id, { barber_id: barberId });
    return Response.json({ ok: true, id: data.id }, { status: 201, headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
