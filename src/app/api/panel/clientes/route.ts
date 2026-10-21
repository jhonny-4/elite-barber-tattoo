import { BookingError } from "../../../../server/bookings";
import { errorResponse, noStore, readJson, sameOrigin } from "../../../../server/bookings/http";
import { sessionClient } from "../../../../server/supabase/clients";
import { audit, requireStaffApi } from "../../../../server/panel/auth";
import type { Staff } from "../../../../server/auth/staff";
import { normalizePhone } from "../../../../domain/panel";

type Visit = {
  id: string;
  starts_at: string;
  status: string;
  price_cop: number;
  customer_name: string;
  customer_email: string;
  services: { name: string } | null;
  barbers: { display_name: string } | null;
};
const columns = "id,starts_at,status,price_cop,customer_name,customer_email,services(name),barbers(display_name)";

/**
 * Un barbero solo accede a clientes que aparecen en sus citas (RLS-visibles); el dueño, a cualquiera.
 * Los teléfonos se guardan como 10 dígitos o +57 más 10 dígitos: se comparan por igualdad, sin LIKE.
 */
async function assertCanSee(staff: Staff, db: Awaited<ReturnType<typeof sessionClient>>, phone: string) {
  if (staff.role === "dueno") return;
  const { data, error } = await db.from("bookings").select("id").in("customer_phone", [phone, `+57${phone}`]).limit(1);
  if (error) throw new Error("No se pudo verificar el acceso.");
  if (!data.length) throw new BookingError("Cliente no disponible.", 404);
}

/** Historial de citas (por teléfono y por correo) y nota interna de un cliente. */
export async function GET(request: Request) {
  try {
    const staff = await requireStaffApi();
    const phone = normalizePhone(new URL(request.url).searchParams.get("phone"));
    if (!phone) throw new BookingError("Teléfono inválido.");
    // RLS: el barbero solo recibe sus propias citas; el dueño, todas.
    const db = await sessionClient();
    await assertCanSee(staff, db, phone);
    const byPhone = await db
      .from("bookings")
      .select(columns)
      .in("customer_phone", [phone, `+57${phone}`])
      .order("starts_at", { ascending: false })
      .limit(100)
      .returns<Visit[]>();
    if (byPhone.error) throw new Error("No se pudo leer el historial.");
    // Un mismo cliente puede reservar con otro número: se amplía con los correos ya vistos.
    const emails = [...new Set(byPhone.data.map((b) => b.customer_email))].slice(0, 5);
    const byEmail = emails.length
      ? await db.from("bookings").select(columns).in("customer_email", emails).order("starts_at", { ascending: false }).limit(100).returns<Visit[]>()
      : { data: [] as Visit[], error: null };
    if (byEmail.error) throw new Error("No se pudo leer el historial.");
    const merged = new Map<string, Visit>();
    for (const b of [...byPhone.data, ...byEmail.data]) merged.set(b.id, b);
    const visits = [...merged.values()].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    const done = visits.filter((b) => b.status === "finalizada");
    const { data: note } = await db.from("client_notes").select("note,updated_at").eq("phone", phone).maybeSingle();
    return Response.json(
      {
        phone,
        note: note?.note ?? "",
        noteUpdatedAt: note?.updated_at ?? null,
        visits: visits.map((b) => ({
          id: b.id,
          startsAt: b.starts_at,
          status: b.status,
          priceCop: b.price_cop,
          service: b.services?.name ?? "Servicio",
          barber: b.barbers?.display_name ?? "Profesional",
        })),
        completed: done.length,
        spentCop: done.reduce((sum, b) => sum + b.price_cop, 0),
      },
      { headers: noStore },
    );
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(request: Request) {
  try {
    if (!sameOrigin(request)) throw new BookingError("Origen no permitido.", 403);
    const staff = await requireStaffApi();
    const body = await readJson(request);
    const phone = normalizePhone(body.phone);
    if (!phone) throw new BookingError("Teléfono inválido.");
    if (typeof body.note !== "string" || body.note.length > 1000) throw new BookingError("La nota admite hasta 1000 caracteres.");
    const db = await sessionClient();
    await assertCanSee(staff, db, phone);
    const updatedAt = new Date().toISOString();
    const { error } = await db
      .from("client_notes")
      .upsert({ phone, note: body.note.trim(), updated_by: staff.userId, updated_at: updatedAt }, { onConflict: "phone" });
    if (error) throw new Error("No se pudo guardar la nota.");
    await audit(staff, "nota_cliente", "client_note", phone);
    return Response.json({ ok: true, noteUpdatedAt: updatedAt }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
