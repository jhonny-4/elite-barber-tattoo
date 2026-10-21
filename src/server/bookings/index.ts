import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { adminClient } from "../supabase/clients";
import { businessAddress, whatsappDisplay } from "../../domain/business";
import { localBogota, slotsForDay } from "../../domain/booking/slots";

const tz = "America/Bogota";
const dateParts = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};
const weekday = (date: string) => dateParts(date).getUTCDay();
const shiftDate = (date: string, n: number) => { const d = dateParts(date); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const todayBogota = () => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dayStart = (date: string) => `${date}T00:00:00-05:00`;
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && dateParts(s).toISOString().slice(0, 10) === s;
const toMin = (s: string) => { const [h, m] = s.slice(0, 5).split(":").map(Number); return h * 60 + m; };

export async function catalog() {
  const db = adminClient();
  const [{ data: barbers, error: be }, { data: services, error: se }, { data: links, error: le }] = await Promise.all([
    db.from("barbers").select("id,slug,display_name,photo_path,bio,sort_order").eq("active", true).order("sort_order"),
    db.from("services").select("id,slug,name,price_cop,duration_min,sort_order").eq("active", true).order("sort_order"),
    db.from("barber_services").select("barber_id,service_id"),
  ]);
  if (be || se || le) throw new Error("No se pudo cargar el catálogo.");
  return { barbers: barbers ?? [], services: services ?? [], barberServices: links ?? [] };
}

async function barbersFor(serviceSlug: string, barberSlug: string) {
  const db = adminClient();
  let q = db.from("barbers").select("id,slug,display_name,photo_path,bio,sort_order").eq("active", true).order("sort_order");
  if (barberSlug !== "any") q = q.eq("slug", barberSlug);
  const [{ data: service }, { data: bs }, { data: hours }, { data: breaks }] = await Promise.all([
    db.from("services").select("id,slug,name,duration_min,price_cop").eq("slug", serviceSlug).eq("active", true).maybeSingle(),
    db.from("barber_services").select("barber_id,service_id"),
    db.from("work_hours").select("barber_id,weekday,opens,closes"),
    db.from("breaks").select("barber_id,weekday,starts,ends"),
  ]);
  if (!service) throw new Error("Servicio no disponible.");
  const { data: candidates, error } = await q;
  if (error) throw error;
  const eligible = (candidates ?? []).filter(b => bs?.some(x => x.barber_id === b.id && x.service_id === service.id));
  return { service, eligible, hours: hours ?? [], breaks: breaks ?? [] };
}

export async function availability(barberSlug: string, serviceSlug: string, date: string) {
  if (!validDate(date) || date < todayBogota() || date > shiftDate(todayBogota(), 60)) throw new Error("Fecha fuera del periodo disponible.");
  const { service, eligible, hours, breaks } = await barbersFor(serviceSlug, barberSlug);
  const from = dayStart(date), to = dayStart(shiftDate(date, 1));
  const results = await Promise.all(eligible.map(async barber => {
    const work = hours.find(h => h.barber_id === barber.id && h.weekday === weekday(date));
    if (!work) return { barber, slots: [] as { time: string; available: boolean }[] };
    const { data, error } = await adminClient().rpc("busy_ranges", { p_barber: barber.id, p_from: from, p_to: to });
    if (error) throw error;
    const pauses = breaks.filter(b => b.barber_id === barber.id && b.weekday === weekday(date));
    return { barber, slots: slotsForDay({ date, opens: work.opens, closes: work.closes, durationMin: service.duration_min, breaks: pauses, busy: (data ?? []).map(r => ({ startsAt: Date.parse(r.starts_at), endsAt: Date.parse(r.ends_at) })), now: Date.now() }) };
  }));
  const times = [...new Set(results.flatMap(r => r.slots.map(s => s.time)))].sort();
  return { date, slots: times.map(time => ({ time, available: results.some(r => r.slots.some(s => s.time === time && s.available)), barberSlug: barberSlug === "any" ? results.find(r => r.slots.some(s => s.time === time && s.available))?.barber.slug ?? null : barberSlug })) };
}

export type BookingInput = { barberSlug: string; serviceSlug: string; date: string; time: string; name: string; phone: string; email: string };
export class BookingError extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status = status; } }
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizePhone = (value: string) => {
  const trimmed = value.trim();
  if (/^\+57[\d\s()-]+$/.test(trimmed)) { const digits = trimmed.slice(3).replace(/\D/g, ""); return digits.length === 10 ? `+57${digits}` : ""; }
  const digits = trimmed.replace(/\D/g, "");
  return digits.length === 10 ? digits : "";
};

export async function createBooking(input: BookingInput, idempotencyKey: string) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const phone = typeof input.phone === "string" ? normalizePhone(input.phone) : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (name.length < 2 || name.length > 80) throw new BookingError("El nombre debe tener entre 2 y 80 caracteres.");
  if (!phone) throw new BookingError("Escribe un teléfono colombiano válido de 10 dígitos o +57.");
  if (email.length > 254 || !emailRe.test(email)) throw new BookingError("Escribe un correo válido.");
  if (!validDate(input.date) || !/^\d{2}:\d{2}$/.test(input.time) || toMin(input.time) % 15 !== 0) throw new BookingError("Fecha u hora inválida.");
  if (toMin(input.time) >= 24 * 60) throw new BookingError("Hora inválida.");
  const info = await barbersFor(input.serviceSlug, input.barberSlug);
  if (!info.eligible.length) throw new BookingError("No hay profesional disponible para ese servicio.", 409);
  const avail = await availability(input.barberSlug, input.serviceSlug, input.date);
  const slot = avail.slots.find(s => s.time === input.time && s.available);
  if (!slot) throw new BookingError("Ese horario ya no está disponible. Elige otro.", 409);
  const barber = info.eligible.find(b => b.slug === (input.barberSlug === "any" ? slot.barberSlug : input.barberSlug));
  if (!barber) throw new BookingError("Profesional no disponible.", 409);
  const token = randomBytes(32).toString("base64url"), hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await adminClient().rpc("create_booking", { p_barber: barber.id, p_service: info.service.id, p_starts: new Date(localBogota(input.date, input.time)).toISOString(), p_name: name, p_phone: phone, p_email: email, p_token_hash: hash, p_idempotency: idempotencyKey, p_requires_payment: false });
  if (error) {
    const message = (error.message ?? "").match(/horario_ocupado|horario_pasado|servicio_no_disponible|profesional_no_disponible/)?.[0];
    if (error.code === "P0001" || error.code === "23P01") throw new BookingError(({ horario_ocupado: "Ese horario acaba de ocuparse.", horario_pasado: "Ese horario ya pasó.", servicio_no_disponible: "El servicio ya no está disponible.", profesional_no_disponible: "El profesional no está disponible." } as Record<string,string>)[message ?? ""] ?? "No se pudo confirmar el horario.", 409);
    throw new Error("No se pudo guardar la reserva.");
  }
  const booking = Array.isArray(data) ? data[0] : data;
  const summary = { id: booking.id, token, service: info.service.slug, barber: barber.slug, date: input.date, time: input.time, price_cop: booking.price_cop, status: booking.status };
  await sendConfirmation(booking, info.service.name, barber.display_name, token);
  return summary;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
async function sendConfirmation(booking: { id: string; customer_email: string; starts_at: string; price_cop: number }, service: string, barber: string, token: string) {
  const site = process.env.SITE_URL ?? (process.env.NODE_ENV === "production" ? "https://elite-barber-tatto.com" : "http://localhost:3000");
  const url = `${site}/mi-reserva/${token}`;
  const date = new Intl.DateTimeFormat("es-CO", { timeZone: tz, dateStyle: "full", timeStyle: "short" }).format(new Date(booking.starts_at));
  const row = (label: string, value: string) => `<tr><td style="padding:12px 0;border-bottom:1px solid #262626;color:#8a8a8a;font-size:11px;letter-spacing:2px;text-transform:uppercase">${label}</td><td style="padding:12px 0;border-bottom:1px solid #262626;color:#fff;font-size:15px;font-weight:600;text-align:right">${value}</td></tr>`;
  // Diseño de marca Elite: tablas y estilos en línea para Gmail, Outlook y móviles.
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#141414;border:1px solid #2a2a2a;border-radius:18px;padding:36px 28px"><tr><td align="center"><img src="${site}/pwa/icons/elite-192.png" width="88" height="88" alt="Elite Barber &amp; Tattoo" style="display:block;border-radius:16px"><p style="margin:22px 0 6px;color:#e11d2e;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700">Reserva confirmada</p><h1 style="margin:0;color:#fff;font-size:28px;letter-spacing:1px;text-transform:uppercase">Te esperamos</h1><p style="margin:10px 0 24px;color:#bdbdbd;font-size:15px">Tu cita en Elite Barber &amp; Tattoo quedó agendada.</p></td></tr><tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${row("Servicio", escapeHtml(service))}${row("Barbero", escapeHtml(barber))}${row("Fecha y hora", escapeHtml(date))}${row("Precio", `$${booking.price_cop.toLocaleString("es-CO")} COP`)}</table></td></tr><tr><td align="center" style="padding-top:28px"><a href="${url}" style="display:inline-block;background:#fff;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:16px 28px;border-radius:12px">Ver o cancelar mi cita</a><p style="margin:26px 0 0;color:#8a8a8a;font-size:13px;line-height:1.6">${escapeHtml(businessAddress)}<br>WhatsApp ${escapeHtml(whatsappDisplay)}</p></td></tr></table><p style="margin:18px 0 0;color:#5c5c5c;font-size:11px">Si no hiciste esta reserva, ignora este correo.</p></td></tr></table></body></html>`;
  let sent = false, failure = "RESEND_API_KEY no configurada";
  try {
    if (process.env.RESEND_API_KEY) {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.RESEND_FROM ?? "Elite Barber & Tattoo <reservas@elite-barber-tatto.com>", to: [booking.customer_email], subject: "Tu reserva en Elite Barber & Tattoo", html }) });
      sent = response.ok; if (!sent) failure = `Resend respondió ${response.status}`;
    }
  } catch (e) { failure = e instanceof Error ? e.message : "Error al enviar correo"; }
  const db = adminClient();
  const { data: existing } = await db.from("notifications").select("id,attempts").eq("booking_id", booking.id).eq("channel", "email").eq("template", "confirmacion").maybeSingle();
  const values = { channel: "email", template: "confirmacion", sent_at: sent ? new Date().toISOString() : null, last_error: sent ? null : failure, attempts: (existing?.attempts ?? 0) + 1 };
  if (existing) await db.from("notifications").update(values).eq("id", existing.id);
  else await db.from("notifications").insert({ ...values, booking_id: booking.id });
}
