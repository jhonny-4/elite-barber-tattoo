import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Bold (botón de pagos). Referencia oficial:
 * - Firma de integridad: SHA-256 hex de `{orderId}{monto}{divisa}{llaveSecreta}`, siempre en servidor.
 * - Webhook: cabecera `x-bold-signature` = HMAC-SHA256 hex, con la llave secreta,
 *   del cuerpo crudo codificado en Base64. En modo pruebas la llave es una cadena vacía.
 * Funciones puras (sin "server-only") para poder probarlas con node --test.
 */

export const boldEnabled = () =>
  process.env.BOLD_ENABLED === "true" &&
  Boolean(process.env.BOLD_IDENTITY_KEY) &&
  process.env.BOLD_SECRET_KEY !== undefined;

export const orderRefFor = (bookingId: string) => `ELT${bookingId.replace(/-/g, "")}`;

export function integritySignature(orderId: string, amount: number, currency: string, secret: string) {
  return createHash("sha256").update(`${orderId}${amount}${currency}${secret}`).digest("hex");
}

export function verifyWebhook(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const encoded = Buffer.from(rawBody, "utf8").toString("base64");
  const expected = createHmac("sha256", secret).update(encoded).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature.toLowerCase(), "hex"));
}

export type BoldCheckout = {
  apiKey: string;
  orderId: string;
  amount: number;
  currency: "COP";
  signature: string;
  description: string;
  redirectionUrl: string;
};

export function checkoutFor(orderId: string, amount: number, description: string, redirectionUrl: string): BoldCheckout {
  return {
    apiKey: process.env.BOLD_IDENTITY_KEY ?? "",
    orderId,
    amount,
    currency: "COP",
    signature: integritySignature(orderId, amount, "COP", process.env.BOLD_SECRET_KEY ?? ""),
    description,
    redirectionUrl,
  };
}
