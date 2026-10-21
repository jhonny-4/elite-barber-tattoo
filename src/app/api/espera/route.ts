import { errorResponse, noStore, readJson, sameOrigin } from "../../../server/bookings/http";
import { joinWaitlist, type WaitlistInput } from "../../../server/bookings/waitlist";
import { limitPublic } from "../../../server/rate-limit";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origen no permitido." }, { status: 403, headers: noStore });
  try {
    limitPublic(request, "espera");
    const body = await readJson(request);
    await joinWaitlist(body as unknown as WaitlistInput);
    return Response.json({ ok: true }, { status: 201, headers: noStore });
  } catch (e) { return errorResponse(e); }
}
