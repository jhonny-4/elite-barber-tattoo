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
console.log(
  `${passed} comprobaciones HTTP aprobadas; sin crear reservas, turnos ni enviar correos.`,
);
