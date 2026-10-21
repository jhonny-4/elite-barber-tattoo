import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCommand, freshSharedState } from "../src/server/demo/store/commands.ts";
import { todayBogota } from "../src/domain/demo.ts";
import { publicQueue } from "../src/domain/queue/logic.ts";
import { shiftDate } from "../src/domain/availability.ts";
import type { DemoCommand } from "../src/services/contracts/demo.ts";
import { commandResponse } from "../src/server/demo/http.ts";
import { GET as monitorResponse } from "../src/app/api/demo/queue/route.ts";
import { setDemoBackendForTesting, type DemoBackend } from "../src/server/demo/store/backend.ts";
import { createFileBackend } from "../src/server/demo/store/file-backend.ts";

const now = Date.parse(`${todayBogota()}T10:00:00-05:00`);
function fixture() {
  const state = freshSharedState();
  state.bookings.push({ id: "appointment", name: "Contacto privado", phone: "3000000001", serviceId: "corte", barberId: "barbero-1", date: todayBogota(), time: "10:00", status: "reservada-demo" });
  return state;
}
test("citas: llegada, llamada, atención y cierre se reflejan en el monitor sin duplicar", () => {
  let state = fixture();
  const change = (action: Extract<DemoCommand, { type: "booking.change" }>["action"]) => { state = applyCommand(state, { type: "booking.change", id: "appointment", action }, now).state; };
  assert.equal(publicQueue(state, now).waiting, 0);
  change("checkin"); change("checkin");
  assert.equal(publicQueue(state, now).waiting, 1);
  assert.equal(publicQueue(state, now).next[0].number, "C-001");
  change("call");
  assert.equal(publicQueue(state, now).called[0].number, "C-001");
  assert.equal(publicQueue(state, now).waiting, 0);
  change("start");
  assert.equal(publicQueue(state, now).serving[0].number, "C-001");
  assert.equal(publicQueue(state, now).called.length, 0);
  assert.equal(JSON.stringify(publicQueue(state, now)).includes("Contacto privado"), false);
  assert.equal(JSON.stringify(publicQueue(state, now)).includes("3000000001"), false);
  change("finish");
  assert.equal(publicQueue(state, now).serving.length, 0);
});
test("citas: iniciar directamente y citas antiguas ya iniciadas aparecen en atención", () => {
  const state = applyCommand(fixture(), { type: "booking.change", id: "appointment", action: "start" }, now).state;
  assert.equal(publicQueue(state, now).serving.length, 1);
  delete state.bookings[0].arrivedAt; delete state.bookings[0].turnNumber;
  assert.equal(publicQueue(state, now).serving[0].number, "C-001");
});
test("citas: una reserva futura no entra en la fila de hoy; no se llama sin llegada", () => {
  const state = fixture();
  assert.throws(() => applyCommand(state, { type: "booking.change", id: "appointment", action: "call" }, now), /llegada/);
  state.bookings[0].date = shiftDate(todayBogota(), 1);
  assert.throws(() => applyCommand(state, { type: "booking.change", id: "appointment", action: "checkin" }, now), /día de la cita/);
  assert.equal(publicQueue(state, now).next.length, 0);
});
test("citas: no se duplica un contacto de la cita en la fila QR", () => {
  const state = applyCommand(fixture(), { type: "booking.change", id: "appointment", action: "checkin" }, now).state;
  assert.throws(() => applyCommand(state, { type: "queue.join", input: { name: "Contacto privado", phone: "3000000001", serviceId: "corte", barberId: "barbero-1", source: "qr" } }, now), /ya tiene una cita/);
});
test("citas: cancelar o reprogramar retira la llegada del monitor", () => {
  const state = applyCommand(fixture(), { type: "booking.change", id: "appointment", action: "checkin" }, now).state;
  const cancelled = applyCommand(state, { type: "booking.change", id: "appointment", action: "cancel" }, now).state;
  assert.equal(publicQueue(cancelled, now).waiting, 0);
  const changed = applyCommand(state, { type: "booking.change", id: "appointment", action: "reschedule", date: shiftDate(todayBogota(), 1) }, now).state;
  assert.equal(changed.bookings[0].arrivedAt, undefined);
  assert.equal(publicQueue(changed, now).waiting, 0);
});
test("HTTP: un cliente registra llegada y otro lee llamada y atención en el monitor", async (t) => {
  t.mock.method(Date, "now", () => now);
  let state = fixture();
  const backend: DemoBackend = { ...createFileBackend(),
    read: async () => structuredClone(state),
    update: async (mutate) => { const result = mutate(structuredClone(state)); if (result.next) state = result.next; return result.value; },
  };
  setDemoBackendForTesting(backend);
  const post = async (action: string) => {
    const response = await commandResponse(new Request("http://elite.test/api/demo/bookings", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID(), "x-elite-role": "dueno" }, body: JSON.stringify({ type: "booking.change", id: "appointment", action }) }));
    assert.equal(response.status, 200, await response.text());
  };
  const monitor = async () => (await monitorResponse(new Request("http://elite.test/api/demo/queue"))).json();
  try {
    await post("checkin"); assert.equal((await monitor()).waiting, 1);
    await post("call"); assert.equal((await monitor()).called[0].number, "C-001");
    await post("start"); assert.equal((await monitor()).serving[0].number, "C-001");
    await post("finish"); assert.equal((await monitor()).serving.length, 0);
  } finally { setDemoBackendForTesting(undefined); }
});
