import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { actions, detailRow, detailTable, emailLayout, font, primaryButton } from "./notify/email";

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
  // Misma plantilla clara de marca que el resto de correos (legible con modo oscuro de Gmail).
  const copLabel = (n: number) => `${escapeHtml(cop(n))} <span style="color:#6b6b6b;font-size:11px">COP</span>`;
  const notes = input.notes.trim()
    ? `<tr><td style="padding-top:18px"><p style="margin:0;padding:16px 18px;background:#f6f5f2;border:1px solid #e7e5e1;border-radius:14px;color:#333333;font-size:14px;line-height:1.6;${font}">${escapeHtml(input.notes.trim()).replace(/\n/g, "<br>")}</p></td></tr>`
    : "";
  const html = emailLayout({
    preheader: `Tu cotización de tatuaje en Elite: ${escapeHtml(cop(input.quote))} COP.`,
    eyebrow: "&#9670; Cotización de tatuaje",
    title: `${first ? `${first}, tu` : "Tu"} idea ya tiene precio`,
    intro: "Jean Carlos revisó tu propuesta y preparó esta cotización. Revísala con calma y, si te convence, agenda tu sesión.",
    content:
      detailTable(detailRow("Valor del tatuaje", copLabel(input.quote)) + detailRow("Abono para apartar", copLabel(input.deposit), true)) +
      notes +
      actions(primaryButton(url, "Ver mi cotización &#8599;")),
    footerNote: "Este enlace es personal. Si no solicitaste un tatuaje en Elite, ignora este correo.",
  });
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
