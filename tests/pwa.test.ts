import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
test("PWA: precarga fallback y no cachea API ni encola confirmaciones offline", async () => {
  const events: Record<string, (event: unknown) => void> = {};
  let loaded: string[] = [],
    result: Promise<unknown> | undefined;
  const source = await readFile(
    new URL("../public/sw.js", import.meta.url),
    "utf8",
  );
  runInNewContext(source, {
    self: {
      location: { origin: "http://localhost:3000" },
      addEventListener: (name: string, fn: (event: unknown) => void) =>
        (events[name] = fn),
      clients: { claim: async () => {} },
      skipWaiting: () => {},
    },
    caches: {
      open: async () => ({ addAll: async (urls: string[]) => (loaded = urls) }),
      match: async () => "offline-page",
      keys: async () => [],
      delete: async () => true,
    },
    fetch: async () => {
      throw new Error("offline");
    },
    URL,
  });
  events.install({
    waitUntil: (promise: Promise<unknown>) => (result = promise),
  });
  await result;
  assert.ok(loaded.includes("/offline.html"));
  let handled = false;
  events.fetch({
    request: { method: "POST", url: "http://localhost:3000/api/demo" },
    respondWith: () => (handled = true),
  });
  assert.equal(handled, false);
  events.fetch({
    request: { method: "GET", url: "http://localhost:3000/api/demo" },
    respondWith: () => (handled = true),
  });
  assert.equal(handled, false);
  events.fetch({
    request: {
      method: "GET",
      mode: "navigate",
      url: "http://localhost:3000/reservar",
    },
    respondWith: (promise: Promise<unknown>) => (result = promise),
  });
  assert.equal(await result, "offline-page");
});
