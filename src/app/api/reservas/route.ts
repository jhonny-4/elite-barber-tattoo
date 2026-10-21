import { createBooking, type BookingInput } from "../../../server/bookings";
import { errorResponse, noStore, readJson, sameOrigin } from "../../../server/bookings/http";
const windows = new Map<string, number[]>();
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origen no permitido." }, { status: 403, headers: noStore });
  const key = request.headers.get("idempotency-key"); if (!key || !/^[A-Za-z0-9-]{8,100}$/.test(key)) return Response.json({ error: "Falta una referencia única válida." }, { status: 400, headers: noStore });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown", now = Date.now(), recent = (windows.get(ip) ?? []).filter(t => now - t < 600_000);
  if (recent.length >= 5) return Response.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429, headers: noStore });
  recent.push(now); windows.set(ip, recent);
  try { const body = await readJson(request); const result = await createBooking(body as unknown as BookingInput, key); return Response.json(result, { status: 201, headers: noStore }); } catch (e) { return errorResponse(e); }
}
