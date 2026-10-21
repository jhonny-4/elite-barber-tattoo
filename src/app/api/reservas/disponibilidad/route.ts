import { availability } from "../../../../server/bookings";
import { errorResponse, noStore } from "../../../../server/bookings/http";
export async function GET(request: Request) {
  const url = new URL(request.url); const barber = url.searchParams.get("barbero") ?? "any", service = url.searchParams.get("servicio") ?? "", date = url.searchParams.get("fecha") ?? "";
  try { return Response.json(await availability(barber, service, date), { headers: noStore }); } catch (e) { return errorResponse(e); }
}
