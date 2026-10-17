import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyCommand,
  freshSharedState,
} from "../src/server/demo/store/commands.ts";
import { getSlots, shiftDate } from "../src/domain/availability.ts";
import { todayBogota } from "../src/domain/demo.ts";
import { publicQueue, forecast } from "../src/domain/queue/logic.ts";
const day = shiftDate(todayBogota(), 1);
const booking = {
  barberId: "barbero-1",
  serviceId: "corte",
  date: day,
  time: "10:00",
  name: "Cliente ficticio",
  phone: "3000000000",
};
const join = {
  type: "queue.join" as const,
  input: {
    name: "Nombre privado demo",
    phone: "3000000001",
    serviceId: "corte",
    barberId: "barbero-1",
    source: "qr" as const,
  },
};
test("V4: almuerzo, descanso, ausencia y día libre retiran disponibilidad", () => {
  const state = freshSharedState();
  assert.equal(
    getSlots(state, "barbero-1", "corte", day).find((s) => s.time === "13:00")
      ?.available,
    false,
  );
  state.team[0].absences.push({
    date: day,
    start: "10:00",
    end: "11:00",
    label: "Ausencia",
  });
  assert.equal(
    getSlots(state, "barbero-1", "corte", day).find((s) => s.time === "10:00")
      ?.available,
    false,
  );
  state.team[0].days = [];
  assert.ok(
    getSlots(state, "barbero-1", "corte", day).every((s) => !s.available),
  );
});
test("V4: primer disponible asigna un profesional libre y no duplica al cliente", () => {
  let state = applyCommand(freshSharedState(), {
    type: "booking.create",
    input: booking,
  }).state;
  state = applyCommand(state, {
    type: "booking.create",
    input: { ...booking, barberId: "any", phone: "3000000002" },
  }).state;
  assert.equal(state.bookings[1].barberId, "barbero-2");
  assert.throws(
    () =>
      applyCommand(state, {
        type: "booking.create",
        input: { ...booking, barberId: "any" },
      }),
    /contacto/,
  );
});
test("V4: reprogramar conserva ID, libera el horario anterior y valida colisiones", () => {
  let state = applyCommand(freshSharedState(), {
    type: "booking.create",
    input: booking,
  }).state;
  const id = state.bookings[0].id;
  state = applyCommand(state, {
    type: "booking.change",
    id,
    action: "reschedule",
    time: "11:00",
  }).state;
  assert.equal(state.bookings[0].id, id);
  assert.equal(state.bookings[0].time, "11:00");
  state = applyCommand(state, {
    type: "booking.create",
    input: { ...booking, time: "12:00", barberId: "barbero-2" },
  }).state;
  assert.throws(
    () =>
      applyCommand(state, {
        type: "booking.change",
        id,
        action: "reschedule",
        time: "12:00",
        barberId: "barbero-3",
      }),
    /contacto/,
  );
  assert.equal(
    getSlots(state, "barbero-1", "corte", day).find((s) => s.time === "10:00")
      ?.available,
    true,
  );
});
test("V4: una jornada no puede invalidar una cita existente", () => {
  const state = applyCommand(freshSharedState(), {
    type: "booking.create",
    input: booking,
  }).state;
  assert.throws(
    () =>
      applyCommand(state, {
        type: "team.save",
        member: { ...state.team[0], active: false },
      }),
    /afecta una cita/,
  );
});
test("V4: turnos numerados, contacto único y monitor sin información personal", () => {
  let state = applyCommand(freshSharedState(), join).state;
  assert.throws(() => applyCommand(state, join), /activo/);
  state = applyCommand(state, {
    ...join,
    input: { ...join.input, phone: "3000000002" },
  }).state;
  assert.deepEqual(
    state.queue.map((t) => t.number),
    ["E-001", "E-002"],
  );
  const serialized = JSON.stringify(publicQueue(state));
  assert.ok(!serialized.includes(join.input.name));
  assert.ok(!serialized.includes(join.input.phone));
  assert.ok(!serialized.includes("token"));
});
test("V4: llamar, iniciar y terminar exige transiciones ordenadas", () => {
  const now = Date.parse(`${todayBogota()}T10:00:00-05:00`);
  let state = applyCommand(freshSharedState(), join, now).state;
  const id = state.queue[0].id;
  assert.throws(
    () =>
      applyCommand(state, { type: "queue.change", id, action: "finish" }, now),
    /Primero/,
  );
  state = applyCommand(
    state,
    { type: "queue.change", id, action: "call" },
    now,
  ).state;
  state = applyCommand(
    state,
    { type: "queue.change", id, action: "start" },
    now,
  ).state;
  state = applyCommand(
    state,
    { type: "queue.change", id, action: "finish" },
    now,
  ).state;
  assert.equal(state.queue[0].status, "finalizado");
});
test("V4: la fila respeta citas y descansos", () => {
  const now = Date.parse(`${todayBogota()}T12:45:00-05:00`);
  const state = applyCommand(freshSharedState(), join, now).state;
  assert.throws(
    () =>
      applyCommand(
        state,
        { type: "queue.change", id: state.queue[0].id, action: "call" },
        now,
      ),
    /profesional libre/,
  );
  const estimate = forecast(state, now).get(state.queue[0].id);
  assert.equal(
    new Date(estimate!.at).toISOString(),
    new Date(`${todayBogota()}T14:00:00-05:00`).toISOString(),
  );
});
test("V4: solicitudes no saltan estados ni generan citas", () => {
  let state = applyCommand(freshSharedState(), {
    type: "tattoo.create",
    input: {
      name: "Demo",
      phone: "3000000000",
      idea: "Diseño de ejemplo geométrico",
      placement: "Brazo",
      size: "10 cm",
      referenceName: null,
    },
  }).state;
  const id = state.requests[0].id;
  assert.throws(
    () =>
      applyCommand(state, {
        type: "tattoo.change",
        id,
        status: "fecha-acordada",
      }),
    /inválida/,
  );
  state = applyCommand(state, {
    type: "tattoo.change",
    id,
    status: "en-evaluacion",
  }).state;
  assert.equal(state.bookings.length, 0);
  assert.ok(state.notifications.some((n) => n.channel === "correo-simulado"));
});
