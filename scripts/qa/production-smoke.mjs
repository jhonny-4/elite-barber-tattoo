import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = (process.argv[2] ?? "http://127.0.0.1:3011").replace(/\/$/, "");
let passed = 0;
async function check(path, status, options) {
  const r = await fetch(base + path, {
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
    ...options,
  });
  assert.equal(r.status, status, `${path}: ${r.status}, esperaba ${status}`);
  passed++;
  return r;
}
const release = await (await check("/release.json", 200)).json();
assert.equal(
  release.release,
  JSON.parse(
    await readFile(
      new URL("../../public/release.json", import.meta.url),
      "utf8",
    ),
  ).release,
);
const catalog = await (await check("/api/reservas/catalogo", 200)).json();
assert.ok(catalog.services.length && catalog.barbers.length, "Catálogo vacío");
const queue = await (await check("/api/fila", 200)).json();
assert.equal(queue.connection, "supabase");
assert.equal(
  /customer_name|customer_phone|access_token_hash/.test(JSON.stringify(queue)),
  false,
  "Datos privados en monitor",
);
await check("/api/equipo", 401);
const redirect = await check("/administracion", 307);
assert.ok(redirect.headers.get("location")?.includes("/ingresar"));
await check("/api/demo", 410);
await check("/api/fila", 403, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "https://example.invalid",
  },
  body: "{}",
});
await check("/api/tatuajes", 403, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "https://example.invalid",
  },
  body: "{}",
});

// --- Ampliación: todo de solo lectura o rechazado antes de escribir (no ocupa cupos). ---
for (const page of ["/", "/reservar", "/tatuaje", "/turnos", "/jean-carlos", "/ingresar", "/offline"]) {
  const html = await (await check(page, 200)).text();
  if (page === "/") {
    assert.match(html, /property="og:image" content="https:\/\//, "og:image debe ser absoluta");
    assert.ok(html.includes("wa.me/573016697908"), "WhatsApp oficial en portada");
  }
}
const catalogo = await (await check("/api/reservas/catalogo", 200)).json();
assert.ok(catalogo.services?.length && catalogo.barbers?.length, "Catálogo con servicios y barberos");
const manana = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
const disp = await (await check(`/api/reservas/disponibilidad?barbero=any&servicio=${catalogo.services[0].slug}&fecha=${manana}`, 200)).json();
assert.ok(Array.isArray(disp.slots), "Disponibilidad con horarios");
await check("/api/reservas/disponibilidad?barbero=any&servicio=corte&fecha=2020-01-01", 400);
// Reserva con correo inválido: el servidor la rechaza antes de tocar la base.
await check("/api/reservas", 400, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID(), Origin: base }, body: JSON.stringify({ barberSlug: "any", serviceSlug: "corte", date: manana, time: "10:00", name: "QA", phone: "3000000000", email: "no-es-correo" }) });
await check("/api/cron/tick", 401, { method: "POST" });
const push = await (await check("/api/push", 200)).json();
assert.ok(typeof push.publicKey === "string" && push.publicKey.length > 40, "Clave pública push");
await check("/api/pagos/bold", 503, { method: "POST", body: "{}" });
const reserva = await (await check(`/mi-reserva/${"A".repeat(43)}`, 200)).text();
assert.ok(reserva.includes("No encontramos"), "Enlace falso no revela reservas");
await check(`/api/reservas/reprogramar?token=${"A".repeat(43)}&fecha=${manana}`, 404);
console.log(
  `${passed} comprobaciones HTTP aprobadas; sin crear reservas, turnos ni enviar correos.`,
);
