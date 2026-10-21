import { BookingError } from "../../../server/bookings";
import { errorResponse } from "../../../server/bookings/http";
import { adminClient } from "../../../server/supabase/clients";
import { toViews } from "../../../server/media/gallery";

export const runtime = "nodejs";

/** Trabajos publicados de un barbero. Público: el filtro `published` va en la consulta, nunca en el cliente. */
export async function GET(request: Request) {
  try {
    // Sin parámetro: todos los publicados de todos los barberos (pantalla del local).
    const slug = new URL(request.url).searchParams.get("barbero") ?? "";
    const db = adminClient();
    let query = db.from("media").select("*").not("barber_id", "is", null).eq("published", true);
    if (slug) {
      if (!/^[a-z0-9-]{2,40}$/.test(slug)) throw new BookingError("Profesional inválido.");
      const { data: barber } = await db.from("barbers").select("id").eq("slug", slug).maybeSingle();
      if (!barber) throw new BookingError("Profesional no encontrado.", 404);
      query = query.eq("barber_id", barber.id);
    }
    const { data, error } = await query
      .order("sort_order")
      .order("created_at", { ascending: false })
      .limit(slug ? 60 : 80);
    if (error) throw new Error("No se pudo leer la galería.");
    const items = (await toViews(data)).map((v) => ({
      id: v.id, kind: v.kind, title: v.title, alt: v.alt, width: v.width, height: v.height, url: v.url, posterUrl: v.posterUrl,
    }));
    return Response.json({ items }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    return errorResponse(e);
  }
}
