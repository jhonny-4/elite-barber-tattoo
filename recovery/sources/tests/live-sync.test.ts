import { test } from "node:test";
import assert from "node:assert/strict";
import {
  startLiveSync,
  type SyncHost,
  type SyncMode,
} from "../src/services/adapters/live-sync.ts";

const flush = () => new Promise((resolve) => setImmediate(resolve));

class FakeSource {
  url: string;
  readyState = 0;
  closed = false;
  onopen: ((event: never) => unknown) | null = null;
  onmessage: ((event: never) => unknown) | null = null;
  onerror: ((event: never) => unknown) | null = null;
  constructor(url: string) {
    this.url = url;
  }
  open() {
    this.readyState = 1;
    this.onopen?.(undefined as never);
  }
  message() {
    this.onmessage?.(undefined as never);
  }
  /** closed=true imita un 204 o un error fatal; false, una reconexión automática. */
  fail(closed: boolean) {
    this.readyState = closed ? 2 : 0;
    this.onerror?.(undefined as never);
  }
  close() {
    this.readyState = 2;
    this.closed = true;
  }
}

function fakeBrowser() {
  const timers = new Map<number, { callback: () => void; ms: number }>();
  const listeners = new Map<string, Set<() => void>>();
  const sources: FakeSource[] = [];
  let next = 1;
  const target = {
    addEventListener(type: string, listener: () => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(listener);
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.get(type)?.delete(listener);
    },
  };
  const document = { ...target, hidden: false };
  const navigator = { onLine: true };
  class Source extends FakeSource {
    constructor(url: string) {
      super(url);
      sources.push(this);
    }
  }
  const host: SyncHost = {
    document,
    window: target,
    navigator,
    EventSource: Source,
    setTimeout(callback, ms) {
      const id = next++;
      timers.set(id, { callback, ms });
      return id;
    },
    clearTimeout(handle) {
      timers.delete(handle as number);
    },
  };
  return {
    host,
    document,
    navigator,
    sources,
    pending: () => [...timers.values()].map((t) => t.ms),
    fire: (type: string) => listeners.get(type)?.forEach((fn) => fn()),
    listenerCount: () =>
      [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
    tick() {
      const [id, timer] = [...timers.entries()][0];
      timers.delete(id);
      timer.callback();
    },
  };
}

test("sincronización: sin SSE (204) consulta cada 4 s, se pausa oculta y refresca al volver", async () => {
  const browser = fakeBrowser();
  const modes: SyncMode[] = [];
  let calls = 0;
  const stop = startLiveSync({
    refresh: async () => {
      calls++;
    },
    onModeChange: (mode) => modes.push(mode),
    host: browser.host,
  });
  await flush();
  assert.equal(calls, 1);
  browser.sources[0].fail(true); // 204: EventSource se cierra sin abrir
  assert.deepEqual(browser.pending(), [4000]);
  browser.tick();
  await flush();
  assert.equal(calls, 2);
  assert.deepEqual(browser.pending(), [4000]);

  browser.document.hidden = true;
  browser.fire("visibilitychange");
  assert.deepEqual(browser.pending(), []);
  browser.document.hidden = false;
  browser.fire("visibilitychange");
  await flush();
  assert.equal(calls, 3);
  assert.deepEqual(browser.pending(), [4000]);
  assert.equal(browser.sources.length, 1); // un 204 no se reintenta
  assert.deepEqual(modes, ["polling", "paused", "polling"]);

  stop();
  assert.deepEqual(browser.pending(), []);
  assert.ok(browser.sources[0].closed);
  assert.equal(browser.listenerCount(), 0);
});

test("sincronización: con SSE en vivo la consulta de respaldo es cada 15 s y los avisos refrescan", async () => {
  const browser = fakeBrowser();
  const lives: boolean[] = [];
  let calls = 0;
  const stop = startLiveSync({
    refresh: async () => {
      calls++;
    },
    onLiveChange: (live) => lives.push(live),
    host: browser.host,
  });
  await flush();
  const source = browser.sources[0];
  source.open();
  assert.deepEqual(browser.pending(), [15000]);
  source.message();
  await flush();
  assert.equal(calls, 2);
  assert.deepEqual(browser.pending(), [15000]);

  source.fail(false); // reconexión automática: mientras tanto, sondeo de 4 s
  assert.deepEqual(browser.pending(), [4000]);
  source.open();
  assert.deepEqual(browser.pending(), [15000]);

  source.fail(true); // servidor local reiniciado: se reabre al volver la red
  browser.fire("online");
  await flush();
  assert.equal(browser.sources.length, 2);
  assert.ok(source.closed);
  assert.deepEqual(lives, [true, false, true, false]);
  stop();
});

test("sincronización: sin conexión no consulta y al reconectar refresca de inmediato", async () => {
  const browser = fakeBrowser();
  let calls = 0,
    offline = 0;
  const stop = startLiveSync({
    refresh: async () => {
      calls++;
    },
    onOffline: () => offline++,
    host: browser.host,
  });
  await flush();
  browser.navigator.onLine = false;
  browser.fire("offline");
  assert.equal(offline, 1);
  assert.deepEqual(browser.pending(), []);
  browser.navigator.onLine = true;
  browser.fire("online");
  await flush();
  assert.equal(calls, 2);
  assert.deepEqual(browser.pending(), [4000]);
  stop();
});

test("sincronización: no solapa consultas; un aviso durante una consulta provoca otra al terminar", async () => {
  const browser = fakeBrowser();
  const releases: (() => void)[] = [];
  const stop = startLiveSync({
    refresh: () => new Promise<void>((resolve) => releases.push(resolve)),
    host: browser.host,
  });
  await flush();
  assert.equal(releases.length, 1);
  browser.sources[0].message();
  browser.sources[0].message();
  await flush();
  assert.equal(releases.length, 1);
  releases[0]();
  await flush();
  assert.equal(releases.length, 2);
  releases[1]();
  await flush();
  assert.equal(releases.length, 2);
  assert.deepEqual(browser.pending(), [4000]);
  stop();
});
