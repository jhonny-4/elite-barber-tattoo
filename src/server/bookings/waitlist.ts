import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { adminClient } from "../supabase/clients";
import { actions, detailRow, detailTable, emailLayout, escapeHtml, primaryButton, sendEmail, siteUrl } from "../notify/email";
import { BookingError } from "./index";

const tz = "America/Bogota";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Cuántas personas se avisan por cada cupo liberado: evita una avalancha sobre una sola hora. */
const NOTIFY_PER_SLOT = 3;

const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const validDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;
/** Mismo criterio que las reservas: 10 dígitos colombianos, con o sin +57. */
const normalizePhone = (value: string) => {
  const t = value.trim();
  if (/^\+57[\d\s()-]+$/.test(t)) { const d = t.slice(3).replace(/\D/g, ""); return d.length === 10 ? `+57${d}` : ""; }
  const d = t.replace(/\D/g, "");
  return d.length === 10 ? d : "";
};

export type WaitlistInput = { serviceSlug: string; barberSlug: string; date: string; name: string; email: string; phone: string };

export async function joinWaitlist(input: WaitlistInput) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new BookingError("Datos inválidos.");
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input.phone === "string" ? normalizePhone(input.phone) : "";
  if (name.length < 2 || name.length > 80) throw new BookingError("El nombre debe tener entre 2 y 80 caracteres.");
  if (email.length > 254 || !emailRe.test(email)) throw new BookingError("Escribe un correo válido.");
  if (!phone) throw new BookingError("Escribe un teléfono colombiano válido de 10 dígitos o +57.");
  if (typeof input.serviceSlug !== "string" || typeof input.barberSlug !== "string") throw new BookingError("Datos inválidos.");
  const today = dayKey(new Date());
  if (!validDay(input.date) || input.date < today || input.date > addDays(today, 60)) throw new BookingError("Fecha fuera del periodo disponible.");
  const db = adminClient();
  const { data: service } = await db.from("services").select("id").eq("slug", input.serviceSlug).eq("active", true).maybeSingle();
  if (!service) throw new BookingError("Servicio no disponible.");
  let barberId: string | null = null;
  if (input.barberSlug !== "any") {
    const { data: barber } = await db.from("barbers").select("id").eq("slug", input.barberSlug).eq("active", true).maybeSingle();
    if (!barber) throw new BookingError("Profesional no disponible.");
    barberId = barber.id;
  }
  const { error } = await db.from("waitlist").insert({ service_id: service.id, barber_id: barberId, day: input.date, name, email, phone, token_hash: createHash("sha256").update(randomBytes(32)).digest("hex") });
  // 23505: ya estaba anotado ese día; para la persona el resultado es el mismo y no se revela si el correo existía.
  if (error && error.code !== "23505") throw new Error("No se pudo guardar tu solicitud.");
}

/**
 * Avisa a los primeros de la lista cuando una cita libera un hueco (cancelación o cambio de hora).
 * Nunca lanza: el aviso es un extra y no debe tumbar la cancelación del cliente que ya se guardó.
 */
export async function notifyWaitlist(freed: { serviceId: string; barberId: string; startsAt: string }) {
  try {
    if (Date.parse(freed.startsAt) <= Date.now() || !uuidRe.test(freed.barberId)) return;
    const day = dayKey(new Date(freed.startsAt));
    const db = adminClient();
    // barberId viene de la base y se valida como uuid: no hay texto del cliente dentro del filtro.
    const { data: candidates, error } = await db.from("waitlist").select("id").eq("service_id", freed.serviceId).eq("day", day).is("notified_at", null)
      .or(`barber_id.is.null,barber_id.eq.${freed.barberId}`).order("created_at").limit(NOTIFY_PER_SLOT);
    if (error || !candidates?.length) return;
    // Se reclama antes de enviar: dos cancelaciones simultáneas no avisan dos veces a la misma persona.
    const { data: claimed } = await db.from("waitlist").update({ notified_at: new Date().toISOString() }).in("id", candidates.map(c => c.id)).is("notified_at", null).select("id,name,email,barber_id");
    if (!claimed?.length) return;
    const [{ data: service }, { data: barber }] = await Promise.all([
      db.from("services").select("slug,name").eq("id", freed.serviceId).single(),
      db.from("barbers").select("slug,display_name").eq("id", freed.barberId).single(),
    ]);
    if (!service || !barber) return;
    const dayLabel = new Intl.DateTimeFormat("es-CO", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(new Date(freed.startsAt));
    for (const entry of claimed) {
      const query = new URLSearchParams({ servicio: service.slug, fecha: day });
      if (entry.barber_id) query.set("profesional", barber.slug);
      const url = `${siteUrl()}/reservar?${query}`;
      const first = escapeHtml(entry.name.trim().split(/\s+/)[0] ?? "");
      const rows = `${detailRow("Día", escapeHtml(dayLabel))}${detailRow("Servicio", escapeHtml(service.name), !entry.barber_id)}${entry.barber_id ? detailRow("Barbero", escapeHtml(barber.display_name), true) : ""}`;
      const html = emailLayout({
        preheader: `Se liberó un cupo el ${escapeHtml(dayLabel)} en Elite.`,
        eyebrow: "&#9670; Cupo disponible",
        title: `${first ? `${first}, se` : "Se"} liberó un cupo`,
        intro: "Cancelaron una cita del día que querías. Los cupos se ocupan rápido: reserva ahora si todavía te sirve.",
        content: [detailTable(rows), actions(primaryButton(url, "Reservar ahora &#8599;"))].join("\n"),
        footerNote: "Te escribimos porque te anotaste en la lista de espera. Solo te avisamos una vez por solicitud; si ya no lo necesitas, ignora este correo.",
      });
      const result = await sendEmail(entry.email, `Se liberó un cupo · ${dayLabel} · Elite Barber & Tattoo`, html, { idempotencyKey: `waitlist-${entry.id}` });
      // Si el correo falló, la persona vuelve a la lista para el próximo cupo en vez de perder su turno.
      if (!result.sent) await db.from("waitlist").update({ notified_at: null }).eq("id", entry.id);
    }
  } catch (e) {
    console.error("No se pudo avisar a la lista de espera.", e instanceof Error ? e.message : e);
  }
}
