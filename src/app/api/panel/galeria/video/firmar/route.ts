import { randomUUID } from "node:crypto";
import { BookingError } from "../../../../../../server/bookings";
import { errorResponse, noStore, readJson, sameOrigin } from "../../../../../../server/bookings/http";
import { requireStaffApi } from "../../../../../../server/panel/auth";
import { PENDING_MAX_PER_BARBER, VIDEO_TYPES, buildVideoKey, checkVideoDeclared, type VideoType } from "../../../../../../domain/gallery";
import { authorizeBarber, countPending, invalid } from "../../../../../../server/media/gallery";
import { R2_PREFIX, presignPut } from "../../../../../../server/media/r2";

export const runtime = "nodejs";
const SECONDS = 600;

/** Firma una subida directa a R2 (10 min). El archivo no pasa por este servidor. */
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new BookingError("Origen no permitido.", 403);
    const staff = await requireStaffApi();
    const body = await readJson(request);
    const barberId = await authorizeBarber(staff, body.barberId);
    invalid(checkVideoDeclared(body.contentType, body.size));
    if ((await countPending(barberId)) >= PENDING_MAX_PER_BARBER) throw new BookingError("Hay demasiadas piezas pendientes de aprobar.", 429);
    const contentType = body.contentType as VideoType;
    const key = buildVideoKey(R2_PREFIX, barberId, randomUUID(), VIDEO_TYPES[contentType]);
    const uploadUrl = await presignPut(key, contentType, SECONDS);
    return Response.json({ key, uploadUrl, contentType, expiresIn: SECONDS }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
