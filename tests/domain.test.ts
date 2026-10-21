import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addBooking,
  addTattooRequest,
  emptyState,
  todayBogota,
} from "../src/domain/demo.ts";
import { getSlots, shiftDate } from "../src/domain/availability.ts";
const input = {
  barberId: "barbero-1",
  serviceId: "corte-barba",
  date: shiftDate(todayBogota(), 1),
  time: "10:00",
  name: "Cliente demo",
  phone: "3000000000",
};
test("rechaza cruces parciales, permite citas contiguas y profesionales distintos", () => {
  const s = addBooking(emptyState(), input);
  assert.throws(() => addBooking(s, { ...input, time: "10:30" }), /cruza/);
  assert.equal(addBooking(s, { ...input, time: "10:45" }).bookings.length, 2);
  assert.equal(
    addBooking(s, { ...input, barberId: "barbero-2" }).bookings.length,
    2,
  );
});
test("cancelar libera disponibilidad", () => {
  const s = addBooking(emptyState(), input);
  s.bookings[0].status = "cancelada";
  assert.equal(addBooking(s, input).bookings.length, 2);
});
test("valida servicio, fecha, hora y contacto", () => {
  for (const override of [
    { serviceId: "otro" },
    { date: "2020-01-01" },
    { time: "17:45" },
    { phone: "x" },
  ])
    assert.throws(() => addBooking(emptyState(), { ...input, ...override }));
});
test("tatuajes quedan pendientes y requieren descripción", () => {
  const r = {
    name: "Demo",
    phone: "3000000000",
    idea: "Una idea de prueba",
    placement: "Brazo",
    size: "10 cm",
    referenceName: null,
  };
  assert.equal(
    addTattooRequest(emptyState(), r).requests[0].status,
    "pendiente",
  );
  assert.throws(() => addTattooRequest(emptyState(), { ...r, idea: "x" }));
});
test("la última hora depende de la duración y los cruces se deshabilitan", () => {
  const state = addBooking(emptyState(), input);
  const slots = getSlots(state, input.barberId, input.serviceId, input.date);
  assert.equal(slots.at(-1)?.time, "17:15");
  assert.equal(slots.find((s) => s.time === "10:30")?.available, false);
  assert.equal(slots.find((s) => s.time === "10:45")?.available, true);
  assert.equal(
    getSlots(state, input.barberId, "corte", input.date).at(-1)?.time,
    "17:15",
  );
});
test("pausar un profesional bloquea horarios y reservas nuevas", () => {
  const state = { ...emptyState(), unavailableBarberIds: ["barbero-1"] };
  assert.throws(() => addBooking(state, input), /pausado/);
  assert.ok(
    getSlots(state, input.barberId, input.serviceId, input.date).every(
      (s) => !s.available,
    ),
  );
});
test("rechaza fechas imposibles, límites de agenda y minutos inválidos", () => {
  for (const override of [
    { date: "2027-02-30" },
    { date: shiftDate(todayBogota(), 61) },
    { time: "10:99" },
    { time: "10:07" },
  ])
    assert.throws(() => addBooking(emptyState(), { ...input, ...override }));
});
test("el calendario cambia de mes y año correctamente", () => {
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDate("2028-02-28", 1), "2028-02-29");
});
