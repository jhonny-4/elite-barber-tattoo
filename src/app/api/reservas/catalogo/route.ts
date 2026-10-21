import { catalog } from "../../../../server/bookings";
import { errorResponse, noStore } from "../../../../server/bookings/http";
import { boldEnabled } from "../../../../server/payments/bold";
export async function GET() { try { return Response.json({ ...(await catalog()), paymentsEnabled: boldEnabled() }, { headers: noStore }); } catch (e) { return errorResponse(e); } }
