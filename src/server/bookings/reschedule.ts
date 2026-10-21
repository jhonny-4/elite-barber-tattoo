import "server-only";
import { createHash } from "node:crypto";
import { adminClient } from "../supabase/clients";
import { checkReschedule, denialMessage } from "../../domain/booking/reschedule-rules";
import { localBogota } from "../../domain/booking/slots";
import { whatsappUrl } from "../../domain/business";
import { actions, detailRow, detailTable, emailLayout, escapeHtml, ghostButton, primaryButton, sendEmail, siteUrl, whenCard } from "../notify/email";
import { availability, BookingError } from "./index";
import { notifyWaitlist } from "./waitlist";

const tz = "America/Bogota";
const tokenRe = /^[A-Za-z0-9_-]{40,60}$/;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const rpcMessages: Record<string, [string, number]> = {
  reserva_no_encontrada: ["No encontramos esta reserva.", 404],
  reserva_no_reprogramable: [denialMessage.no_confirmada, 409],
  fuera_de_ventana: [denialMessage.fuera_de_ventana, 409],
  limite_reprogramaciones: [denialMessage.limite, 409],
  horario_pasado: ["Ese horario ya pasó. Elige otro.", 409],
  horario_ocupado: ["Ese horario acaba de ocuparse. Elige otro.", 409],
  horario_no_disponible: ["Ese horario ya no está disponible. Elige otro.", 409],
};

export async function rescheduleBooking(input: { token: unknown; date: unknown; time: unknown }) {
  const { token, date, time } = input;
  if (typeof token !== "string" || !tokenRe.test(token)) throw new BookingError("Enlace de reserva inválido.", 404);
  if (typeof date !== "string" || typeof time !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) || Number(time.slice(3)) % 15 !== 0)
    throw new BookingError("Fecha u hora inválida.");
  const db = adminClient();
  const { data: booking } = await db.from("bookings").select("id,status,starts_at,ends_at,price_cop,customer_email,customer_name,service_id,barber_id,reschedule_count,services(slug,name),barbers(slug,display_name)").eq("access_token_hash", hashToken(token)).maybeSingle();
  if (!booking || !booking.services || !booking.barbers) throw new BookingError("No encontramos esta reserva.", 404);
  const startsAt = new Date(localBogota(date, time));
  if (Number.isNaN(startsAt.getTime())) throw new BookingError("Fecha u hora inválida.");
  // Reintento del mismo cambio (doble clic, red caída): ya está en esa hora, no se cuenta otra reprogramación.
  if (booking.status === "confirmada" && Date.parse(booking.starts_at) === startsAt.getTime()) return { date, time, rescheduleCount: booking.reschedule_count };
  const rule = checkReschedule({ status: booking.status, startsAt: Date.parse(booking.starts_at), now: Date.now(), rescheduleCount: booking.reschedule_count });
  if (!rule.ok) throw new BookingError(denialMessage[rule.reason], 409);
  // Mismo barbero y servicio: la disponibilidad ya aplica jornada, pausas, ausencias y citas ajenas.
  const avail = await availability(booking.barbers.slug, booking.services.slug, date, { startsAt: Date.parse(booking.starts_at), endsAt: Date.parse(booking.ends_at) });
  if (!avail.slots.some(s => s.time === time && s.available)) throw new BookingError("Ese horario no está disponible. Elige otro.", 409);
  const { data, error } = await db.rpc("reschedule_booking_by_token", { p_token_hash: hashToken(token), p_starts: startsAt.toISOString() });
  if (error) {
    const key = Object.keys(rpcMessages).find(k => (error.message ?? "").includes(k));
    if (key) throw new BookingError(...rpcMessages[key]);
    throw new Error("No se pudo reprogramar la cita.");
  }
  const updated = Array.isArray(data) ? data[0] : data;
  // El correo y el aviso a la lista son efectos secundarios: la cita ya cambió y no se revierte si fallan.
  await Promise.allSettled([
    sendRescheduleEmail({ id: booking.id, email: booking.customer_email, name: booking.customer_name, startsAt: updated.starts_at, price: booking.price_cop, service: booking.services.name, barber: booking.barbers.display_name, token }),
    notifyWaitlist({ serviceId: booking.service_id, barberId: booking.barber_id, startsAt: booking.starts_at }),
  ]);
  return { date, time, rescheduleCount: updated.reschedule_count };
}

async function sendRescheduleEmail(b: { id: string; email: string; name: string; startsAt: string; price: number; service: string; barber: string; token: string }) {
  const when = new Date(b.startsAt);
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CO", { timeZone: tz, ...o }).format(when);
  const day = fmt({ weekday: "long", day: "numeric", month: "long" });
  const hour = fmt({ hour: "numeric", minute: "2-digit", hour12: true });
  const first = escapeHtml(b.name.trim().split(/\s+/)[0] ?? "");
  const wa = `${whatsappUrl}?text=${encodeURIComponent(`Hola Elite, quiero cambiar mi cita del ${day} a las ${hour}.`)}`;
  const html = emailLayout({
    preheader: `Tu cita en Elite cambió: ${escapeHtml(day)}, ${escapeHtml(hour)}.`,
    eyebrow: "&#9670; Cita reprogramada",
    title: `${first ? `${first}, tu` : "Tu"} nueva hora`,
    intro: "Listo, movimos tu cita. Esta es la fecha que cuenta; la anterior quedó libre.",
    content: [
      whenCard(escapeHtml(day), escapeHtml(hour)),
      detailTable(`${detailRow("Servicio", escapeHtml(b.service))}${detailRow("Barbero", escapeHtml(b.barber))}${detailRow("Total", `$${b.price.toLocaleString("es-CO")} <span style="color:#7d7d7d;font-size:11px">COP</span>`, true)}`),
      actions(primaryButton(`${siteUrl()}/mi-reserva/${b.token}`, "Ver mi cita &#8599;"), ghostButton(wa, "WhatsApp")),
    ].join("\n"),
    footerNote: "Puedes volver a cambiarla o cancelarla desde el enlace hasta 2 horas antes. Si no hiciste este cambio, escríbenos por WhatsApp.",
  });
  // La clave incluye la hora nueva: cada reprogramación es un correo distinto para Resend.
  await sendEmail(b.email, `Cita reprogramada · ${day}, ${hour} · Elite Barber & Tattoo`, html, { idempotencyKey: `booking-reschedule-${b.id}-${when.getTime()}`, record: { bookingId: b.id, template: "reprogramacion" } });
}

/** Horarios para el selector de reprogramación: mismos que la reserva pública, sin contar la cita propia. */
export async function rescheduleSlots(token: unknown, date: unknown) {
  if (typeof token !== "string" || !tokenRe.test(token)) throw new BookingError("Enlace de reserva inválido.", 404);
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BookingError("Fecha inválida.", 400);
  const { data: b } = await adminClient().from("bookings").select("starts_at,ends_at,status,services(slug),barbers(slug)").eq("access_token_hash", hashToken(token)).maybeSingle();
  if (!b || b.status !== "confirmada" || !b.services || !b.barbers) throw new BookingError("No encontramos esta reserva.", 404);
  return availability(b.barbers.slug, b.services.slug, date, { startsAt: Date.parse(b.starts_at), endsAt: Date.parse(b.ends_at) });
}
