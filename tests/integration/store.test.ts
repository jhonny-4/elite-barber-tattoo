import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import {
  execute,
  readShared,
  subscribe,
} from "../../src/server/demo/store/repository.ts";
import { todayBogota } from "../../src/domain/demo.ts";
import { shiftDate } from "../../src/domain/availability.ts";
import { commandResponse } from "../../src/server/demo/http.ts";
const folder = await mkdtemp(join(tmpdir(), "elite-v4-test-"));
process.env.ELITE_DEMO_DIR = folder;
after(async () => {
  assert.equal(dirname(resolve(folder)), resolve(tmpdir()));
  assert.ok(basename(folder).startsWith("elite-v4-test-"));
  await rm(folder, { recursive: true, force: true });
});
test("HTTP: acepta origen LAN igual a Host y rechaza origen ajeno", async () => {
  const request = (origin: string) =>
    new Request("http://0.0.0.0:3000/api/demo", {
      method: "POST",
      headers: {
        Host: "192.168.1.7:3000",
        Origin: origin,
        "Content-Type": "application/json",
        "Idempotency-Key": "origin-test-0001",
      },
      body: JSON.stringify({ type: "notifications.read" }),
    });
  assert.equal(
    (await commandResponse(request("http://192.168.1.7:3000"))).status,
    200,
  );
  assert.equal(
    (await commandResponse(request("https://example.invalid"))).status,
    403,
  );
});
const input = {
  barberId: "barbero-1",
  serviceId: "corte",
  date: shiftDate(todayBogota(), 1),
  time: "10:00",
  name: "Demo transacción",
  phone: "3000000000",
};
test("servidor: idempotencia, concurrencia, persistencia y emisión de cambios", async () => {
  await execute({ type: "reset" }, "reset-test-0001");
  let events = 0;
  const stop = subscribe(() => events++);
  const a = await Promise.all([
    execute({ type: "booking.create", input }, "same-request-0001"),
    execute({ type: "booking.create", input }, "same-request-0001"),
  ]);
  assert.equal(a[0].resultId, a[1].resultId);
  assert.equal((await readShared()).bookings.length, 1);
  assert.equal(events, 1);
  const results = await Promise.allSettled([
    execute(
      {
        type: "booking.create",
        input: { ...input, time: "11:00", phone: "3000000001" },
      },
      "race-request-0001",
    ),
    execute(
      {
        type: "booking.create",
        input: { ...input, time: "11:00", phone: "3000000002" },
      },
      "race-request-0002",
    ),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await readShared()).bookings.length, 2);
  assert.equal(events, 2);
  stop();
  const reset = await execute({ type: "reset" }, "reset-test-0002");
  assert.equal(reset.state.bookings.length, 0);
  assert.equal(reset.state.queue.length, 0);
  assert.ok(reset.state.revision > a[0].state.revision);
});
