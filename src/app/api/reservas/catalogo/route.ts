import { catalog } from "../../../../server/bookings";
import { errorResponse, noStore } from "../../../../server/bookings/http";
export async function GET() { try { return Response.json(await catalog(), { headers: noStore }); } catch (e) { return errorResponse(e); } }
