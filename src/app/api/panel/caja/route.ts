import { BookingError } from "../../../../server/bookings";
import { errorResponse, noStore, readJson, sameOrigin } from "../../../../server/bookings/http";
import { adminClient } from "../../../../server/supabase/clients";
import { audit, requireStaffApi } from "../../../../server/panel/auth";
import { cajaState, validDate } from "../../../../domain/panel";

type Payment = { status: string; amount_cop: number };
const bogotaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

/** Caja del día (solo dueño): servicios finalizados por profesional y su estado de cobro. */
export async function GET(request: Request) {
  try {
    await requireStaffApi(true);
    const date = new URL(request.url).searchParams.get("date") ?? bogotaToday();
    if (!validDate(date)) throw new BookingError("Fecha inválida.");
    const start = new Date(`${date}T00:00:00-05:00`);
    const end = new Date(start.getTime() + 86_400_000);
    const db = adminClient();
    const [bookings, tickets, barbers] = await Promise.all([
      db
        .from("bookings")
        .select("id,barber_id,starts_at,price_cop,customer_name,paid_in_store_at,services(name),payments(status,amount_cop)")
        .eq("status", "finalizada")
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString())
        .order("starts_at")
        .returns<
          {
            id: string;
            barber_id: string;
            starts_at: string;
            price_cop: number;
            customer_name: string;
            paid_in_store_at: string | null;
            services: { name: string } | null;
            payments: Payment[];
          }[]
        >(),
      // Los turnos ligados a una cita ya cuentan como cita; aquí solo los presenciales sin reserva.
      db
        .from("queue_tickets")
        .select("id,barber_id,number,customer_name,finished_at,paid_in_store_at,services(name,price_cop)")
        .eq("day", date)
        .eq("status", "finalizado")
        .is("booking_id", null)
        .order("number")
        .returns<
          {
            id: string;
            barber_id: string | null;
            number: number;
            customer_name: string;
            finished_at: string | null;
            paid_in_store_at: string | null;
            services: { name: string; price_cop: number } | null;
          }[]
        >(),
      db.from("barbers").select("id,slug,display_name").order("sort_order"),
    ]);
    if (bookings.error || tickets.error || barbers.error) throw new Error("No se pudo cargar la caja.");

    const rows = [
      ...bookings.data.map((b) => {
        const paidOnline = b.payments.filter((p) => p.status === "aprobado").reduce((sum, p) => sum + p.amount_cop, 0);
        const row = { paidOnline, paidInStore: Boolean(b.paid_in_store_at), price: b.price_cop };
        return {
          kind: "cita" as const,
          id: b.id,
          barberId: b.barber_id,
          label: b.customer_name,
          service: b.services?.name ?? "Servicio",
          at: b.starts_at,
          price: b.price_cop,
          state: cajaState(row),
        };
      }),
      ...tickets.data.map((t) => {
        const price = t.services?.price_cop ?? 0;
        return {
          kind: "turno" as const,
          id: t.id,
          barberId: t.barber_id,
          label: `E-${String(t.number).padStart(3, "0")} · ${t.customer_name}`,
          service: t.services?.name ?? "Servicio",
          at: t.finished_at,
          price,
          state: cajaState({ paidOnline: 0, paidInStore: Boolean(t.paid_in_store_at), price }),
        };
      }),
    ];
    return Response.json({ date, barbers: barbers.data, rows }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Marca (o desmarca) un servicio finalizado como cobrado en el local. */
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new BookingError("Origen no permitido.", 403);
    const staff = await requireStaffApi(true);
    const body = await readJson(request);
    const id = String(body.id ?? "");
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new BookingError("Referencia inválida.");
    if (body.kind !== "cita" && body.kind !== "turno") throw new BookingError("Operación inválida.");
    if (typeof body.paid !== "boolean") throw new BookingError("Operación inválida.");
    const value = body.paid ? new Date().toISOString() : null;
    const db = adminClient();
    if (body.kind === "cita") {
      const { data: payments } = await db.from("payments").select("id").eq("booking_id", id).eq("status", "aprobado").limit(1);
      if (payments?.length) throw new BookingError("Esta cita ya fue pagada en línea.", 409);
      const { data, error } = await db.from("bookings").update({ paid_in_store_at: value }).eq("id", id).eq("status", "finalizada").select("id");
      if (error || !data?.length) throw new BookingError("Solo se cobran citas finalizadas.", 409);
    } else {
      const { data, error } = await db.from("queue_tickets").update({ paid_in_store_at: value }).eq("id", id).eq("status", "finalizado").select("id");
      if (error || !data?.length) throw new BookingError("Solo se cobran turnos finalizados.", 409);
    }
    await audit(staff, body.paid ? "cobro_en_local" : "cobro_en_local_revertido", String(body.kind), id);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
