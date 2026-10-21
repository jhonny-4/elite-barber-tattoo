import { createHmac } from "node:crypto";
import { after } from "next/server";
import { announceTicket } from "../../../server/notify/push";
import { adminClient } from "../../../server/supabase/clients";
import { BookingError } from "../../../server/bookings";
import { contact, queueCatalog, tokenHash } from "../../../server/public-forms";
import {
  noStore,
  sameOrigin,
  readJson,
  errorResponse,
} from "../../../server/bookings/http";
import type { PublicTicket } from "../../../services/contracts/demo";
import { limitPublic } from "../../../server/rate-limit";
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(
    new Date(),
  );
async function queueData() {
  const db = adminClient(),
    catalog = await queueCatalog();
  const { data, error } = await db
    .from("queue_tickets")
    .select("id,number,status,barber_id,service_id,access_token_hash")
    .eq("day", today())
    .order("number");
  if (error) throw new Error("No se pudo cargar la fila.");
  const waiting = (data ?? []).filter((t) => t.status === "esperando");
  // Espera estimada: lo que el mismo barbero tiene delante (en curso + en espera
  // antes), con la duración del servicio de cada uno, redondeada a 5 min.
  const minutesOf = (t: NonNullable<typeof data>[number]) =>
    catalog.services.find((s) => s.id === t.service_id)?.duration_min ?? 45;
  const estimate = (t: NonNullable<typeof data>[number]) => {
    if (t.status !== "esperando") return null;
    const ahead = (data ?? []).filter(
      (o) =>
        o.barber_id === t.barber_id &&
        (o.status === "llamado" ||
          o.status === "en_atencion" ||
          (o.status === "esperando" && o.number < t.number)),
    );
    const total = ahead.reduce((sum, o) => sum + minutesOf(o), 0);
    return Math.round(total / 5) * 5;
  };
  const format = (t: NonNullable<typeof data>[number]): PublicTicket => ({
    number: String(t.number).padStart(3, "0"),
    status: t.status.replace(
      "en_atencion",
      "en-atencion",
    ) as PublicTicket["status"],
    barber:
      catalog.barbers.find((b) => b.id === t.barber_id)?.display_name ??
      "Profesional",
    service:
      catalog.services.find((s) => s.id === t.service_id)?.name ?? "Servicio",
    position:
      t.status === "esperando"
        ? waiting.findIndex((w) => w.id === t.id) + 1
        : null,
    estimatedMinutes: estimate(t),
  });
  return { data: data ?? [], format, waiting };
}
export async function GET(request: Request) {
  try {
    const { data, format, waiting } = await queueData();
    const token = new URL(request.url).searchParams.get("ticket");
    if (token) {
      if (!/^[A-Za-z0-9_-]{40,60}$/.test(token))
        throw new BookingError("Turno no disponible.", 404);
      const item = data.find((t) => t.access_token_hash === tokenHash(token));
      if (!item) throw new BookingError("Turno no disponible para hoy.", 404);
      return Response.json(format(item), { headers: noStore });
    }
    return Response.json(
      {
        date: today(),
        revision: Date.now(),
        waiting: waiting.length,
        called: data.filter((t) => t.status === "llamado").map(format),
        serving: data.filter((t) => t.status === "en_atencion").map(format),
        // Hasta 30: el monitor reparte "siguientes" por barbero.
        next: waiting.slice(0, 30).map(format),
        connection: "supabase",
      },
      { headers: noStore },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request))
      throw new BookingError("Origen no permitido.", 403);
    limitPublic(request, "fila");
    const body = await readJson(request),
      input = body.input as Record<string, unknown>;
    if (!input || typeof input !== "object")
      throw new BookingError("Turno inválido.");
    const { name, phone } = contact(input),
      key = request.headers.get("idempotency-key");
    if (!key || !/^[a-f0-9-]{36}$/.test(key))
      throw new BookingError("Referencia inválida.");
    const catalog = await queueCatalog(),
      service = catalog.services.find((s) => s.slug === input.serviceId);
    const candidates = catalog.barbers.filter((b) =>
      catalog.links.some(
        (link) => link.barber_id === b.id && link.service_id === service?.id,
      ),
    );
    const { data: active, error: activeError } = await adminClient()
      .from("queue_tickets")
      .select("barber_id")
      .eq("day", today())
      .in("status", ["esperando", "llamado", "en_atencion"]);
    if (activeError) throw new Error("No se pudo consultar la fila.");
    const load = (id: string) =>
      (active ?? []).filter((t) => t.barber_id === id).length;
    const barber =
      input.barberId === "any"
        ? candidates.sort((a, b) => load(a.id) - load(b.id))[0]
        : candidates.find((b) => b.slug === input.barberId);
    if (!service || !barber)
      throw new BookingError("Elige servicio y profesional.");
    const token = createHmac("sha256", process.env.SUPABASE_SECRET_KEY!)
      .update(`queue:${key}`)
      .digest("base64url");
    const { error } = await adminClient().rpc("join_queue", {
      p_id: key,
      p_barber: barber.id,
      p_service: service.id,
      p_name: name,
      p_phone: phone,
      p_token_hash: tokenHash(token),
    });
    if (error)
      throw new BookingError(
        error.code === "P0001" ? error.message : "No se pudo guardar el turno.",
        409,
      );
    const { data, format } = await queueData(),
      item = data.find((t) => t.id === key);
    if (!item || item.access_token_hash !== tokenHash(token))
      throw new BookingError("No se pudo recuperar el turno.", 409);
    // Aviso al equipo después de responder; notifyStaffOnce evita repetirlo en reintentos.
    after(() =>
      announceTicket(item.id).catch((e) =>
        console.error("Push: aviso de turno fallido.", e instanceof Error ? e.message : e),
      ),
    );
    return Response.json(
      { token, ticket: format(item) },
      { status: 201, headers: noStore },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
