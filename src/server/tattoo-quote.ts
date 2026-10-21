import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { businessAddress, instagramHandle, instagramUrl, whatsappDisplay } from "../domain/business";

export const siteUrl = () =>
  process.env.SITE_URL ?? (process.env.NODE_ENV === "production" ? "https://elite-barber-tatto.com" : "http://localhost:3000");

/** Token del enlace privado: 32 bytes aleatorios; en la base solo vive su hash SHA-256. */
export function newQuoteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashQuoteToken(token) };
}
export const hashQuoteToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const validQuoteToken = (token: string) => /^[A-Za-z0-9_-]{40,60}$/.test(token);

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const cop = (n: number) => `$${n.toLocaleString("es-CO")}`;

/**
 * Envía el correo de la cotización con la estética Elite (negro/rojo, tablas y estilos en línea para
 * Gmail/Outlook). Devuelve si Resend lo aceptó; el motivo del fallo solo va al log del servidor.
 */
export async function sendQuoteEmail(input: {
  id: string;
  token: string;
  to: string;
  name: string;
  quote: number;
  deposit: number;
  notes: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "RESEND_API_KEY no configurada" };
  const site = siteUrl();
  const url = `${site}/cotizacion/${input.token}`;
  const first = escapeHtml(input.name.trim().split(/\s+/)[0] ?? "");
  const font = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif";
  const row = (label: string, value: string, last = false) =>
    `<tr><td style="padding:16px 0;${last ? "" : "border-bottom:1px solid #222;"}color:#7d7d7d;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;${font}">${label}</td><td align="right" style="padding:16px 0;${last ? "" : "border-bottom:1px solid #222;"}color:#f5f5f5;font-size:15px;font-weight:600;${font}">${value}</td></tr>`;
  const notes = input.notes.trim()
    ? `<tr><td style="padding-top:18px"><p style="margin:0;padding:16px 18px;background:#0a0a0a;border:1px solid #232323;border-radius:14px;color:#bdbdbd;font-size:14px;line-height:1.6;${font}">${escapeHtml(input.notes.trim()).replace(/\n/g, "<br>")}</p></td></tr>`
    : "";
  const html = `<!doctype html><html lang="es"><head><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"></head><body style="margin:0;padding:0;background:#050505">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Tu cotización de tatuaje en Elite: ${escapeHtml(cop(input.quote))} COP.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:36px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="padding:8px 0 28px"><img src="${site}/email/elite-logo.png" width="190" alt="Elite Barber &amp; Tattoo" style="display:block;width:190px;max-width:60%;height:auto;border:0"></td></tr>
<tr><td style="background:#101010;background-image:linear-gradient(160deg,#1a1a1a,#0b0b0b);border:1px solid #262626;border-radius:22px;padding:0;overflow:hidden">
<div style="height:3px;background:#e11d2e;background-image:linear-gradient(90deg,#e11d2e,#ff5a66,#e11d2e)"></div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:38px 32px 34px">
<tr><td align="center">
<p style="margin:0 0 14px;color:#e11d2e;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:800;${font}">&#9670; Cotización de tatuaje</p>
<h1 style="margin:0;color:#ffffff;font-size:32px;line-height:1.1;letter-spacing:1px;text-transform:uppercase;font-weight:900;${font}">${first ? `${first}, tu` : "Tu"} idea ya tiene precio</h1>
<p style="margin:12px 0 26px;color:#a8a8a8;font-size:15px;line-height:1.6;${font}">Jean Carlos revisó tu propuesta y preparó esta cotización. Revísala con calma y, si te convence, agenda tu sesión por WhatsApp.</p>
</td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${row("Valor del tatuaje", `${escapeHtml(cop(input.quote))} <span style="color:#7d7d7d;font-size:11px">COP</span>`)}${row("Abono para apartar", `${escapeHtml(cop(input.deposit))} <span style="color:#7d7d7d;font-size:11px">COP</span>`, true)}</table></td></tr>
${notes}
<tr><td align="center" style="padding-top:26px">
<a href="${url}" style="display:inline-block;background:#ffffff;background-image:linear-gradient(180deg,#ffffff,#d9d9d9);color:#0a0a0a;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:2.5px;text-transform:uppercase;padding:18px 34px;border-radius:14px;border-bottom:4px solid #8f8f8f;${font}">Ver mi cotización &#8599;</a>
</td></tr>
</table></td></tr>
<tr><td align="center" style="padding:28px 16px 0;color:#6f6f6f;font-size:12px;line-height:1.8;${font}">
${escapeHtml(businessAddress)}<br>WhatsApp ${escapeHtml(whatsappDisplay)} &nbsp;·&nbsp; <a href="${instagramUrl}" style="color:#bdbdbd;text-decoration:none">${escapeHtml(instagramHandle)}</a><br>
<span style="color:#4a4a4a">Este enlace es personal. Si no solicitaste un tatuaje en Elite, ignora este correo.</span>
</td></tr></table></td></tr></table></body></html>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `tattoo-quote-${input.id}-${input.token.slice(0, 12)}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Elite Barber & Tattoo <reservas@elite-barber-tatto.com>",
        to: [input.to],
        subject: "Tu cotización de tatuaje · Elite Barber & Tattoo",
        html,
      }),
    });
    return response.ok ? { sent: true as const } : { sent: false as const, reason: `Resend respondió ${response.status}` };
  } catch (e) {
    return { sent: false as const, reason: e instanceof Error ? e.message : "Error al enviar el correo" };
  }
}
