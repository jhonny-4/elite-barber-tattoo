import { isPushEndpoint } from "../../domain/push-endpoint";
import "server-only";
import webpush, { WebPushError } from "web-push";
import { adminClient } from "../supabase/clients";

/** Clave pública VAPID para el navegador, o null si Web Push no está configurado. */
export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

let configured = false;
function vapidReady() {
  const pub = process.env.VAPID_PUBLIC_KEY,
    priv = process.env.VAPID_PRIVATE_KEY,
    subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  }
  return true;
}

/** Ruta interna segura para abrir al tocar el aviso (nunca otra web). */
const safePath = (url: string) => (/^\/(?!\/)[\w\-./?=&%#]*$/.test(url) ? url : "/administracion");

/**
 * Avisa al dueño y, si se indica, al barbero afectado, en todos sus dispositivos suscritos.
 * Las suscripciones caducadas (404/410) se eliminan. Nunca lanza: devuelve el conteo para logs.
 */
/** Solo sí/no: las tres variables VAPID están presentes (no revela valores). */
export const pushReady = () => vapidReady();

export async function notifyStaff(title: string, body: string, url: string, barberId?: string | null) {
  const result = { sent: 0, removed: 0, failed: 0 };
  if (!vapidReady()) return result;
  // barberId siempre sale de la base (uuid), pero se valida antes de usarlo en un filtro de texto.
  if (barberId && !/^[0-9a-f-]{36}$/i.test(barberId)) return result;
  const db = adminClient();
  let profiles = db.from("profiles").select("id");
  profiles = barberId ? profiles.or(`role.eq.dueno,barber_id.eq.${barberId}`) : profiles.eq("role", "dueno");
  const { data: people, error: pe } = await profiles;
  if (pe) {
    console.error("Push: no se pudo leer el equipo.", pe.message);
    return result;
  }
  const ids = (people ?? []).map((p) => p.id);
  if (!ids.length) return result;
  const { data: subs, error: se } = await db.from("staff_push_subscriptions").select("id,endpoint,keys").in("user_id", ids);
  if (se) {
    console.error("Push: no se pudieron leer las suscripciones.", se.message);
    return result;
  }
  const payload = JSON.stringify({ title: title.slice(0, 120), body: body.slice(0, 300), url: safePath(url) });
  const gone: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      const keys = s.keys as { p256dh?: unknown; auth?: unknown } | null;
      if (typeof keys?.p256dh !== "string" || typeof keys?.auth !== "string") return;
      try {
        // Segunda comprobación antes de enviar: filas antiguas o insertadas por otra vía.
        if (!isPushEndpoint(s.endpoint)) return;
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }, payload, { TTL: 3600, urgency: "high", timeout: 10000 });
        result.sent++;
      } catch (e) {
        if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) gone.push(s.id);
        else {
          result.failed++;
          console.error("Push: envío fallido.", e instanceof WebPushError ? e.statusCode : e instanceof Error ? e.message : e);
        }
      }
    }),
  );
  if (gone.length) {
    const { error } = await db.from("staff_push_subscriptions").delete().in("id", gone);
    if (error) console.error("Push: no se pudieron borrar suscripciones caducadas.", error.message);
    else result.removed = gone.length;
  }
  return result;
}

/**
 * Aviso de una sola vez por evento: reserva el hueco en notifications (canal push) y solo
 * envía si la fila es nueva. Así un reintento del cliente con la misma referencia no repite el aviso.
 */
export async function notifyStaffOnce(
  key: { bookingId?: string; ticketId?: string; template: string },
  message: { title: string; body: string; url: string; barberId?: string | null },
) {
  if (!vapidReady()) return;
  const { data, error } = await adminClient()
    .from("notifications")
    .upsert(
      { booking_id: key.bookingId ?? null, ticket_id: key.ticketId ?? null, channel: "push", template: key.template, sent_at: new Date().toISOString(), attempts: 1 },
      { onConflict: "booking_id,ticket_id,channel,template", ignoreDuplicates: true },
    )
    .select("id");
  if (error) {
    console.error("Push: no se pudo registrar el aviso.", error.message);
    return;
  }
  if (!data?.length) return;
  await notifyStaff(message.title, message.body, message.url, message.barberId);
}

const shortWhen = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

/** Aviso al equipo de una reserva confirmada (una vez por cita). */
export async function announceBooking(bookingId: string) {
  const { data: b, error } = await adminClient()
    .from("bookings")
    .select("id,barber_id,status,customer_name,starts_at,services(name),barbers(display_name)")
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !b) {
    console.error("Push: no se pudo leer la reserva para avisar.", error?.message ?? bookingId);
    return;
  }
  if (b.status !== "confirmada") return;
  const first = b.customer_name.trim().split(/\s+/)[0];
  await notifyStaffOnce(
    { bookingId: b.id, template: "equipo_reserva" },
    { title: "Nueva reserva", body: `${first} · ${b.services?.name ?? "Servicio"} · ${b.barbers?.display_name ?? ""} · ${shortWhen(b.starts_at)}`, url: "/administracion", barberId: b.barber_id },
  );
}

/** Aviso al equipo de un turno nuevo en la fila (una vez por turno). */
export async function announceTicket(ticketId: string) {
  const { data: t, error } = await adminClient()
    .from("queue_tickets")
    .select("id,number,barber_id,customer_name,services(name)")
    .eq("id", ticketId)
    .maybeSingle();
  if (error || !t) {
    console.error("Push: no se pudo leer el turno para avisar.", error?.message ?? ticketId);
    return;
  }
  await notifyStaffOnce(
    { ticketId: t.id, template: "equipo_turno" },
    { title: `Turno ${String(t.number).padStart(3, "0")} en la fila`, body: `${t.customer_name.trim().split(/\s+/)[0]} · ${t.services?.name ?? "Servicio"}`, url: "/administracion", barberId: t.barber_id },
  );
}
