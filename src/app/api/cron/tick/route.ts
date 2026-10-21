import { cronAuthorized } from "../../../../server/notify/cron-auth";
import { runTick } from "../../../../server/notify/tick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/**
 * Tick del cron (pg_cron + pg_net cada 5 min). Solo con `Authorization: Bearer ${CRON_SECRET}`.
 * Sin CRON_SECRET configurado responde 401 siempre: nunca queda abierto por omisión.
 */
export async function POST(request: Request) {
  if (!cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET))
    return Response.json({ error: "No autorizado." }, { status: 401, headers: noStore });
  const { ok, report } = await runTick();
  return Response.json({ ok, report }, { status: ok ? 200 : 500, headers: noStore });
}
