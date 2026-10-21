import { after } from "next/server";
import { createBooking, type BookingInput } from "../../../server/bookings";
import { announceBooking } from "../../../server/notify/push";
import { errorResponse, noStore, readJson, sameOrigin } from "../../../server/bookings/http";
import { limitPublic } from "../../../server/rate-limit";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origen no permitido." }, { status: 403, headers: noStore });
  const key = request.headers.get("idempotency-key"); if (!key || !/^[A-Za-z0-9-]{8,100}$/.test(key)) return Response.json({ error: "Falta una referencia única válida." }, { status: 400, headers: noStore });
  try { limitPublic(request,"reservas"); const body = await readJson(request); const result = await createBooking(body as unknown as BookingInput, key);
    // Aviso al equipo después de responder: un fallo de push nunca afecta la reserva.
    if (result.status === "confirmada") after(() => announceBooking(result.id).catch(e => console.error("Push: aviso de reserva fallido.", e instanceof Error ? e.message : e)));
    return Response.json(result, { status: 201, headers: noStore }); } catch (e) { return errorResponse(e); }
}
