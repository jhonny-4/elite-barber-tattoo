import assert from "node:assert/strict";
import test from "node:test";
import { absenceWindow, cajaState, cajaTotals, copAmount, normalizePhone } from "../src/domain/panel.ts";

// 2026-10-21 10:00 en Cartagena (UTC-5).
const now = Date.parse("2026-10-21T10:00:00-05:00");

test("normalizePhone iguala formatos del mismo número", () => {
  assert.equal(normalizePhone("+57 301 232 9541"), "3012329541");
  assert.equal(normalizePhone("3012329541"), "3012329541");
  assert.equal(normalizePhone("+573012329541"), "3012329541");
  assert.equal(normalizePhone("12"), null);
  assert.equal(normalizePhone(undefined), null);
});

test("bloqueo del resto del día llega hasta la medianoche de Cartagena", () => {
  const w = absenceWindow({ kind: "resto" }, now);
  assert.equal(w.startsAt, now);
  assert.equal(w.endsAt, Date.parse("2026-10-22T00:00:00-05:00"));
});

test("bloqueo por rango exige hora final posterior y no empieza en el pasado", () => {
  const w = absenceWindow({ kind: "rango", from: "08:00", to: "12:00" }, now);
  assert.equal(w.startsAt, now);
  assert.equal(w.endsAt, Date.parse("2026-10-21T12:00:00-05:00"));
  assert.throws(() => absenceWindow({ kind: "rango", from: "12:00", to: "11:00" }, now));
  assert.throws(() => absenceWindow({ kind: "rango", from: "07:00", to: "09:00" }, now));
  assert.throws(() => absenceWindow({ kind: "rango", from: "25:00", to: "26:00" }, now));
});

test("vacaciones cubren los días completos y tienen tope de 60 días", () => {
  const w = absenceWindow({ kind: "vacaciones", dateFrom: "2026-11-02", dateTo: "2026-11-04" }, now);
  assert.equal(w.startsAt, Date.parse("2026-11-02T00:00:00-05:00"));
  assert.equal(w.endsAt, Date.parse("2026-11-05T00:00:00-05:00"));
  assert.throws(() => absenceWindow({ kind: "vacaciones", dateFrom: "2026-11-05", dateTo: "2026-11-04" }, now));
  assert.throws(() => absenceWindow({ kind: "vacaciones", dateFrom: "2026-11-01", dateTo: "2027-03-01" }, now));
  assert.throws(() => absenceWindow({ kind: "vacaciones", dateFrom: "2026-10-01", dateTo: "2026-10-05" }, now));
});

test("la caja separa pagado en línea, cobrado en local y por cobrar sin duplicar", () => {
  assert.equal(cajaState({ paidOnline: 25000, paidInStore: true, price: 25000 }), "en_linea");
  assert.equal(cajaState({ paidOnline: 0, paidInStore: true, price: 25000 }), "local");
  assert.equal(cajaState({ paidOnline: 0, paidInStore: false, price: 25000 }), "por_cobrar");
  const t = cajaTotals([
    { paidOnline: 25000, paidInStore: false, price: 25000 },
    { paidOnline: 0, paidInStore: true, price: 20000 },
    { paidOnline: 0, paidInStore: false, price: 30000 },
  ]);
  assert.deepEqual(t, { services: 3, total: 75000, online: 25000, store: 20000, pending: 30000 });
});

test("copAmount solo acepta pesos enteros dentro del rango", () => {
  assert.equal(copAmount(350000, 1000), 350000);
  assert.equal(copAmount(350000.5, 1000), null);
  assert.equal(copAmount("350000", 1000), null);
  assert.equal(copAmount(500, 1000), null);
  assert.equal(copAmount(0, 0), 0);
  assert.equal(copAmount(-1, 0), null);
});
