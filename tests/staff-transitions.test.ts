import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bookingTransitions,
  queueTransitions,
  tattooTransitions,
} from "../src/domain/staff-transitions.ts";
test("las citas y turnos cerrados no se pueden reabrir ni saltar atención", () => {
  assert.deepEqual(bookingTransitions.finalizada, undefined);
  assert.deepEqual(bookingTransitions.cancelada, undefined);
  assert.equal(bookingTransitions.confirmada.includes("finalizada"), false);
  assert.deepEqual(queueTransitions.finalizado, undefined);
  assert.equal(queueTransitions.esperando.includes("en_atencion"), false);
});
test("los tatuajes requieren evaluación y cotización antes de fecha acordada", () => {
  assert.equal(tattooTransitions.pendiente.includes("fecha_acordada"), false);
  assert.equal(
    tattooTransitions.en_evaluacion.includes("fecha_acordada"),
    false,
  );
  assert.equal(tattooTransitions.cotizada.includes("fecha_acordada"), true);
  assert.deepEqual(tattooTransitions.cerrada, undefined);
});
