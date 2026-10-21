import { BookingError } from "../../../../server/bookings";
import { errorResponse, noStore, readJson, sameOrigin } from "../../../../server/bookings/http";
import { adminClient } from "../../../../server/supabase/clients";
import { audit, requireStaffApi } from "../../../../server/panel/auth";
import { newQuoteToken, sendQuoteEmail } from "../../../../server/tattoo-quote";
import { copAmount } from "../../../../domain/panel";

/**
 * Cotiza una solicitud de tatuaje (solo dueño): guarda monto, abono y notas, la pasa a «cotizada»
 * y envía el enlace privado al cliente. Repetirla desde «cotizada» actualiza la cotización y
 * reenvía el correo con un enlace nuevo (el anterior deja de servir).
 */
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new BookingError("Origen no permitido.", 403);
    const staff = await requireStaffApi(true);
    const body = await readJson(request);
    const id = String(body.id ?? "");
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new BookingError("Referencia inválida.");
    const quote = copAmount(body.quote, 1000);
    const deposit = copAmount(body.deposit, 0);
    if (quote === null) throw new BookingError("Escribe un monto en pesos enteros (mínimo $1.000).");
    if (deposit === null) throw new BookingError("El abono debe ser un monto en pesos enteros.");
    if (deposit > quote) throw new BookingError("El abono no puede superar la cotización.");
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (notes.length > 1000) throw new BookingError("Las notas admiten hasta 1000 caracteres.");

    const db = adminClient();
    const { data: request_ } = await db
      .from("tattoo_requests")
      .select("id,status,customer_name,customer_email")
      .eq("id", id)
      .maybeSingle();
    if (!request_) throw new BookingError("Solicitud no encontrada.", 404);
    if (request_.status !== "en_evaluacion" && request_.status !== "cotizada")
      throw new BookingError("Solo se cotizan solicitudes en evaluación.", 409);

    const { token, hash } = newQuoteToken();
    // CAS por estado: dos pestañas no pisan una cotización ya avanzada (p. ej. fecha acordada).
    const { data: changed, error } = await db
      .from("tattoo_requests")
      .update({
        status: "cotizada",
        quote_cop: quote,
        deposit_cop: deposit,
        quote_notes: notes || null,
        quote_token_hash: hash,
        quoted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", request_.status)
      .select("id");
    if (error || !changed?.length) throw new BookingError("La solicitud cambió. Actualiza el panel.", 409);

    const mail = await sendQuoteEmail({ id, token, to: request_.customer_email, name: request_.customer_name, quote, deposit, notes });
    if (!mail.sent) console.error("No se pudo enviar la cotización", id, mail.reason);
    await audit(staff, "tatuaje_cotizado", "tattoo", id, { quote, deposit, emailSent: mail.sent });
    return Response.json({ ok: true, emailSent: mail.sent }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
