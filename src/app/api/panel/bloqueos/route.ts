import { BookingError } from "../../../../server/bookings";
import { errorResponse, noStore, readJson, sameOrigin } from "../../../../server/bookings/http";
import { adminClient } from "../../../../server/supabase/clients";
import { audit, requireStaffApi } from "../../../../server/panel/auth";
import { absenceWindow, type AbsenceInput } from "../../../../domain/panel";
import type { Staff } from "../../../../server/auth/staff";

const slugRe = /^[a-z0-9-]{2,40}$/;

/** El dueño gestiona a cualquiera; el barbero solo su propia ficha. */
async function barberFor(staff: Staff, slug: unknown) {
  if (typeof slug !== "string" || !slugRe.test(slug)) throw new BookingError("Profesional inválido.");
  const { data } = await adminClient().from("barbers").select("id,slug").eq("slug", slug).maybeSingle();
  if (!data) throw new BookingError("Profesional no encontrado.", 404);
  if (staff.role !== "dueno" && staff.barberId !== data.id) throw new BookingError("Solo puedes gestionar tus propios bloqueos.", 403);
  return data;
}

/** Bloqueos vigentes o futuros de un profesional. */
export async function GET(request: Request) {
  try {
    const staff = await requireStaffApi();
    const barber = await barberFor(staff, new URL(request.url).searchParams.get("barber"));
    const { data, error } = await adminClient()
      .from("absences")
      .select("id,starts_at,ends_at,reason")
      .eq("barber_id", barber.id)
      .gt("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(50);
    if (error) throw new Error("No se pudieron leer los bloqueos.");
    return Response.json({ blocks: data }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new BookingError("Origen no permitido.", 403);
    const staff = await requireStaffApi();
    const body = await readJson(request);
    const barber = await barberFor(staff, body.barber);
    if (!["resto", "rango", "vacaciones"].includes(String(body.kind))) throw new BookingError("Tipo de bloqueo inválido.");
    let window;
    try {
      window = absenceWindow(body as unknown as AbsenceInput, Date.now());
    } catch (e) {
      throw new BookingError(e instanceof Error ? e.message : "Bloqueo inválido.");
    }
    const startsAt = new Date(window.startsAt).toISOString();
    const endsAt = new Date(window.endsAt).toISOString();
    const db = adminClient();
    const { data, error } = await db
      .from("absences")
      .insert({ barber_id: barber.id, starts_at: startsAt, ends_at: endsAt, reason: window.reason })
      .select("id")
      .single();
    if (error) throw new Error("No se pudo guardar el bloqueo.");
    // Las citas ya confirmadas dentro del bloqueo no se tocan solas: se avisa para reprogramarlas.
    const { count } = await db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("barber_id", barber.id)
      .in("status", ["confirmada", "en_atencion"])
      .lt("starts_at", endsAt)
      .gt("ends_at", startsAt);
    await audit(staff, "bloqueo_creado", "absence", data.id, { kind: String(body.kind), conflicts: count ?? 0 });
    return Response.json({ ok: true, id: data.id, conflicts: count ?? 0 }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!sameOrigin(request)) throw new BookingError("Origen no permitido.", 403);
    const staff = await requireStaffApi();
    const body = await readJson(request);
    const id = String(body.id ?? "");
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new BookingError("Referencia inválida.");
    const db = adminClient();
    const { data: absence } = await db.from("absences").select("id,barber_id").eq("id", id).maybeSingle();
    if (!absence) throw new BookingError("Bloqueo no encontrado.", 404);
    if (staff.role !== "dueno" && staff.barberId !== absence.barber_id) throw new BookingError("Solo puedes gestionar tus propios bloqueos.", 403);
    const { error } = await db.from("absences").delete().eq("id", id);
    if (error) throw new Error("No se pudo quitar el bloqueo.");
    await audit(staff, "bloqueo_quitado", "absence", id);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
