// Flujo completo reservar → reprogramar a la hora siguiente → cancelar, SOLO contra Supabase local.
// Uso: npm run dev (con .env.local local) y luego `npm run qa:local`. Nunca toca la agenda oficial.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const env = readFileSync(".env.local", "utf8");
const supa = env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]?.trim() ?? "";
// Barrera: si la app local apuntara a producción, este flujo ocuparía cupos reales.
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(supa) || !/^http:\/\/(127\.0\.0\.1|localhost):/.test(base)) {
  console.error(`Abortado: solo se ejecuta contra Supabase y servidor locales (Supabase=${supa}, app=${base}).`);
  process.exit(1);
}
const json = { "Content-Type": "application/json", Origin: base };
const day = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
const cat = await (await fetch(`${base}/api/reservas/catalogo`)).json();
const service = cat.services[0].slug, barber = cat.barbers[0].slug;
const libres = (await (await fetch(`${base}/api/reservas/disponibilidad?barbero=${barber}&servicio=${service}&fecha=${day}`)).json()).slots.filter((s) => s.available);
assert.ok(libres.length > 2, "Hay horas libres para probar");

const crear = await fetch(`${base}/api/reservas`, { method: "POST", headers: { ...json, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ barberSlug: barber, serviceSlug: service, date: day, time: libres[0].time, name: "QA Local", phone: "3000000077", email: "qa@example.invalid" }) });
const reserva = await crear.json();
assert.equal(crear.status, 201, JSON.stringify(reserva));
console.log("✓ reserva creada", day, libres[0].time);

// La hora contigua debe ofrecerse al reprogramar (la cita propia no cuenta como ocupada).
const sel = await (await fetch(`${base}/api/reservas/reprogramar?token=${reserva.token}&fecha=${day}`)).json();
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const contigua = sel.slots.find((s) => s.available && toMin(s.time) === toMin(libres[0].time) + 15);
assert.ok(contigua, "La hora siguiente aparece libre para reprogramar");
const rep = await fetch(`${base}/api/reservas/reprogramar`, { method: "POST", headers: { ...json, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ token: reserva.token, date: day, time: contigua.time }) });
assert.equal(rep.status, 200, await rep.text());
console.log("✓ reprogramada a la hora siguiente", contigua.time);

const pagina = await (await fetch(`${base}/mi-reserva/${reserva.token}`)).text();
assert.ok(pagina.includes("Detalles de tu cita"), "Página privada muestra la cita");
console.log("✓ enlace privado funciona");
console.log("Listo. La cita de prueba queda en la base LOCAL (se limpia con npm run db:reset).");
