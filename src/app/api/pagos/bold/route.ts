import { adminClient } from "../../../../server/supabase/clients";
import { confirmPaidBooking } from "../../../../server/bookings";
import { verifyWebhook } from "../../../../server/payments/bold";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BoldEvent = {
  id?: unknown;
  type?: unknown;
  subject?: unknown;
  data?: { payment_id?: unknown; amount?: { total?: unknown; currency?: unknown }; metadata?: { reference?: unknown } };
};

const ok = () => Response.json({ received: true }, { headers: { "Cache-Control": "no-store" } });

/**
 * Webhook de Bold. La cita solo se confirma aquí, nunca por la URL de retorno del navegador.
 * Firma verificada, evento idempotente por `id`, y monto/orden contrastados con la base.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 64_000) return Response.json({ error: "Cuerpo demasiado grande." }, { status: 413 });
  if (!verifyWebhook(raw, request.headers.get("x-bold-signature"), process.env.BOLD_SECRET_KEY ?? ""))
    return Response.json({ error: "Firma inválida." }, { status: 401 });

  let event: BoldEvent;
  try {
    event = JSON.parse(raw) as BoldEvent;
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  const eventId = typeof event.id === "string" ? event.id : "";
  const type = typeof event.type === "string" ? event.type : "";
  const reference = typeof event.data?.metadata?.reference === "string" ? event.data.metadata.reference : "";
  if (!eventId || !type) return Response.json({ error: "Evento incompleto." }, { status: 400 });

  const db = adminClient();
  const { data: payment } = reference
    ? await db.from("payments").select("id,booking_id,amount_cop,status").eq("order_ref", reference).maybeSingle()
    : { data: null };

  // Registro único del evento: si Bold reintenta, no se procesa dos veces.
  const { error: dup } = await db.from("payment_events").insert({
    provider_event_id: eventId,
    payment_id: payment?.id ?? null,
    event_type: type,
    payload: event as never,
  });
  if (dup) return dup.code === "23505" ? ok() : Response.json({ error: "No se pudo registrar." }, { status: 500 });
  if (!payment) return ok();

  const total = Number(event.data?.amount?.total);
  const currency = event.data?.amount?.currency;
  const txId = typeof event.data?.payment_id === "string" ? event.data.payment_id : typeof event.subject === "string" ? event.subject : null;
  const now = new Date().toISOString();

  if (type === "SALE_APPROVED") {
    if (total !== payment.amount_cop || currency !== "COP") {
      await db.from("audit_log").insert({ action: "pago_monto_no_coincide", entity: "payment", entity_id: payment.id, data: { total, currency: String(currency) } });
      return ok();
    }
    await db.from("payments").update({ status: "aprobado", provider_tx_id: txId, updated_at: now }).eq("id", payment.id);
    const confirmed = await confirmPaidBooking(payment.booking_id);
    // Pago aprobado sobre una cita ya vencida: queda en auditoría para devolución o reubicación manual.
    if (!confirmed) await db.from("audit_log").insert({ action: "pago_sobre_cita_no_pendiente", entity: "payment", entity_id: payment.id });
  } else if (type === "SALE_REJECTED") {
    await db.from("payments").update({ status: "rechazado", provider_tx_id: txId, updated_at: now }).eq("id", payment.id);
    await db.from("bookings").update({ status: "expirada", updated_at: now }).eq("id", payment.booking_id).eq("status", "pendiente_pago");
  } else if (type === "VOID_APPROVED") {
    await db.from("payments").update({ status: "anulado", updated_at: now }).eq("id", payment.id);
  }
  await db.from("payment_events").update({ processed_at: now }).eq("provider_event_id", eventId);
  return ok();
}
