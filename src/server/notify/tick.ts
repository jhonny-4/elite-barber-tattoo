import "server-only";
import { cleanOrphanVideos } from "../media/cleanup";
import { createHash } from "node:crypto";
import { adminClient } from "../supabase/clients";
import { tokenFor } from "../bookings";
import { directionsUrl, whatsappUrl } from "../../domain/business";
import { actions, detailRow, detailTable, emailLayout, escapeHtml, font, ghostButton, primaryButton, sendEmail, siteUrl, whenCard } from "./email";
import { bogotaDayRange, digestDay, reminderWindow, reviewWindow, type ReminderKind } from "./schedule";

const tz = "America/Bogota";
/** Reintentos por aviso fallido; el backoff lo marca scheduled_for (ver sendEmail). */
const MAX_ATTEMPTS = 3;

type Booking = {
  id: string;
  barber_id: string;
  customer_name: string;
  customer_email: string;
  starts_at: string;
  created_at: string;
  price_cop: number;
  idempotency_key: string | null;
  access_token_hash: string;
  services: { name: string } | null;
  barbers: { display_name: string } | null;
};
const bookingFields = "id,barber_id,customer_name,customer_email,starts_at,created_at,price_cop,idempotency_key,access_token_hash,services(name),barbers(display_name)";

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CO", { timeZone: tz, ...o }).format(new Date(iso));
const dayLabel = (iso: string) => fmt(iso, { weekday: "long", day: "numeric", month: "long" });
const hourLabel = (iso: string) => fmt(iso, { hour: "numeric", minute: "2-digit", hour12: true });
const firstName = (name: string) => escapeHtml(name.trim().split(/\s+/)[0] || "");
const cop = (n: number) => `$${n.toLocaleString("es-CO")}`;

/** Enlace privado de la cita, solo si el token derivado coincide con el guardado (citas del sistema actual). */
function bookingLink(b: Booking) {
  if (!b.idempotency_key) return null;
  const token = tokenFor(b.idempotency_key);
  return createHash("sha256").update(token).digest("hex") === b.access_token_hash ? `${siteUrl()}/mi-reserva/${token}` : null;
}

/**
 * Reserva el aviso en notifications. Devuelve true si este proceso debe enviarlo:
 * fila nueva, o fila previa sin enviar, con intentos disponibles y su reintento vencido.
 * La restricción única (cita, turno, canal, plantilla) impide duplicados entre ticks.
 */
async function claim(bookingId: string, template: string, now: number) {
  const db = adminClient();
  const { data, error } = await db
    .from("notifications")
    .upsert({ booking_id: bookingId, channel: "email", template, attempts: 0 }, { onConflict: "booking_id,ticket_id,channel,template", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(`No se pudo reservar el aviso ${template}.`);
  if (data?.length) return true;
  const { data: row, error: re } = await db
    .from("notifications")
    .select("sent_at,attempts,scheduled_for")
    .eq("booking_id", bookingId)
    .is("ticket_id", null)
    .eq("channel", "email")
    .eq("template", template)
    .maybeSingle();
  if (re) throw new Error(`No se pudo leer el aviso ${template}.`);
  return Boolean(row && !row.sent_at && row.attempts < MAX_ATTEMPTS && Date.parse(row.scheduled_for) <= now);
}

function reminderHtml(b: Booking, kind: ReminderKind) {
  const day = dayLabel(b.starts_at),
    hour = hourLabel(b.starts_at),
    first = firstName(b.customer_name);
  const link = bookingLink(b);
  const chat = `${whatsappUrl}?text=${encodeURIComponent(`Hola Elite, tengo una cita el ${day} a las ${hour}.`)}`;
  const soon = kind === "recordatorio_2h";
  return emailLayout({
    preheader: soon ? `Te esperamos hoy a las ${escapeHtml(hour)} en Elite.` : `Mañana a las ${escapeHtml(hour)} tienes cita en Elite.`,
    eyebrow: "&#9670; Recordatorio de cita",
    title: soon ? `${first ? `${first}, nos` : "Nos"} vemos en 2 horas` : `${first ? `${first}, mañana` : "Mañana"} es tu cita`,
    intro: soon
      ? "Tu silla está lista. Llega 5 minutos antes; si se te complica, escríbenos por WhatsApp."
      : "Te recordamos tu cita en Elite. Si necesitas cambiarla, hazlo desde tu enlace o escríbenos.",
    content: [
      whenCard(escapeHtml(day), escapeHtml(hour)),
      detailTable(`${detailRow("Servicio", escapeHtml(b.services?.name ?? "Servicio"))}${detailRow("Barbero", escapeHtml(b.barbers?.display_name ?? "Elite"), true)}`),
      link
        ? actions(primaryButton(link, "Ver mi cita &#8599;"), `${ghostButton(directionsUrl, "Cómo llegar")}${ghostButton(chat, "WhatsApp")}`)
        : actions(primaryButton(chat, "Escribir por WhatsApp &#8599;"), ghostButton(directionsUrl, "Cómo llegar")),
    ].join("\n"),
    footerNote: soon ? "Si ya no puedes asistir, avísanos para liberar el horario." : "Puedes cancelar desde el enlace hasta 2 horas antes.",
  });
}

async function sendReminders(kind: ReminderKind, now: number) {
  const w = reminderWindow(kind, now);
  const { data, error } = await adminClient()
    .from("bookings")
    .select(bookingFields)
    .eq("status", "confirmada")
    .gte("starts_at", w.from)
    .lt("starts_at", w.to)
    .limit(200);
  if (error) throw new Error("No se pudieron leer las citas para recordar.");
  let sent = 0;
  for (const b of (data ?? []) as unknown as Booking[]) {
    // Recién reservada: el correo de confirmación acaba de llegar; otro aviso sería ruido.
    if (now - Date.parse(b.created_at) < 60 * 60_000) continue;
    if (!(await claim(b.id, kind, now))) continue;
    const subject = kind === "recordatorio_2h" ? `En 2 horas · ${hourLabel(b.starts_at)} · Elite Barber & Tattoo` : `Mañana · ${hourLabel(b.starts_at)} · Elite Barber & Tattoo`;
    const r = await sendEmail(b.customer_email, subject, reminderHtml(b, kind), { idempotencyKey: `${kind}-${b.id}`, record: { bookingId: b.id, template: kind } });
    if (r.sent) sent++;
  }
  return sent;
}

async function sendReviews(now: number) {
  const w = reviewWindow(now);
  const { data, error } = await adminClient()
    .from("bookings")
    .select(bookingFields)
    .eq("status", "finalizada")
    .gte("ends_at", w.from)
    .lt("ends_at", w.to)
    .limit(200);
  if (error) throw new Error("No se pudieron leer las citas finalizadas.");
  let sent = 0;
  for (const b of (data ?? []) as unknown as Booking[]) {
    // La reseña se deja en la web con el enlace privado de la cita (citas del sistema actual).
    const link = bookingLink(b)?.replace("/mi-reserva/", "/resena/");
    if (!link || !(await claim(b.id, "resena", now))) continue;
    const first = firstName(b.customer_name);
    const html = emailLayout({
      preheader: "Gracias por venir a Elite. ¿Nos dejas tu opinión?",
      eyebrow: "&#9670; Gracias por venir",
      title: `${first ? `${first}, ¿cómo` : "¿Cómo"} te fue?`,
      intro: `Califica tu visita con ${escapeHtml(b.barbers?.display_name ?? "tu barbero")}: toma menos de un minuto y ayuda a otros a elegir.`,
      content: actions(primaryButton(link, "Calificar mi visita &#9733;"), ghostButton(`${whatsappUrl}?text=${encodeURIComponent("Hola Elite, quiero comentarles sobre mi visita.")}`, "Escribir por WhatsApp")),
      footerNote: "Recibes este correo porque tuviste una cita en Elite.",
    });
    const r = await sendEmail(b.customer_email, "¿Cómo te fue en Elite? · Elite Barber & Tattoo", html, { idempotencyKey: `resena-${b.id}`, record: { bookingId: b.id, template: "resena" } });
    if (r.sent) sent++;
  }
  return sent;
}

async function ownerEmails() {
  const db = adminClient();
  const { data, error } = await db.from("profiles").select("id").eq("role", "dueno");
  if (error) throw new Error("No se pudo leer el perfil del dueño.");
  const emails = await Promise.all(
    (data ?? []).map(async (p) => {
      const { data: u, error: ue } = await db.auth.admin.getUserById(p.id);
      if (ue) console.error("Resumen: no se pudo leer un usuario dueño.", ue.message);
      return u?.user?.email ?? null;
    }),
  );
  return [...new Set(emails.filter((e): e is string => Boolean(e)))];
}

async function sendDigest(now: number) {
  const day = digestDay(now);
  if (!day) return "fuera_de_horario" as const;
  const db = adminClient();
  const { data: claimed, error: ce } = await db.from("daily_digest").upsert({ day }, { onConflict: "day", ignoreDuplicates: true }).select("day");
  if (ce) throw new Error("No se pudo reservar el resumen diario.");
  if (!claimed?.length) {
    const { data: row, error: re } = await db.from("daily_digest").select("sent_at,attempts").eq("day", day).maybeSingle();
    if (re) throw new Error("No se pudo leer el resumen diario.");
    if (!row || row.sent_at || row.attempts >= MAX_ATTEMPTS) return "ya_enviado" as const;
  }
  const r = bogotaDayRange(day);
  const { data, error } = await db
    .from("bookings")
    .select(bookingFields)
    .in("status", ["confirmada", "en_atencion", "finalizada"])
    .gte("starts_at", r.from)
    .lt("starts_at", r.to)
    .order("starts_at");
  if (error) throw new Error("No se pudo leer la agenda del día.");
  const list = (data ?? []) as unknown as Booking[];
  const total = list.reduce((sum, b) => sum + b.price_cop, 0);
  const byBarber = new Map<string, Booking[]>();
  for (const b of list) {
    const name = b.barbers?.display_name ?? "Profesional";
    byBarber.set(name, [...(byBarber.get(name) ?? []), b]);
  }
  const sections = [...byBarber.entries()]
    .map(([name, items]) => {
      const subtotal = items.reduce((sum, b) => sum + b.price_cop, 0);
      const rows = items.map((b) => detailRow(escapeHtml(hourLabel(b.starts_at)), `${firstName(b.customer_name)} · ${escapeHtml(b.services?.name ?? "Servicio")}`)).join("");
      return `<tr><td style="padding-top:22px"><p style="margin:0;color:#e11d2e;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:800;${font}">${escapeHtml(name)} · ${items.length} ${items.length === 1 ? "cita" : "citas"}</p></td></tr>${detailTable(`${rows}${detailRow("Estimado", `${cop(subtotal)} <span style="color:#7d7d7d;font-size:11px">COP</span>`, true)}`)}`;
    })
    .join("\n");
  const label = dayLabel(`${day}T12:00:00-05:00`);
  const html = emailLayout({
    preheader: `${list.length} ${list.length === 1 ? "cita" : "citas"} hoy · ingresos estimados ${cop(total)} COP.`,
    eyebrow: "&#9670; Resumen del día",
    title: "Agenda de hoy",
    intro: `${escapeHtml(label)}. ${list.length ? `${list.length} ${list.length === 1 ? "cita confirmada" : "citas confirmadas"}.` : "No hay citas confirmadas todavía."}`,
    content: [
      detailTable(`${detailRow("Citas", String(list.length))}${detailRow("Ingresos estimados", `${cop(total)} <span style="color:#7d7d7d;font-size:11px">COP</span>`, true)}`),
      sections,
      actions(primaryButton(`${siteUrl()}/administracion`, "Abrir el panel &#8599;")),
    ].join("\n"),
    footerNote: "Estimado según el precio de cada cita al reservar; no incluye tatuajes ni turnos presenciales.",
  });
  const to = await ownerEmails();
  const result = to.length ? await sendEmail(to, `Agenda de hoy · ${list.length} ${list.length === 1 ? "cita" : "citas"} · Elite`, html, { idempotencyKey: `resumen-dia-${day}` }) : { sent: false, error: "Sin correo de dueño" };
  const { data: prev } = await db.from("daily_digest").select("attempts").eq("day", day).maybeSingle();
  const { error: ue } = await db
    .from("daily_digest")
    .update({ sent_at: result.sent ? new Date().toISOString() : null, attempts: (prev?.attempts ?? 0) + 1, last_error: result.error })
    .eq("day", day);
  if (ue) console.error("Resumen: no se pudo registrar el envío.", ue.message);
  return result.sent ? ("enviado" as const) : ("fallido" as const);
}

/**
 * Un paso del cron (cada 5 min). Idempotente: repetirlo no duplica correos.
 * Cada tarea corre aislada para que un fallo no impida las demás; los errores se informan.
 */
export async function runTick(now = Date.now()) {
  const tasks = {
    recordatorio_24h: () => sendReminders("recordatorio_24h", now),
    recordatorio_2h: () => sendReminders("recordatorio_2h", now),
    resena: () => sendReviews(now),
    resumen_dia: () => sendDigest(now),
    videos_huerfanos: () => cleanOrphanVideos(now),
    // Cita confirmada sin llegada 15 min después de su hora: «no asistió» y el horario se libera.
    no_asistio: async () => {
      const { data, error } = await adminClient().rpc("mark_no_shows");
      if (error) throw new Error("No se pudieron marcar las citas sin llegada.");
      return data;
    },
    reservas_expiradas: async () => {
      const { data, error } = await adminClient().rpc("expire_holds");
      if (error) throw new Error("No se pudieron expirar las reservas sin pago.");
      return data;
    },
  };
  const report: Record<string, unknown> = {};
  let ok = true;
  for (const [name, task] of Object.entries(tasks)) {
    try {
      report[name] = await task();
    } catch (e) {
      ok = false;
      report[name] = { error: e instanceof Error ? e.message : "Error" };
      console.error(`Cron: falló ${name}.`, e instanceof Error ? e.message : e);
    }
  }
  return { ok, report };
}
