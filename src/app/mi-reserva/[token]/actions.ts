"use server";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { adminClient } from "../../../server/supabase/clients";
import { notifyWaitlist } from "../../../server/bookings/waitlist";

export async function cancelBooking(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) redirect("/mi-reserva/invalida");
  const hash = createHash("sha256").update(token).digest("hex"), db = adminClient();
  const { data: booking } = await db.from("bookings").select("id,status,starts_at,service_id,barber_id").eq("access_token_hash", hash).maybeSingle();
  if (!booking || booking.status !== "confirmada" || Date.parse(booking.starts_at) - Date.now() <= 2 * 60 * 60 * 1000) redirect(`/mi-reserva/${token}`);
  const { data: updated } = await db.from("bookings").update({ status: "cancelada", updated_at: new Date().toISOString() }).eq("id", booking.id).eq("status", "confirmada").select("id").maybeSingle();
  if (!updated) redirect(`/mi-reserva/${token}`);
  await db.from("audit_log").insert({ action: "reserva_cancelada_cliente", entity: "booking", entity_id: booking.id });
  // El hueco liberado se ofrece a la lista de espera; notifyWaitlist no lanza errores.
  await notifyWaitlist({ serviceId: booking.service_id, barberId: booking.barber_id, startsAt: booking.starts_at });
  redirect(`/mi-reserva/${token}`);
}
