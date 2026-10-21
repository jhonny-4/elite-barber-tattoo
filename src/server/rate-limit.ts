import { BookingError } from "./bookings";
const buckets = new Map<string, { count: number; until: number }>();
/** Límite por proceso; el proveedor debe limitar tráfico antes de la app al escalar. */
export function limitPublic(request: Request, scope: string) {
  const now = Date.now();
  for (const [key, value] of buckets)
    if (value.until <= now) buckets.delete(key);
  const ip =
    // La última IP la añade el proxy de Hostinger; las primeras las puede inventar el cliente.
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";
  const key = `${scope}:${ip}`,
    current = buckets.get(key) ?? { count: 0, until: now + 600000 };
  if (current.count >= 5 || (buckets.size >= 10000 && !buckets.has(key)))
    throw new BookingError("Demasiados intentos. Espera unos minutos.", 429);
  current.count++;
  buckets.set(key, current);
}
