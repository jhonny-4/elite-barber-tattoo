import { errorResponse, noStore, readJson, sameOrigin } from "../../../../server/bookings/http";
import { rescheduleBooking, rescheduleSlots } from "../../../../server/bookings/reschedule";
import { limitPublic } from "../../../../server/rate-limit";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    return Response.json(await rescheduleSlots(params.get("token"), params.get("fecha")), { headers: noStore });
  } catch (e) { return errorResponse(e); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origen no permitido." }, { status: 403, headers: noStore });
  const key = request.headers.get("idempotency-key");
  if (!key || !/^[A-Za-z0-9-]{8,100}$/.test(key)) return Response.json({ error: "Falta una referencia única válida." }, { status: 400, headers: noStore });
  try {
    limitPublic(request, "reprogramar");
    const body = await readJson(request);
    // La repetición del mismo cambio es idempotente por diseño (misma hora = no hace nada); la clave solo exige un intento deliberado.
    return Response.json(await rescheduleBooking({ token: body.token, date: body.date, time: body.time }), { headers: noStore });
  } catch (e) { return errorResponse(e); }
}
