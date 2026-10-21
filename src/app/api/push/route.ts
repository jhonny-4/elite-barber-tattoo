import { getStaff } from "../../../server/auth/staff";
import { BookingError } from "../../../server/bookings";
import { errorResponse, noStore, readJson, sameOrigin } from "../../../server/bookings/http";
import { vapidPublicKey } from "../../../server/notify/push";
import { adminClient } from "../../../server/supabase/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Endpoint de un servicio push: https y tamaño acotado. */
const validEndpoint = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 1000) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};
const validKey = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{16,200}={0,2}$/.test(value);

async function staffOrThrow(request: Request) {
  if (!sameOrigin(request)) throw new BookingError("Origen no permitido.", 403);
  const staff = await getStaff();
  if (!staff) throw new BookingError("Inicia sesión como parte del equipo.", 401);
  return staff;
}

/** Clave pública VAPID (no es secreta) para que el navegador cree la suscripción. */
export async function GET() {
  const publicKey = vapidPublicKey();
  if (!publicKey) return Response.json({ error: "Avisos push no configurados." }, { status: 503, headers: noStore });
  return Response.json({ publicKey }, { headers: noStore });
}

/** Guarda la suscripción del dispositivo para el usuario de la sesión (nunca el enviado por el cliente). */
export async function POST(request: Request) {
  try {
    const staff = await staffOrThrow(request);
    if (!vapidPublicKey()) throw new BookingError("Avisos push no configurados.", 503);
    const body = await readJson(request, 4096);
    const keys = body.keys as Record<string, unknown> | undefined;
    if (!validEndpoint(body.endpoint) || !keys || !validKey(keys.p256dh) || !validKey(keys.auth)) throw new BookingError("Suscripción inválida.");
    // Cliente admin tras validar la sesión: si el dispositivo ya estaba ligado a otro usuario
    // (cambio de sesión), RLS impediría reasignarlo; el user_id sale siempre del servidor.
    const { error } = await adminClient()
      .from("staff_push_subscriptions")
      .upsert({ user_id: staff.userId, endpoint: body.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }, { onConflict: "endpoint" });
    if (error) throw new Error("No se pudo guardar la suscripción.");
    return Response.json({ ok: true }, { status: 201, headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Quita la suscripción de este dispositivo; solo si pertenece al usuario de la sesión. */
export async function DELETE(request: Request) {
  try {
    const staff = await staffOrThrow(request);
    const body = await readJson(request, 4096);
    if (!validEndpoint(body.endpoint)) throw new BookingError("Suscripción inválida.");
    const { error } = await adminClient().from("staff_push_subscriptions").delete().eq("endpoint", body.endpoint).eq("user_id", staff.userId);
    if (error) throw new Error("No se pudo quitar la suscripción.");
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
