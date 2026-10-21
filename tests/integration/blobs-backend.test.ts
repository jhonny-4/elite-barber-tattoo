import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import {
  createBlobsBackend,
  STATE_KEY,
} from "../../src/server/demo/store/blobs-backend.ts";
import { setDemoBackendForTesting } from "../../src/server/demo/store/backend.ts";
import {
  execute,
  readReference,
  readShared,
  subscribe,
} from "../../src/server/demo/store/repository.ts";
import { freshSharedState } from "../../src/server/demo/store/commands.ts";
import { commandResponse } from "../../src/server/demo/http.ts";
import { GET as getReference } from "../../src/app/api/demo/reference/[id]/route.ts";
import { GET as getEvents } from "../../src/app/api/demo/events/route.ts";
import { todayBogota } from "../../src/domain/demo.ts";
import { shiftDate } from "../../src/domain/availability.ts";
import { createDemoId } from "../../src/domain/id.ts";
import {
  FakeBlobStore,
  PNG_BASE64,
  PNG_DATA_URL,
} from "../helpers/fake-blobs.ts";
import type { SharedState } from "../../src/services/contracts/demo.ts";

let stateStore: FakeBlobStore, referenceStore: FakeBlobStore, sleeps: number[];
const backend = (overrides: { maxAttempts?: number } = {}) =>
  createBlobsBackend({
    stateStore: () => stateStore,
    referenceStore: () => referenceStore,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    random: () => 0.5,
    log: () => {},
    ...overrides,
  });
beforeEach(() => {
  stateStore = new FakeBlobStore();
  referenceStore = new FakeBlobStore();
  sleeps = [];
  setDemoBackendForTesting(backend());
});
after(() => setDemoBackendForTesting(undefined));

const stored = () =>
  JSON.parse(String(stateStore.entries.get(STATE_KEY)?.data)) as SharedState;
const booking = {
  barberId: "barbero-1",
  serviceId: "corte",
  date: shiftDate(todayBogota(), 1),
  time: "10:00",
  name: "Cliente ficticio",
  phone: "3000000000",
};
const tattoo = {
  name: "Cliente ficticio",
  phone: "3000000001",
  idea: "Idea de prueba con detalle suficiente",
  placement: "Antebrazo",
  size: "8 cm",
  referenceName: "idea.png",
};
const post = (body: unknown, key = createDemoId()) =>
  commandResponse(
    new Request("https://elite.example/api/demo", {
      method: "POST",
      headers: {
        Host: "elite.example",
        Origin: "https://elite.example",
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(body),
    }),
  );
const referenceRequest = (id: string) =>
  getReference(new Request(`https://elite.example/api/demo/reference/${id}`, { headers: { "x-elite-role": "dueno" } }), {
    params: Promise.resolve({ id }),
  });

test("Blobs: primera escritura con onlyIfNew, luego onlyIfMatch, lecturas fuertes y revisión", async () => {
  await execute({ type: "booking.create", input: booking }, "blobs-first-0001");
  await execute(
    { type: "booking.create", input: { ...booking, time: "11:00", phone: "3000000002" } },
    "blobs-second-0001",
  );
  assert.deepEqual(
    stateStore.writes.map((w) => w.condition),
    ["new", 'match:"etag-1"'],
  );
  assert.ok(stateStore.reads.every((r) => r.consistency === "strong"));
  const state = stored();
  assert.equal(state.revision, 2);
  assert.equal(state.bookings.length, 2);
  assert.ok(state.epoch);
  assert.deepEqual((await readShared()).bookings, state.bookings);
});

test("Blobs: un conflicto de ETag reintenta tras una espera y conserva ambos cambios", async () => {
  await execute({ type: "booking.create", input: booking }, "blobs-base-0001");
  let injected = false;
  stateStore.beforeSet = () => {
    if (injected) return;
    injected = true;
    // Otra instancia guarda una cita entre nuestra lectura y nuestra escritura.
    const other = stored();
    other.bookings.push({
      ...booking,
      id: createDemoId(),
      time: "15:00",
      phone: "3000000009",
      status: "reservada-demo",
    });
    other.revision += 1;
    stateStore.forceJSON(STATE_KEY, other);
  };
  const result = await execute(
    { type: "booking.create", input: { ...booking, time: "12:00", phone: "3000000003" } },
    "blobs-conflict-0001",
  );
  assert.equal(stateStore.writes.filter((w) => !w.modified).length, 1);
  assert.deepEqual(sleeps, [20]);
  const state = stored();
  assert.deepEqual(state.bookings.map((b) => b.time).sort(), ["10:00", "12:00", "15:00"]);
  assert.equal(state.revision, 3);
  assert.equal(result.state.revision, 3);
});

test("Blobs: dos instancias con la misma clave no duplican; con claves distintas solo una gana el horario", async () => {
  const a = backend(),
    b = backend();
  setDemoBackendForTesting(a);
  const first = execute({ type: "booking.create", input: booking }, "same-key-blobs-0001");
  setDemoBackendForTesting(b);
  const second = execute({ type: "booking.create", input: booking }, "same-key-blobs-0001");
  const [x, y] = await Promise.all([first, second]);
  assert.equal(x.resultId, y.resultId);
  assert.equal(stored().bookings.length, 1);

  setDemoBackendForTesting(a);
  const race1 = execute(
    { type: "booking.create", input: { ...booking, time: "16:00", phone: "3000000004" } },
    "race-blobs-0001",
  );
  setDemoBackendForTesting(b);
  const race2 = execute(
    { type: "booking.create", input: { ...booking, time: "16:00", phone: "3000000005" } },
    "race-blobs-0002",
  );
  const settled = await Promise.allSettled([race1, race2]);
  assert.equal(settled.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(stored().bookings.length, 2);
});

test("Blobs: si los conflictos persisten se rinde sin escribir ni dejar la imagen huérfana", async () => {
  setDemoBackendForTesting(backend({ maxAttempts: 3 }));
  await execute({ type: "notifications.read" }, "blobs-seed-0001");
  stateStore.beforeSet = () => {
    stateStore.forceJSON(STATE_KEY, stored()); // cada escritura ajena cambia el ETag
  };
  await assert.rejects(
    execute(
      { type: "tattoo.create", input: { ...tattoo, referenceDataUrl: PNG_DATA_URL } },
      "blobs-busy-0001",
    ),
    /muchos cambios a la vez/,
  );
  assert.equal(sleeps.length, 2);
  assert.equal(referenceStore.entries.size, 0);
  assert.equal(stored().requests.length, 0);
});

test("Blobs: la referencia se guarda aparte y se sirve con cabeceras seguras", async () => {
  let events = 0;
  const stop = subscribe(() => events++);
  const response = await post({
    type: "tattoo.create",
    input: { ...tattoo, referenceDataUrl: PNG_DATA_URL },
  });
  stop();
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.ok(!body.includes("data:image"));
  const persisted = stored().requests[0];
  assert.equal(persisted.referenceDataUrl, undefined);
  const id = persisted.referenceUrl?.split("/").at(-1) ?? "";
  assert.match(persisted.referenceUrl ?? "", /^\/api\/demo\/reference\/[0-9a-f-]{36}$/);
  assert.ok(!JSON.stringify(stored()).includes("base64"));
  assert.deepEqual(referenceStore.entries.get(id)?.metadata, {
    contentType: "image/png",
  });
  assert.equal(events, 1);

  const image = await referenceRequest(id);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");
  assert.equal(image.headers.get("x-content-type-options"), "nosniff");
  assert.match(image.headers.get("cache-control") ?? "", /no-store/);
  assert.match(image.headers.get("cache-control") ?? "", /private/);
  assert.deepEqual(
    Buffer.from(await image.arrayBuffer()),
    Buffer.from(PNG_BASE64, "base64"),
  );
  assert.equal((await referenceRequest("../state")).status, 404);
  assert.equal((await referenceRequest(createDemoId())).status, 404);

  // Repetir la misma operación no crea otra imagen.
  const key = createDemoId();
  const command = {
    type: "tattoo.create",
    input: { ...tattoo, phone: "3000000006", referenceDataUrl: PNG_DATA_URL },
  };
  await post(command, key);
  await post(command, key);
  assert.equal(referenceStore.entries.size, 2);
  assert.equal(stored().requests.length, 2);
});

test("Blobs: una imagen con firma falsa se rechaza sin guardar nada", async () => {
  const fake = Buffer.from("<html><script>alert(1)</script></html>").toString("base64");
  const response = await post({
    type: "tattoo.create",
    input: { ...tattoo, referenceDataUrl: `data:image/png;base64,${fake}` },
  });
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /Referencia inválida/);
  assert.equal(referenceStore.entries.size, 0);
  assert.equal(stateStore.entries.size, 0);
});

test("Blobs: datos antiguos con data URL se publican por la ruta nueva y no en GET", async () => {
  const legacy = freshSharedState();
  const requestId = createDemoId();
  legacy.revision = 7;
  legacy.requests.push({
    ...tattoo,
    id: requestId,
    status: "pendiente",
    referenceDataUrl: PNG_DATA_URL,
  });
  stateStore.forceJSON(STATE_KEY, legacy);
  const view = await readShared();
  assert.ok(!JSON.stringify(view).includes("data:image"));
  assert.equal(view.requests[0].referenceUrl, `/api/demo/reference/${requestId}`);
  const reference = await readReference(requestId);
  assert.equal(reference?.contentType, "image/png");
  assert.equal((await referenceRequest(requestId)).status, 200);
});

test("Blobs: reset vacía el estado, cambia la época y borra las referencias", async () => {
  await execute(
    { type: "tattoo.create", input: { ...tattoo, referenceDataUrl: PNG_DATA_URL } },
    "blobs-ref-0001",
  );
  const before = stored();
  const id = before.requests[0].referenceUrl?.split("/").at(-1) ?? "";
  assert.equal(referenceStore.entries.size, 1);
  const reset = await execute({ type: "reset" }, "blobs-reset-0001");
  assert.equal(reset.state.requests.length, 0);
  assert.equal(reset.state.revision, before.revision + 1);
  assert.notEqual(reset.state.epoch, before.epoch);
  assert.equal(referenceStore.entries.size, 0);
  assert.equal((await referenceRequest(id)).status, 404);
  // Un estado ilegible se puede restablecer, pero no usar.
  stateStore.forceJSON(STATE_KEY, { schema: 3 });
  await assert.rejects(readShared(), /Datos incompatibles/);
  const recovered = await execute({ type: "reset" }, "blobs-reset-0002");
  assert.equal(recovered.state.schema, 4);
});

test("Blobs: sin lectura fuerte disponible usa lectura eventual con escritura condicional", async () => {
  stateStore.strongUnavailable = true;
  referenceStore.strongUnavailable = true;
  await execute({ type: "booking.create", input: booking }, "blobs-eventual-0001");
  await execute({ type: "notifications.read" }, "blobs-eventual-0002");
  assert.ok(stateStore.reads.length >= 2);
  assert.ok(stateStore.reads.every((r) => r.consistency === "eventual"));
  assert.equal(stateStore.writes.at(-1)?.condition.startsWith("match:"), true);
});

test("Blobs: un fallo del servicio responde 503 con mensaje útil y sin SSE", async () => {
  stateStore.failWith = new Error("Netlify Blobs has generated an internal error (500)");
  const response = await post({ type: "booking.create", input: booking });
  assert.equal(response.status, 503);
  const { error } = await response.json();
  assert.match(error, /almacenamiento no respondió/);
  assert.ok(!error.includes("Netlify Blobs has generated"));
  const events = getEvents(new Request("https://elite.example/api/demo/events"));
  assert.equal(events.status, 204);
  assert.equal(events.headers.get("x-elite-sync"), "polling");
});
