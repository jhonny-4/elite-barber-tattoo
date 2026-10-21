import test from "node:test";
import assert from "node:assert/strict";
import { combineAny, slotsForDay } from "../src/domain/booking/slots.ts";

const base = { date: "2026-10-22", opens: "09:00", closes: "10:00", durationMin: 30, breaks: [], busy: [], now: Date.parse("2026-10-20T12:00:00Z") };
test("incluye el último inicio cuyo servicio termina exactamente al cierre", () => {
  assert.deepEqual(slotsForDay(base).map(s => s.time), ["09:00", "09:15", "09:30"]);
});
test("descansos y ocupados bloquean cualquier cruce", () => {
  const rules = { ...base, breaks: [{ starts: "09:20", ends: "09:40" }], busy: [{ startsAt: Date.parse("2026-10-22T14:15:00Z"), endsAt: Date.parse("2026-10-22T14:45:00Z") }] };
  assert.deepEqual(slotsForDay(rules).filter(s => s.available).map(s => s.time), []);
});
test("bloquea slots que inician dentro de los 30 minutos previos", () => {
  const rules = { ...base, now: Date.parse("2026-10-22T14:00:00Z") };
  assert.equal(slotsForDay(rules).find(s => s.time === "09:00")?.available, false);
});
test("any combina franjas libres entre profesionales", () => {
  assert.deepEqual(combineAny([{ barberId: "a", slots: [{ time: "09:00", available: false }] }, { barberId: "b", slots: [{ time: "09:00", available: true }] }]), [{ time: "09:00", available: true }]);
});
