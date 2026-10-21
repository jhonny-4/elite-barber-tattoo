import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { execute, readShared } from "../../src/server/demo/store/repository.ts";
import { commandResponse } from "../../src/server/demo/http.ts";
import { GET as getDemo } from "../../src/app/api/demo/route.ts";
import {
  GET as getQueue,
  POST as postQueue,
} from "../../src/app/api/demo/queue/route.ts";
import { createDemoId } from "../../src/domain/id.ts";

const folder = await mkdtemp(join(tmpdir(), "elite-http-test-"));
process.env.ELITE_DEMO_DIR = folder;
delete process.env.ELITE_STORE;
delete process.env.NETLIFY_BLOBS_CONTEXT;
after(async () => {
  assert.equal(dirname(resolve(folder)), resolve(tmpdir()));
  assert.ok(basename(folder).startsWith("elite-http-test-"));
  await rm(folder, { recursive: true, force: true });
});

const request = (
  body: BodyInit | null,
  headers: Record<string, string> = {},
  path = "/api/demo",
) =>
  new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      Host: "localhost:3000",
      "Content-Type": "application/json",
      "Idempotency-Key": createDemoId(),
      // Por defecto actúa el dueño; las pruebas de acceso pasan "public" explícitamente.
      "x-elite-role": "dueno",
      ...headers,
    },
    body,
    ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
  } as RequestInit);
const errorOf = async (response: Response) =>
  ((await response.json()) as { error: string }).error;

test("HTTP: peticiones mal formadas responden 400/413 con mensaje claro, sin 500", async () => {
  let response = await commandResponse(request("{ no es json"));
  assert.equal(response.status, 400);
  assert.match(await errorOf(response), /no es JSON válido/);

  response = await commandResponse(
    request(JSON.stringify({ type: "reset" }), { "Content-Type": "text/plain" }),
  );
  assert.equal(response.status, 400);

  response = await commandResponse(
    request(JSON.stringify({ type: "reset" }), { "Idempotency-Key": "x" }),
  );
  assert.equal(response.status, 400);

  response = await commandResponse(request("null"));
  assert.equal(response.status, 400);

  response = await commandResponse(request(JSON.stringify({ type: "reset" })), [
    "booking.create",
  ]);
  assert.equal(response.status, 400);

  // Cuerpo enviado por partes sin Content-Length: el límite se aplica al leer.
  const chunk = new TextEncoder().encode("x".repeat(400_000));
  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent++ < 5) controller.enqueue(chunk);
      else controller.close();
    },
  });
  response = await commandResponse(request(stream));
  assert.equal(response.status, 413);
});

test("archivo: las lecturas concurrentes con escrituras nunca ven un estado parcial", async () => {
  await execute({ type: "reset" }, "http-reset-0001");
  let writing = true,
    reads = 0;
  const writer = (async () => {
    for (let i = 0; i < 40; i++)
      await execute({ type: "notifications.read" }, `http-write-${i}-0001`);
    writing = false;
  })();
  const reader = (async () => {
    while (writing) {
      const state = await readShared();
      assert.equal(state.schema, 4);
      reads++;
    }
  })();
  await Promise.all([writer, reader]);
  assert.ok(reads > 0);
  assert.equal((await readShared()).revision, 41);
});

test("archivo: un state.json truncado responde 503 con mensaje claro y reset lo recupera", async () => {
  await writeFile(join(folder, "state.json"), '{"version":1,"schema":4,"rev');
  for (const response of [
    await getDemo(new Request("http://localhost:3000/api/demo")),
    await getQueue(new Request("http://localhost:3000/api/demo/queue")),
    await commandResponse(
      request(JSON.stringify({ type: "notifications.read" })),
    ),
    await postQueue(
      request(
        JSON.stringify({
          type: "queue.join",
          input: {
            name: "Cliente ficticio",
            phone: "3000000000",
            serviceId: "corte",
            barberId: "any",
            source: "qr",
          },
        }),
        {},
        "/api/demo/queue",
      ),
    ),
  ]) {
    assert.equal(response.status, 503);
    assert.match(await errorOf(response), /Datos incompatibles/);
  }
  const denied = await commandResponse(request(JSON.stringify({ type: "reset" }), { "x-elite-role": "public" }));
  assert.equal(denied.status, 403, "un visitante no puede reiniciar los datos");
  const reset = await commandResponse(request(JSON.stringify({ type: "reset" }), { "x-elite-role": "dueno" }));
  assert.equal(reset.status, 200);
  assert.equal((await getDemo(new Request("http://localhost:3000/api/demo"))).status, 200);
});

test("la API no entrega datos personales a visitantes ni acepta comandos del equipo", async () => {
  const created = await commandResponse(
    request(JSON.stringify({ type: "queue.join", input: { name: "Visitante Prueba", phone: "3000000009", serviceId: "corte", barberId: "any", source: "qr" } }), { "Idempotency-Key": createDemoId(), "x-elite-role": "public" }),
  );
  assert.equal(created.status, 200);
  const publicState = await (await getDemo(new Request("http://localhost:3000/api/demo"))).json();
  assert.ok(publicState.queue.every((t: { name: string; phone: string }) => t.name === "" && t.phone === ""));
  const staffState = await (await getDemo(new Request("http://localhost:3000/api/demo", { headers: { "x-elite-role": "dueno" } }))).json();
  assert.ok(staffState.queue.some((t: { name: string }) => t.name === "Visitante Prueba"));
  const change = await commandResponse(
    request(JSON.stringify({ type: "queue.change", id: staffState.queue[0].id, action: "call" }), { "Idempotency-Key": createDemoId(), "x-elite-role": "public" }),
  );
  assert.equal(change.status, 403);
});
