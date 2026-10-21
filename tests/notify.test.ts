import { test } from "node:test";
import assert from "node:assert/strict";
import { bogotaDayRange, digestDay, reminderWindow, reviewWindow } from "../src/server/notify/schedule.ts";
import { cronAuthorized } from "../src/server/notify/cron-auth.ts";

const at = (iso: string) => Date.parse(iso);
const inside = (w: { from: string; to: string }, iso: string) => iso >= w.from && iso < w.to;

test("Recordatorio 24 h: ventana [23h45, 24h15) desde ahora", () => {
  const now = at("2026-10-21T15:00:00.000Z");
  const w = reminderWindow("recordatorio_24h", now);
  assert.deepEqual(w, { from: "2026-10-22T14:45:00.000Z", to: "2026-10-22T15:15:00.000Z" });
  assert.ok(inside(w, "2026-10-22T15:00:00.000Z"));
  assert.ok(!inside(w, "2026-10-22T15:15:00.000Z"));
  assert.ok(!inside(w, "2026-10-22T14:44:59.000Z"));
});

test("Recordatorio 2 h: ventana [1h45, 2h15); ticks de 5 min no dejan huecos", () => {
  const now = at("2026-10-21T15:00:00.000Z");
  assert.deepEqual(reminderWindow("recordatorio_2h", now), { from: "2026-10-21T16:45:00.000Z", to: "2026-10-21T17:15:00.000Z" });
  // Una cita a las 17:00Z cae en al menos una ventana de cualquier tick cada 5 min.
  const start = "2026-10-21T17:00:00.000Z";
  const hits = Array.from({ length: 12 }, (_, i) => now - 30 * 60_000 + i * 5 * 60_000).filter((t) => inside(reminderWindow("recordatorio_2h", t), start));
  assert.ok(hits.length >= 5);
});

test("Reseña: finalizadas cuyo fin fue hace 1 a 3 horas", () => {
  const now = at("2026-10-21T20:00:00.000Z");
  const w = reviewWindow(now);
  assert.deepEqual(w, { from: "2026-10-21T17:00:00.000Z", to: "2026-10-21T19:00:00.000Z" });
  assert.ok(!inside(w, "2026-10-21T19:30:00.000Z"));
});

test("Resumen diario: solo de 8:00 a 8:14 hora de Bogotá", () => {
  assert.equal(digestDay(at("2026-10-21T13:00:00.000Z")), "2026-10-21"); // 8:00 Bogotá
  assert.equal(digestDay(at("2026-10-21T13:14:59.000Z")), "2026-10-21");
  assert.equal(digestDay(at("2026-10-21T13:15:00.000Z")), null);
  assert.equal(digestDay(at("2026-10-21T12:59:00.000Z")), null);
  assert.equal(digestDay(at("2026-10-21T08:00:00.000Z")), null); // 8:00 UTC = 3:00 Bogotá
  assert.deepEqual(bogotaDayRange("2026-10-21"), { from: "2026-10-21T05:00:00.000Z", to: "2026-10-22T05:00:00.000Z" });
});

test("Cron: secreto Bearer exacto; sin secreto configurado nunca autoriza", () => {
  const secret = "s".repeat(40);
  assert.equal(cronAuthorized(`Bearer ${secret}`, secret), true);
  assert.equal(cronAuthorized(`Bearer ${secret}x`, secret), false);
  assert.equal(cronAuthorized(`Bearer ${secret.slice(1)}`, secret), false);
  assert.equal(cronAuthorized(secret, secret), false);
  assert.equal(cronAuthorized(`bearer ${secret}`, secret), false);
  assert.equal(cronAuthorized(null, secret), false);
  assert.equal(cronAuthorized("Bearer ", ""), false);
  assert.equal(cronAuthorized("Bearer undefined", undefined), false);
  assert.equal(cronAuthorized("Bearer corto", "corto"), false); // secreto débil: rechazado
});

import { isPushEndpoint } from "../src/domain/push-endpoint.ts";
test("push: solo servicios oficiales, sin IP, puerto ni http", () => {
  assert.equal(isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc"), true);
  assert.equal(isPushEndpoint("https://web.push.apple.com/xyz"), true);
  assert.equal(isPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=1"), true);
  for (const bad of ["http://fcm.googleapis.com/x", "https://127.0.0.1/x", "https://fcm.googleapis.com:8443/x", "https://evil.com/fcm.googleapis.com", "https://fcm.googleapis.com.evil.com/x", "https://169.254.169.254/latest"])
    assert.equal(isPushEndpoint(bad), false, bad);
});
