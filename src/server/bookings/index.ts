import "server-only";
import { createHash, createHmac } from "node:crypto";
import { adminClient } from "../supabase/clients";
import { boldEnabled, checkoutFor, orderRefFor, type BoldCheckout } from "../payments/bold";
import { businessAddress, directionsUrl, instagramHandle, instagramUrl, whatsappDisplay, whatsappUrl } from "../../domain/business";
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
const validDate = (s: string) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(dateParts(s).getTime()) && dateParts(s).toISOString().slice(0, 10) === s;
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
  if (!service) throw new BookingError("Servicio no disponible.", 400);
  const { data: candidates, error } = await q;
  if (error) throw error;
  const eligible = (candidates ?? []).filter(b => bs?.some(x => x.barber_id === b.id && x.service_id === service.id));
  return { service, eligible, hours: hours ?? [], breaks: breaks ?? [] };
}

export async function availability(barberSlug: string, serviceSlug: string, date: string) {
  if (!validDate(date) || date < todayBogota() || date > shiftDate(todayBogota(), 60)) throw new BookingError("Fecha fuera del periodo disponible.", 400);
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

export async function createBooking(input: BookingInput, idempotencyKey: string): Promise<{id:string;token:string;service:string;barber:string;date:string;time:string;price_cop:number;status:string;payment?:BoldCheckout}> {
  if(!input || typeof input!=="object" || Array.isArray(input) || typeof input.date!=="string" || typeof input.time!=="string" || typeof input.barberSlug!=="string" || typeof input.serviceSlug!=="string") throw new BookingError("Datos de reserva inválidos.");
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const phone = typeof input.phone === "string" ? normalizePhone(input.phone) : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (name.length < 2 || name.length > 80) throw new BookingError("El nombre debe tener entre 2 y 80 caracteres.");
  if (!phone) throw new BookingError("Escribe un teléfono colombiano válido de 10 dígitos o +57.");
  if (email.length > 254 || !emailRe.test(email)) throw new BookingError("Escribe un correo válido.");
  if (!validDate(input.date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time) || toMin(input.time) % 15 !== 0) throw new BookingError("Fecha u hora inválida.");
  const db = adminClient();
  const token = tokenFor(idempotencyKey);
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: previous, error: previousError } = await db.from("bookings").select("*").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (previousError) throw new Error("No se pudo comprobar la reserva.");
  if (previous) {
    if (previous.access_token_hash !== hash || previous.customer_email !== email || previous.customer_phone !== phone || previous.customer_name !== name || Date.parse(previous.starts_at) !== localBogota(input.date,input.time)) throw new BookingError("Usa una referencia nueva para cambiar los datos de la reserva.",409);
    const [{data:s},{data:b}] = await Promise.all([db.from("services").select("slug,name").eq("id",previous.service_id).single(),db.from("barbers").select("slug,display_name").eq("id",previous.barber_id).single()]);
    if(!s || !b || s.slug!==input.serviceSlug || (input.barberSlug!=="any" && b.slug!==input.barberSlug)) throw new BookingError("La referencia pertenece a otra reserva.",409);
    const again = { id:previous.id,token,service:s.slug,barber:b.slug,date:input.date,time:input.time,price_cop:previous.price_cop,status:previous.status };
    // Reintento tras un corte de red: el cliente recupera su botón de pago.
    return previous.status === "pendiente_pago" && boldEnabled() ? { ...again, payment: checkoutFor(orderRefFor(previous.id), previous.price_cop, `${s.name} · Elite Barber & Tattoo`, `${siteUrl()}/mi-reserva/${token}`) } : again;
  }
  if (!validDate(input.date) || !/^\d{2}:\d{2}$/.test(input.time) || toMin(input.time) % 15 !== 0) throw new BookingError("Fecha u hora inválida.");
  if (toMin(input.time) >= 24 * 60) throw new BookingError("Hora inválida.");
  const info = await barbersFor(input.serviceSlug, input.barberSlug);
  if (!info.eligible.length) throw new BookingError("No hay profesional disponible para ese servicio.", 409);
  const avail = await availability(input.barberSlug, input.serviceSlug, input.date);
  const slot = avail.slots.find(s => s.time === input.time && s.available);
  if (!slot) {
    const {data:retry}=await db.from("bookings").select("id").eq("idempotency_key",idempotencyKey).maybeSingle();
    if(retry) return createBooking(input,idempotencyKey);
    throw new BookingError("Ese horario ya no está disponible. Elige otro.", 409);
  }
  if (boldEnabled()) {
    // Una sola cita pendiente de pago por contacto: evita apartar horarios sin pagar.
    // Dos consultas parametrizadas: el correo nunca se interpola en un filtro de texto.
    const pending = (column: "customer_email" | "customer_phone", value: string) =>
      db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pendiente_pago").gt("hold_expires_at", new Date().toISOString()).eq(column, value);
    const [byEmail, byPhone] = await Promise.all([pending("customer_email", email), pending("customer_phone", phone)]);
    if ((byEmail.count ?? 0) + (byPhone.count ?? 0) > 0) throw new BookingError("Ya tienes una reserva pendiente de pago. Complétala o espera unos minutos.", 409);
  }
  const barber = info.eligible.find(b => b.slug === (input.barberSlug === "any" ? slot.barberSlug : input.barberSlug));
  if (!barber) throw new BookingError("Profesional no disponible.", 409);
  const { data, error } = await adminClient().rpc("create_booking", { p_barber: barber.id, p_service: info.service.id, p_starts: new Date(localBogota(input.date, input.time)).toISOString(), p_name: name, p_phone: phone, p_email: email, p_token_hash: hash, p_idempotency: idempotencyKey, p_requires_payment: boldEnabled(), p_hold_minutes: 20 });
  if (error) {
    const message = (error.message ?? "").match(/horario_ocupado|horario_pasado|servicio_no_disponible|profesional_no_disponible/)?.[0];
    if (error.code === "P0001" || error.code === "23P01") throw new BookingError(({ horario_ocupado: "Ese horario acaba de ocuparse.", horario_pasado: "Ese horario ya pasó.", servicio_no_disponible: "El servicio ya no está disponible.", profesional_no_disponible: "El profesional no está disponible." } as Record<string,string>)[message ?? ""] ?? "No se pudo confirmar el horario.", 409);
    throw new Error("No se pudo guardar la reserva.");
  }
  const booking = Array.isArray(data) ? data[0] : data;
  const actualBarber=info.eligible.find(b=>b.id===booking.barber_id);
  if(!actualBarber || booking.access_token_hash!==hash || booking.customer_name!==name || booking.customer_phone!==phone || booking.customer_email!==email || booking.service_id!==info.service.id || Date.parse(booking.starts_at)!==localBogota(input.date,input.time)) throw new BookingError("La referencia pertenece a otra reserva.",409);
  const summary = { id: booking.id, token, service: info.service.slug, barber: actualBarber.slug, date: input.date, time: input.time, price_cop: booking.price_cop, status: booking.status };
  if (booking.status === "pendiente_pago") {
    // Pago total con Bold: la cita se confirma solo cuando el webhook firmado lo aprueba.
    const orderId = orderRefFor(booking.id);
    const { error: payError } = await db.from("payments").upsert({ booking_id: booking.id, order_ref: orderId, amount_cop: booking.price_cop }, { onConflict: "order_ref", ignoreDuplicates: true });
    if (payError) throw new Error("No se pudo preparar el pago.");
    return { ...summary, payment: checkoutFor(orderId, booking.price_cop, `${info.service.name} · Elite Barber & Tattoo`, `${siteUrl()}/mi-reserva/${token}`) };
  }
  await sendConfirmation(booking, info.service.name, actualBarber.display_name, token);
  return summary;
}

const siteUrl = () => process.env.SITE_URL ?? (process.env.NODE_ENV === "production" ? "https://elite-barber-tatto.com" : "http://localhost:3000");
/** Token del enlace privado: derivado de la clave de idempotencia, nunca guardado en claro. */
const tokenFor = (idempotencyKey: string) => createHmac("sha256", process.env.SUPABASE_SECRET_KEY!).update(`booking:${idempotencyKey}`).digest("base64url");

/** Confirma una cita pagada (webhook de Bold) y envía el correo. Idempotente. */
export async function confirmPaidBooking(bookingId: string) {
  const db = adminClient();
  const { data: b } = await db.from("bookings").update({ status: "confirmada", hold_expires_at: null, updated_at: new Date().toISOString() }).eq("id", bookingId).eq("status", "pendiente_pago").select("*, services(name), barbers(display_name)").maybeSingle();
  if (!b || !b.idempotency_key) return false;
  await sendConfirmation(b, b.services?.name ?? "Servicio", b.barbers?.display_name ?? "Elite", tokenFor(b.idempotency_key));
  return true;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export async function retryConfirmation(id:string) {
  const db=adminClient();
  const {data:b,error}=await db.from("bookings").select("*").eq("id",id).maybeSingle();
  if(error || !b || b.status!=="confirmada" || !b.idempotency_key) throw new BookingError("No hay una confirmación pendiente para esta cita.",409);
  const token=createHmac("sha256",process.env.SUPABASE_SECRET_KEY!).update(`booking:${b.idempotency_key}`).digest("base64url");
  if(createHash("sha256").update(token).digest("hex")!==b.access_token_hash) throw new BookingError("Esta cita fue creada con el sistema anterior. Conserva el enlace original.",409);
  const [{data:s},{data:barber}]=await Promise.all([db.from("services").select("name").eq("id",b.service_id).single(),db.from("barbers").select("display_name").eq("id",b.barber_id).single()]);
  if(!s || !barber) throw new Error("No se pudo leer la cita.");
  await sendConfirmation(b,s.name,barber.display_name,token);
}
async function sendConfirmation(booking: { id: string; customer_email: string; customer_name?: string; starts_at: string; price_cop: number }, service: string, barber: string, token: string) {
  const { data: delivered } = await adminClient().from("notifications").select("sent_at").eq("booking_id",booking.id).eq("channel","email").eq("template","confirmacion").maybeSingle();
  if(delivered?.sent_at) return;
  const site = siteUrl();
  const url = `${site}/mi-reserva/${token}`;
  const date = new Intl.DateTimeFormat("es-CO", { timeZone: tz, dateStyle: "full", timeStyle: "short" }).format(new Date(booking.starts_at));
  const when = new Date(booking.starts_at);
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CO", { timeZone: tz, ...o }).format(when);
  const day = fmt({ weekday: "long", day: "numeric", month: "long" });
  const hour = fmt({ hour: "numeric", minute: "2-digit", hour12: true });
  const first = escapeHtml((booking.customer_name ?? "").trim().split(/\s+/)[0] || "");
  const price = `$${booking.price_cop.toLocaleString("es-CO")}`;
  const reschedule = `${whatsappUrl}?text=${encodeURIComponent(`Hola Elite, quiero reprogramar mi cita del ${day} a las ${hour}.`)}`;
  const font = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif";
  const row = (label: string, value: string, last = false) => `<tr><td style="padding:16px 0;${last ? "" : "border-bottom:1px solid #222;"}color:#7d7d7d;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;${font}">${label}</td><td align="right" style="padding:16px 0;${last ? "" : "border-bottom:1px solid #222;"}color:#f5f5f5;font-size:15px;font-weight:600;${font}">${value}</td></tr>`;
  const ghost = (href: string, label: string) => `<a href="${href}" style="display:inline-block;margin:6px 4px;padding:12px 18px;border:1px solid #3a3a3a;border-radius:999px;color:#e8e8e8;text-decoration:none;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;${font}">${label}</a>`;
  // Correo de marca Elite: tablas y estilos en línea (Gmail, Outlook, Apple Mail), logo PNG 2x y texto de vista previa.
  const html = `<!doctype html><html lang="es"><head><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"></head><body style="margin:0;padding:0;background:#050505">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Tu cita en Elite está confirmada: ${escapeHtml(day)}, ${escapeHtml(hour)}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:36px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="padding:8px 0 28px"><img src="${site}/email/elite-logo.png" width="190" alt="Elite Barber &amp; Tattoo" style="display:block;width:190px;max-width:60%;height:auto;border:0"></td></tr>
<tr><td style="background:#101010;background-image:linear-gradient(160deg,#1a1a1a,#0b0b0b);border:1px solid #262626;border-radius:22px;padding:0;overflow:hidden">
<div style="height:3px;background:#e11d2e;background-image:linear-gradient(90deg,#e11d2e,#ff5a66,#e11d2e)"></div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:38px 32px 34px">
<tr><td align="center">
<p style="margin:0 0 14px;color:#e11d2e;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:800;${font}">&#9670; Reserva confirmada</p>
<h1 style="margin:0;color:#ffffff;font-size:34px;line-height:1.1;letter-spacing:1px;text-transform:uppercase;font-weight:900;${font}">${first ? `${first}, te` : "Te"} esperamos</h1>
<p style="margin:12px 0 30px;color:#a8a8a8;font-size:15px;line-height:1.6;${font}">Tu silla en Elite está apartada. Llega 5 minutos antes y nosotros nos encargamos del resto.</p>
</td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #232323;border-radius:16px"><tr>
<td align="center" width="50%" style="padding:22px 10px;border-right:1px solid #232323"><p style="margin:0;color:#7d7d7d;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;${font}">Fecha</p><p style="margin:8px 0 0;color:#fff;font-size:18px;font-weight:800;text-transform:capitalize;${font}">${escapeHtml(day)}</p></td>
<td align="center" width="50%" style="padding:22px 10px"><p style="margin:0;color:#7d7d7d;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;${font}">Hora</p><p style="margin:8px 0 0;color:#fff;font-size:26px;font-weight:900;${font}">${escapeHtml(hour)}</p></td>
</tr></table></td></tr>
<tr><td style="padding-top:10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${row("Servicio", escapeHtml(service))}${row("Barbero", escapeHtml(barber))}${row("Total", `${price} <span style="color:#7d7d7d;font-size:11px">COP</span>`, true)}</table></td></tr>
<tr><td align="center" style="padding-top:26px">
<a href="${url}" style="display:inline-block;background:#ffffff;background-image:linear-gradient(180deg,#ffffff,#d9d9d9);color:#0a0a0a;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:2.5px;text-transform:uppercase;padding:18px 34px;border-radius:14px;border-bottom:4px solid #8f8f8f;${font}">Ver o reprogramar mi cita &#8599;</a>
<p style="margin:16px 0 0">${ghost(directionsUrl, "Cómo llegar")}${ghost(reschedule, "WhatsApp")}</p>
</td></tr>
</table></td></tr>
<tr><td align="center" style="padding:28px 16px 0;color:#6f6f6f;font-size:12px;line-height:1.8;${font}">
${escapeHtml(businessAddress)}<br>WhatsApp ${escapeHtml(whatsappDisplay)} &nbsp;·&nbsp; <a href="${instagramUrl}" style="color:#bdbdbd;text-decoration:none">${escapeHtml(instagramHandle)}</a><br>
<span style="color:#4a4a4a">Puedes cancelar desde el enlace hasta 2 horas antes. Si no hiciste esta reserva, ignora este correo.</span>
</td></tr></table></td></tr></table></body></html>`;
  let sent = false, failure = "RESEND_API_KEY no configurada";
  try {
    if (process.env.RESEND_API_KEY) {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `booking-confirmation-${booking.id}` }, body: JSON.stringify({ from: process.env.RESEND_FROM ?? "Elite Barber & Tattoo <reservas@elite-barber-tatto.com>", to: [booking.customer_email], subject: `Cita confirmada · ${day}, ${hour} · Elite Barber & Tattoo`, html }) });
      sent = response.ok; if (!sent) failure = `Resend respondió ${response.status}`;
    }
  } catch (e) { failure = e instanceof Error ? e.message : "Error al enviar correo"; }
  const db = adminClient();
  const { data: existing } = await db.from("notifications").select("id,attempts").eq("booking_id", booking.id).eq("channel", "email").eq("template", "confirmacion").maybeSingle();
  const attempts=(existing?.attempts??0)+1;
  const values = { channel: "email", template: "confirmacion", sent_at: sent ? new Date().toISOString() : null, last_error: sent ? null : failure, attempts, scheduled_for:new Date(Date.now()+Math.min(15,2**(attempts-1))*60000).toISOString() };
  if (existing) await db.from("notifications").update(values).eq("id", existing.id);
  else await db.from("notifications").insert({ ...values, booking_id: booking.id });
}

export async function retryPendingConfirmations() {
  const db=adminClient();
  const {data,error}=await db.from("notifications").select("id,booking_id").eq("channel","email").eq("template","confirmacion").is("sent_at",null).lt("attempts",5).lte("scheduled_for",new Date().toISOString()).limit(10);
  if(error) throw new Error("No se pudo consultar la cola de correo.");
  for(const n of data??[]) {
    if(!n.booking_id) continue;
    try { await retryConfirmation(n.booking_id); }
    catch(e) { await db.from("notifications").update({attempts:5,last_error:e instanceof Error?e.message:"No se pudo recuperar la confirmación."}).eq("id",n.id); }
  }
}
