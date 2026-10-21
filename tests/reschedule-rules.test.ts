import test from "node:test";
import assert from "node:assert/strict";
import { checkReschedule, MAX_RESCHEDULES } from "../src/domain/booking/reschedule-rules.ts";

const now = Date.parse("2026-10-22T15:00:00Z");
const H = 60 * 60 * 1000;
const base = { status: "confirmada", now, rescheduleCount: 0 };

test("permite reprogramar con más de 2 horas", () => {
  assert.deepEqual(checkReschedule({ ...base, startsAt: now + 2 * H + 1 }), { ok: true });
});
test("a las 2 horas exactas o menos ya no se puede", () => {
  assert.deepEqual(checkReschedule({ ...base, startsAt: now + 2 * H }), { ok: false, reason: "fuera_de_ventana" });
  assert.deepEqual(checkReschedule({ ...base, startsAt: now - H }), { ok: false, reason: "fuera_de_ventana" });
});
test("solo las citas confirmadas se reprograman", () => {
  for (const status of ["cancelada", "pendiente_pago", "en_atencion", "finalizada"])
    assert.deepEqual(checkReschedule({ ...base, status, startsAt: now + 24 * H }), { ok: false, reason: "no_confirmada" });
});
test("límite de reprogramaciones por cita", () => {
  assert.deepEqual(checkReschedule({ ...base, rescheduleCount: MAX_RESCHEDULES - 1, startsAt: now + 24 * H }), { ok: true });
  assert.deepEqual(checkReschedule({ ...base, rescheduleCount: MAX_RESCHEDULES, startsAt: now + 24 * H }), { ok: false, reason: "limite" });
});
