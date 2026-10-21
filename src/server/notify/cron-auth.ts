import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Verifica `Authorization: Bearer <CRON_SECRET>`. Pura (sin "server-only") para node --test.
 * Se comparan los SHA-256 de ambos valores: misma longitud siempre, así timingSafeEqual
 * no revela por el tiempo ni el contenido ni la longitud del secreto.
 * Sin secreto configurado (o demasiado corto) nunca autoriza.
 */
export function cronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 32 || !header) return false;
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(match[1]), digest(secret));
}
