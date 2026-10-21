import { getStaff } from "../../../server/auth/staff";
import { adminClient, sessionClient } from "../../../server/supabase/clients";
import {
  availability,
  BookingError,
  retryConfirmation,
} from "../../../server/bookings";
import { localBogota } from "../../../domain/booking/slots";
import {
  noStore,
  sameOrigin,
  readJson,
  errorResponse,
} from "../../../server/bookings/http";
import {
  bookingTransitions,
  queueTransitions,
  tattooTransitions,
} from "../../../domain/staff-transitions";

export async function GET(request: Request) {
  try {
    const staff = await getStaff();
    if (!staff) throw new BookingError("Inicia sesión.", 401);
    const date =
      new URL(request.url).searchParams.get("date") ??
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(
        new Date(),
      );
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(`${date}T00:00:00-05:00`))
    )
      throw new BookingError("Fecha inválida.");
    // Rango opcional (días antes/después) para agenda futura e historial de clientes; máximo 90.
    const params = new URL(request.url).searchParams;
    const span = (key: string) => Math.min(90, Math.max(0, Number(params.get(key)) || 0));
    const start = new Date(Date.parse(`${date}T00:00:00-05:00`) - span("before") * 86400000).toISOString();
    const end = new Date(
      Date.parse(`${date}T00:00:00-05:00`) + (1 + span("after")) * 86400000,
    ).toISOString();
    const db = await sessionClient(); // RLS filtra por la cuenta real, nunca por un selector del navegador.
    const results = await Promise.all([
      db
        .from("bookings")
        .select(
          "id,barber_id,service_id,starts_at,ends_at,status,customer_name,customer_phone,customer_email,price_cop",
        )
        .gte("starts_at", start)
        .lt("starts_at", end)
        .order("starts_at"),
      db
        .from("queue_tickets")
        .select(
          "id,number,barber_id,service_id,customer_name,customer_phone,status,created_at",
        )
        .eq("day", date)
        .order("number"),
      db
        .from("barbers")
        .select("id,slug,display_name,active")
        .order("sort_order"),
      db
        .from("services")
        .select("id,slug,name,price_cop,duration_min")
        .order("sort_order"),
      db
        .from("tattoo_requests")
        .select(
          "id,customer_name,customer_phone,customer_email,idea,placement,size,status,reference_path,created_at,quote_cop,deposit_cop,quote_notes",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("notifications")
        .select("id,booking_id,sent_at,last_error,attempts,template")
        .order("scheduled_for", { ascending: false })
        .limit(50),
      db
        .from("work_hours")
        .select("barber_id,weekday,opens,closes")
        .order("weekday"),
      db.from("breaks").select("barber_id,weekday,starts,ends,label"),
    ]);
    if (results.some((r) => r.error))
      throw new Error("No se pudo cargar el panel.");
    const [bookings, queue, barbers, services, tattoos, notifications, hours, breaks] =
      results.map((r) => r.data);
    return Response.json(
      {
        staff: { role: staff.role, name: staff.name, barberId: staff.barberId },
        bookings,
        queue,
        barbers,
        services,
        tattoos,
        notifications,
        hours,
        breaks,
      },
      { headers: noStore },
    );
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request))
      throw new BookingError("Origen no permitido.", 403);
    const staff = await getStaff();
    if (!staff) throw new BookingError("Inicia sesión.", 401);
    const body = await readJson(request);
    const db = await sessionClient();
    const id = String(body.id ?? "");
    if (!/^[a-f0-9-]{36}$/.test(id))
      throw new BookingError("Referencia inválida.");
    if (body.kind === "emailRetry") {
      if (staff.role !== "dueno")
        throw new BookingError("Acceso restringido.", 403);
      const { data: n } = await db
        .from("notifications")
        .select("booking_id,sent_at")
        .eq("id", id)
        .eq("template", "confirmacion")
        .eq("channel", "email")
        .maybeSingle();
      if (!n?.booking_id || n.sent_at)
        throw new BookingError("No hay correo pendiente.", 409);
      await retryConfirmation(n.booking_id);
      return Response.json({ ok: true }, { headers: noStore });
    }
    if (body.kind === "hours") {
      if (staff.role !== "dueno" || !Array.isArray(body.hours))
        throw new BookingError("Acceso restringido.", 403);
      if (
        body.hours.some(
          (h) =>
            !h ||
            typeof h !== "object" ||
            typeof h.opens !== "string" ||
            typeof h.closes !== "string" ||
            !/^\d{2}:\d{2}$/.test(h.opens) ||
            !/^\d{2}:\d{2}$/.test(h.closes),
        )
      )
        throw new BookingError("Horario inválido.");
      const { error } = await db.rpc("save_work_hours", {
        p_barber: id,
        p_hours: body.hours,
      });
      if (error)
        throw new BookingError(
          error.code === "P0001"
            ? error.message
            : "No se pudo guardar la jornada.",
          409,
        );
      // Pausas opcionales en la misma operación del panel; se validan contra la jornada guardada.
      if (Array.isArray(body.breaks)) {
        const { error: breakError } = await db.rpc("save_breaks", { p_barber: id, p_breaks: body.breaks });
        if (breakError)
          throw new BookingError(
            breakError.message.includes("fuera_de_jornada")
              ? "Las pausas deben estar dentro de la jornada."
              : breakError.code === "P0001"
                ? "Revisa el inicio y el final de cada pausa."
                : "No se pudieron guardar las pausas.",
            409,
          );
      }
      return Response.json({ ok: true }, { headers: noStore });
    }
    if (body.kind === "reschedule") {
      if (staff.role !== "dueno")
        throw new BookingError("Solo el dueño puede reprogramar.", 403);
      const { data: b } = await db
        .from("bookings")
        .select("*")
        .eq("id", id)
        .eq("status", "confirmada")
        .maybeSingle();
      if (!b)
        throw new BookingError("Solo se reprograman citas confirmadas.", 409);
      const { data: q } = await db
        .from("queue_tickets")
        .select("id")
        .eq("booking_id", id)
        .maybeSingle();
      if (q)
        throw new BookingError(
          "No se reprograma una cita cuya llegada ya fue registrada.",
          409,
        );
      const [{ data: s }, { data: barber }] = await Promise.all([
        db
          .from("services")
          .select("slug,duration_min")
          .eq("id", b.service_id)
          .single(),
        db
          .from("barbers")
          .select("id,slug")
          .eq("id", String(body.barberId))
          .eq("active", true)
          .single(),
      ]);
      if (!s || !barber || !/^\d{2}:\d{2}$/.test(String(body.time)))
        throw new BookingError("Profesional u hora inválidos.");
      const date = String(body.date),
        time = String(body.time),
        slots = await availability(barber.slug, s.slug, date);
      if (!slots.slots.some((slot) => slot.time === time && slot.available))
        throw new BookingError("El horario no está disponible.", 409);
      const start = localBogota(date, time);
      const { error, data: changed } = await db
        .from("bookings")
        .update({
          barber_id: barber.id,
          starts_at: new Date(start).toISOString(),
          ends_at: new Date(start + s.duration_min * 60000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "confirmada")
        .eq("starts_at", b.starts_at)
        .select("id");
      if (error || !changed?.length)
        throw new BookingError("El horario cambió. Actualiza la agenda.", 409);
      await adminClient()
        .from("audit_log")
        .insert({
          actor: staff.userId,
          action: "reserva_reprogramada",
          entity: "booking",
          entity_id: id,
        });
      return Response.json({ ok: true }, { headers: noStore });
    }
    if (body.kind === "checkin") {
      const { data: booking } = await db
        .from("bookings")
        .select("id,barber_id")
        .eq("id", id)
        .maybeSingle();
      if (
        !booking ||
        (staff.role !== "dueno" && booking.barber_id !== staff.barberId)
      )
        throw new BookingError("Reserva no disponible.", 404);
      const { error } = await adminClient().rpc("checkin_booking", {
        p_booking: id,
      });
      if (error)
        throw new BookingError(
          "La llegada solo se registra para citas confirmadas de hoy.",
          409,
        );
      return Response.json({ ok: true }, { headers: noStore });
    }
    if (body.kind === "reference") {
      if (staff.role !== "dueno")
        throw new BookingError("Acceso restringido.", 403);
      const { data } = await db
        .from("tattoo_requests")
        .select("reference_path")
        .eq("id", id)
        .maybeSingle();
      if (!data?.reference_path)
        throw new BookingError("No hay referencia.", 404);
      const { data: signed, error } = await adminClient()
        .storage.from("referencias")
        .createSignedUrl(data.reference_path, 120);
      if (error) throw new Error("No se pudo abrir la referencia.");
      return Response.json({ url: signed.signedUrl }, { headers: noStore });
    }
    if (body.kind === "barber") {
      if (
        staff.role !== "dueno" ||
        typeof body.active !== "boolean" ||
        typeof body.name !== "string" ||
        body.name.trim().length < 2 ||
        body.name.length > 60
      )
        throw new BookingError("Datos o permisos inválidos.", 403);
      const { data: changed, error } = await db
        .from("barbers")
        .update({ display_name: body.name.trim(), active: body.active })
        .eq("id", id)
        .select("id");
      if (error || !changed?.length) throw new Error("No se pudo guardar el profesional.");
    } else {
      const table =
        body.kind === "booking"
          ? "bookings"
          : body.kind === "queue"
            ? "queue_tickets"
            : body.kind === "tattoo"
              ? "tattoo_requests"
              : null;
      if (!table) throw new BookingError("Operación inválida.");
      if (table === "tattoo_requests" && staff.role !== "dueno")
        throw new BookingError("Acceso restringido.", 403);
      const { data: item, error } = await db
        .from(table)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !item)
        throw new BookingError("Registro no disponible.", 404);
      if (
        staff.role !== "dueno" &&
        (!("barber_id" in item) || item.barber_id !== staff.barberId)
      )
        throw new BookingError("Solo puedes gestionar tu agenda.", 403);
      const transitions =
        table === "bookings"
          ? bookingTransitions
          : table === "queue_tickets"
            ? queueTransitions
            : tattooTransitions;
      const next = String(body.status);
      if (!transitions[item.status]?.includes(next))
        throw new BookingError(
          "El estado cambió o la transición no está permitida.",
          409,
        );
      // La cotización se hace en /api/panel/cotizacion (monto, abono y correo): aquí no se salta.
      if (table === "tattoo_requests" && next === "cotizada")
        throw new BookingError("Escribe la cotización para pasar la solicitud a cotizada.", 409);
      if (
        next === "en_atencion" &&
        table === "bookings" &&
        "starts_at" in item &&
        (Date.parse(item.starts_at) > Date.now() + 30 * 60000 ||
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Bogota",
          }).format(new Date(item.starts_at)) !==
            new Intl.DateTimeFormat("en-CA", {
              timeZone: "America/Bogota",
            }).format(new Date()))
      )
        throw new BookingError(
          "La atención se inicia el día de la cita, hasta 30 minutos antes.",
          409,
        );
      // La lectura anterior usa RLS; el servidor permite al barbero actualizar solo su cita.
      // CAS por estado impide que dos dispositivos avancen un registro obsoleto.
      const elevated = adminClient();
      let changed;
      if (table === "bookings") {
        if (
          staff.role !== "dueno" &&
          ["cancelada", "no_asistio"].includes(next)
        )
          throw new BookingError(
            "Solo el dueño puede cancelar o marcar ausencia.",
            403,
          );
        changed = await elevated
          .from("bookings")
          .update({
            status: next as "en_atencion",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("status", item.status as "confirmada")
          .select("id");
      } else if (table === "queue_tickets") {
        const stamp =
          next === "llamado"
            ? { called_at: new Date().toISOString() }
            : next === "en_atencion"
              ? { started_at: new Date().toISOString() }
              : next === "finalizado"
                ? { finished_at: new Date().toISOString() }
                : {};
        const barberId = "barber_id" in item ? item.barber_id : null;
        if (!barberId && next !== "cancelado")
          throw new BookingError("Asigna un profesional al turno.");
        changed = await elevated
          .from("queue_tickets")
          .update({ status: next as "llamado", ...stamp })
          .eq("id", id)
          .eq("status", item.status as "esperando")
          .select("id");
      } else {
        changed = await db
          .from("tattoo_requests")
          .update({ status: next as "en_evaluacion" })
          .eq("id", id)
          .eq("status", item.status as "pendiente")
          .select("id");
      }
      if (changed.error || !changed.data?.length)
        throw new BookingError(
          "No se guardó el cambio. Actualiza el panel.",
          409,
        );
    }
    const { error: auditError } = await adminClient()
      .from("audit_log")
      .insert({
        actor: staff.userId,
        action: `panel_${String(body.kind)}`,
        entity: String(body.kind),
        entity_id: id,
        data: {
          status: String(body.status ?? ""),
          active: body.active === true,
        },
      });
    if (auditError)
      console.error(
        "No se pudo registrar auditoría del panel",
        auditError.code,
      );
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
