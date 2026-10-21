import "server-only";
import { adminClient } from "../supabase/clients";
import { businessAddress, instagramHandle, instagramUrl, whatsappDisplay } from "../../domain/business";

/**
 * Correo de marca Elite: tablas y estilos en línea (Gmail, Outlook, Apple Mail), logo PNG 2x
 * y texto de vista previa. Todo texto que venga de datos se escapa antes de llegar aquí.
 */
export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const siteUrl = () =>
  process.env.SITE_URL ?? (process.env.NODE_ENV === "production" ? "https://elite-barber-tatto.com" : "http://localhost:3000");

export const font = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif";

/** Fila etiqueta/valor; `value` ya debe venir escapado. */
export const detailRow = (label: string, value: string, last = false) =>
  `<tr><td style="padding:16px 0;${last ? "" : "border-bottom:1px solid #222;"}color:#7d7d7d;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;${font}">${label}</td><td align="right" style="padding:16px 0;${last ? "" : "border-bottom:1px solid #222;"}color:#f5f5f5;font-size:15px;font-weight:600;${font}">${value}</td></tr>`;

export const ghostButton = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;margin:6px 4px;padding:12px 18px;border:1px solid #3a3a3a;border-radius:999px;color:#e8e8e8;text-decoration:none;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;${font}">${label}</a>`;

export const primaryButton = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#ffffff;background-image:linear-gradient(180deg,#ffffff,#d9d9d9);color:#0a0a0a;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:2.5px;text-transform:uppercase;padding:18px 34px;border-radius:14px;border-bottom:4px solid #8f8f8f;${font}">${label}</a>`;

/** Bloque Fecha | Hora; ambos valores ya escapados. */
export const whenCard = (day: string, hour: string) => `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #232323;border-radius:16px"><tr>
<td align="center" width="50%" style="padding:22px 10px;border-right:1px solid #232323"><p style="margin:0;color:#7d7d7d;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;${font}">Fecha</p><p style="margin:8px 0 0;color:#fff;font-size:18px;font-weight:800;text-transform:capitalize;${font}">${day}</p></td>
<td align="center" width="50%" style="padding:22px 10px"><p style="margin:0;color:#7d7d7d;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;${font}">Hora</p><p style="margin:8px 0 0;color:#fff;font-size:26px;font-weight:900;${font}">${hour}</p></td>
</tr></table></td></tr>`;

export const detailTable = (rows: string) =>
  `<tr><td style="padding-top:10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>`;

/** Fila centrada con botón principal y, opcionalmente, botones secundarios. */
export const actions = (primary: string, ghosts = "") =>
  `<tr><td align="center" style="padding-top:26px">
${primary}${ghosts ? `\n<p style="margin:16px 0 0">${ghosts}</p>` : ""}
</td></tr>`;

export type Layout = {
  /** Texto de vista previa (ya escapado). */
  preheader: string;
  /** Rótulo rojo sobre el título (HTML de confianza). */
  eyebrow: string;
  /** Título (ya escapado). */
  title: string;
  /** Párrafo bajo el título (ya escapado). */
  intro: string;
  /** Filas `<tr>` adicionales dentro de la tarjeta. */
  content: string;
  /** Nota gris al pie (ya escapada). */
  footerNote: string;
};

export function emailLayout({ preheader, eyebrow, title, intro, content, footerNote }: Layout) {
  const site = siteUrl();
  return `<!doctype html><html lang="es"><head><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"></head><body style="margin:0;padding:0;background:#050505">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:36px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="padding:8px 0 28px"><img src="${site}/email/elite-logo.png" width="190" alt="Elite Barber &amp; Tattoo" style="display:block;width:190px;max-width:60%;height:auto;border:0"></td></tr>
<tr><td style="background:#101010;background-image:linear-gradient(160deg,#1a1a1a,#0b0b0b);border:1px solid #262626;border-radius:22px;padding:0;overflow:hidden">
<div style="height:3px;background:#e11d2e;background-image:linear-gradient(90deg,#e11d2e,#ff5a66,#e11d2e)"></div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:38px 32px 34px">
<tr><td align="center">
<p style="margin:0 0 14px;color:#e11d2e;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:800;${font}">${eyebrow}</p>
<h1 style="margin:0;color:#ffffff;font-size:34px;line-height:1.1;letter-spacing:1px;text-transform:uppercase;font-weight:900;${font}">${title}</h1>
<p style="margin:12px 0 30px;color:#a8a8a8;font-size:15px;line-height:1.6;${font}">${intro}</p>
</td></tr>
${content}
</table></td></tr>
<tr><td align="center" style="padding:28px 16px 0;color:#6f6f6f;font-size:12px;line-height:1.8;${font}">
${escapeHtml(businessAddress)}<br>WhatsApp ${escapeHtml(whatsappDisplay)} &nbsp;·&nbsp; <a href="${instagramUrl}" style="color:#bdbdbd;text-decoration:none">${escapeHtml(instagramHandle)}</a><br>
<span style="color:#4a4a4a">${footerNote}</span>
</td></tr></table></td></tr></table></body></html>`;
}

export type EmailRecord = {
  bookingId?: string | null;
  ticketId?: string | null;
  template: string;
};

export type SendResult = { sent: boolean; error: string | null };

/**
 * Envía con Resend (timeout 10 s). Con `record`, deja el resultado en notifications
 * (intentos y siguiente reintento con backoff de 1, 2, 4, 8 y 15 min).
 * `idempotencyKey` hace que Resend descarte reenvíos del mismo aviso durante 24 h,
 * aunque dos procesos lo intenten a la vez.
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  options: { idempotencyKey?: string; record?: EmailRecord } = {},
): Promise<SendResult> {
  let sent = false,
    failure = "RESEND_API_KEY no configurada";
  try {
    if (process.env.RESEND_API_KEY) {
      const headers: Record<string, string> = { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" };
      if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers,
        body: JSON.stringify({ from: process.env.RESEND_FROM ?? "Elite Barber & Tattoo <reservas@elite-barber-tatto.com>", to: Array.isArray(to) ? to : [to], subject, html }),
      });
      sent = response.ok;
      if (!sent) failure = `Resend respondió ${response.status}`;
    }
  } catch (e) {
    failure = e instanceof Error ? e.message : "Error al enviar correo";
  }
  if (options.record) await recordEmail(options.record, sent, failure);
  return { sent, error: sent ? null : failure };
}

async function recordEmail(record: EmailRecord, sent: boolean, failure: string) {
  const db = adminClient();
  const bookingId = record.bookingId ?? null,
    ticketId = record.ticketId ?? null;
  let query = db.from("notifications").select("id,attempts").eq("channel", "email").eq("template", record.template);
  query = bookingId ? query.eq("booking_id", bookingId) : query.is("booking_id", null);
  query = ticketId ? query.eq("ticket_id", ticketId) : query.is("ticket_id", null);
  const { data: existing, error: readError } = await query.maybeSingle();
  // El correo ya salió (o falló) y la reserva ya existe: un fallo del registro se informa
  // en los logs sin tumbar la respuesta al cliente. La clave de idempotencia evita dobles envíos.
  if (readError) {
    console.error("No se pudo leer el registro de correo.", record.template, readError.message);
    return;
  }
  const attempts = (existing?.attempts ?? 0) + 1;
  const values = {
    channel: "email",
    template: record.template,
    sent_at: sent ? new Date().toISOString() : null,
    last_error: sent ? null : failure,
    attempts,
    scheduled_for: new Date(Date.now() + Math.min(15, 2 ** (attempts - 1)) * 60000).toISOString(),
  };
  const { error } = existing
    ? await db.from("notifications").update(values).eq("id", existing.id)
    : await db.from("notifications").insert({ ...values, booking_id: bookingId, ticket_id: ticketId });
  if (error) console.error("No se pudo registrar el envío de correo.", record.template, error.message);
}
