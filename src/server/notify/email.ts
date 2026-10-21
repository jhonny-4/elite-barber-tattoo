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

// Paleta clara: Gmail (iOS/Android) invierte los correos oscuros y vuelve ilegible el texto;
// un diseño claro se invierte de forma legible. La marca va en una imagen (no se invierte).
const ink = "#111111", muted = "#6b6b6b", line = "#e7e5e1", accent = "#c8102e";

/** Fila etiqueta/valor; `value` ya debe venir escapado. */
export const detailRow = (label: string, value: string, last = false) =>
  `<tr><td style="padding:15px 0;${last ? "" : `border-bottom:1px solid ${line};`}color:${muted};font-size:11px;letter-spacing:2px;text-transform:uppercase;${font}">${label}</td><td align="right" style="padding:15px 0;${last ? "" : `border-bottom:1px solid ${line};`}color:${ink};font-size:15px;font-weight:700;${font}">${value}</td></tr>`;

export const ghostButton = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;margin:6px 4px;padding:12px 20px;border:1.5px solid ${ink};border-radius:999px;color:${ink};text-decoration:none;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:800;${font}">${label}</a>`;

/** Botón principal negro con relieve (borde inferior), legible también invertido. */
export const primaryButton = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td bgcolor="${ink}" style="background:${ink};border-radius:14px;border-bottom:4px solid #000000"><a href="${href}" style="display:inline-block;padding:18px 34px;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:2.5px;text-transform:uppercase;${font}">${label}</a></td></tr></table>`;

/** Bloque Fecha | Hora; ambos valores ya escapados. */
export const whenCard = (day: string, hour: string) => `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f6f5f2" style="background:#f6f5f2;border:1px solid ${line};border-radius:16px"><tr>
<td align="center" width="55%" style="padding:22px 10px;border-right:1px solid ${line}"><p style="margin:0;color:${muted};font-size:10px;letter-spacing:2.5px;text-transform:uppercase;${font}">Fecha</p><p style="margin:8px 0 0;color:${ink};font-size:18px;line-height:1.25;font-weight:800;text-transform:capitalize;${font}">${day}</p></td>
<td align="center" width="45%" style="padding:22px 10px"><p style="margin:0;color:${muted};font-size:10px;letter-spacing:2.5px;text-transform:uppercase;${font}">Hora</p><p style="margin:8px 0 0;color:${ink};font-size:26px;font-weight:900;${font}">${hour}</p></td>
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
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head><body style="margin:0;padding:0;background:#efede8">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#efede8" style="background:#efede8;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0"><img src="${site}/email/elite-header.png" width="560" alt="Elite Barber &amp; Tattoo · Cartagena" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:18px 18px 0 0"></td></tr>
<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${line};border-top:0;border-radius:0 0 18px 18px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:34px 30px 32px">
<tr><td align="center">
<p style="margin:0 0 12px;color:${accent};font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:800;${font}">${eyebrow}</p>
<h1 style="margin:0;color:${ink};font-size:30px;line-height:1.15;letter-spacing:0.5px;text-transform:uppercase;font-weight:900;${font}">${title}</h1>
<p style="margin:12px 0 28px;color:#4a4a4a;font-size:15px;line-height:1.6;${font}">${intro}</p>
</td></tr>
${content}
</table></td></tr>
<tr><td align="center" style="padding:24px 16px 0;color:${muted};font-size:12px;line-height:1.8;${font}">
<strong style="color:${ink};letter-spacing:2px;text-transform:uppercase;font-size:11px">Elite Barber &amp; Tattoo</strong><br>
${escapeHtml(businessAddress)}<br>WhatsApp ${escapeHtml(whatsappDisplay)} &nbsp;·&nbsp; <a href="${instagramUrl}" style="color:${ink};text-decoration:underline">${escapeHtml(instagramHandle)}</a><br>
<span style="color:#9a9a9a">${footerNote}</span>
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
