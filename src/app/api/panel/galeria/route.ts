import { errorResponse, noStore } from "../../../../server/bookings/http";
import { adminClient } from "../../../../server/supabase/clients";
import { requireStaffApi } from "../../../../server/panel/auth";
import { r2Configured } from "../../../../server/media/r2";
import { toViews } from "../../../../server/media/gallery";

export const runtime = "nodejs";

/** Galería del panel: el dueño ve la de todos; el barbero, solo la suya (pendientes y publicadas). */
export async function GET() {
  try {
    const staff = await requireStaffApi();
    let query = adminClient().from("media").select("*").eq("section", "barbero").order("published").order("sort_order").order("created_at", { ascending: false }).limit(500);
    if (staff.role !== "dueno") {
      if (!staff.barberId) return Response.json({ items: [], barbers: [], me: null, videos: r2Configured() }, { headers: noStore });
      query = query.eq("barber_id", staff.barberId);
    }
    const [{ data, error }, { data: barbers }] = await Promise.all([query, adminClient().from("barbers").select("id,slug,display_name").order("display_name")]);
    if (error) throw new Error("No se pudo leer la galería.");
    const mine = staff.role === "dueno" ? (barbers ?? []) : (barbers ?? []).filter((b) => b.id === staff.barberId);
    return Response.json(
      { items: await toViews(data), videos: r2Configured(), barbers: mine.map((b) => ({ id: b.id, slug: b.slug, name: b.display_name })), me: staff.barberId },
      { headers: noStore },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
