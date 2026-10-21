import { BookingError } from "../../../server/bookings";
import { errorResponse } from "../../../server/bookings/http";
import { adminClient } from "../../../server/supabase/clients";
import { toViews } from "../../../server/media/gallery";

export const runtime = "nodejs";

/** Trabajos publicados de un barbero. Público: el filtro `published` va en la consulta, nunca en el cliente. */
export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("barbero") ?? "";
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) throw new BookingError("Profesional inválido.");
    const db = adminClient();
    const { data: barber } = await db.from("barbers").select("id").eq("slug", slug).maybeSingle();
    if (!barber) throw new BookingError("Profesional no encontrado.", 404);
    const { data, error } = await db
      .from("media")
      .select("*")
      .eq("barber_id", barber.id)
      .eq("published", true)
      .order("sort_order")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error("No se pudo leer la galería.");
    const items = (await toViews(data)).map((v) => ({
      id: v.id, kind: v.kind, title: v.title, alt: v.alt, width: v.width, height: v.height, url: v.url, posterUrl: v.posterUrl,
    }));
    return Response.json({ items }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    return errorResponse(e);
  }
}
