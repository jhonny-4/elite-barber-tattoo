/**
 * Sincronización del navegador con la demo: SSE cuando el servidor lo ofrece
 * (un único proceso local) y sondeo adaptativo en cualquier otro caso.
 *
 * - SSE en vivo y pestaña visible: consulta de respaldo cada 15 s.
 * - Sin SSE (p. ej. Netlify responde 204) y pestaña visible: consulta cada 4 s.
 * - Pestaña oculta o navegador sin conexión: sin consultas.
 * - Al volver a la pestaña o recuperar la conexión: consulta inmediata.
 */
export type SyncMode = "live" | "polling" | "paused" | "offline";

export const POLL_INTERVAL_MS = 4000;
export const LIVE_INTERVAL_MS = 15000;

type Listenable = {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};
type EventSourceLike = {
  readonly readyState: number;
  onopen: ((event: never) => unknown) | null;
  onmessage: ((event: never) => unknown) | null;
  onerror: ((event: never) => unknown) | null;
  close(): void;
};
/** Entorno del navegador; inyectable para pruebas. */
export type SyncHost = {
  document?: Listenable & { readonly hidden: boolean };
  window?: Listenable;
  navigator?: { readonly onLine: boolean };
  EventSource?: new (url: string) => EventSourceLike;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
};
export type LiveSyncOptions = {
  /** Consulta el estado; debe resolver aunque falle (el hook muestra el error). */
  refresh: () => Promise<unknown>;
  onLiveChange?: (live: boolean) => void;
  onModeChange?: (mode: SyncMode) => void;
  onOffline?: () => void;
  eventsUrl?: string;
  pollIntervalMs?: number;
  liveIntervalMs?: number;
  host?: SyncHost;
};

const CLOSED = 2;

function browserHost(): SyncHost {
  return {
    document: typeof document === "undefined" ? undefined : document,
    window: typeof window === "undefined" ? undefined : window,
    navigator: typeof navigator === "undefined" ? undefined : navigator,
    EventSource: typeof EventSource === "undefined" ? undefined : EventSource,
    setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
    clearTimeout: (handle) =>
      globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
}

/** Inicia la sincronización y devuelve la función que la detiene. */
export function startLiveSync(options: LiveSyncOptions): () => void {
  const host = options.host ?? browserHost();
  const pollMs = options.pollIntervalMs ?? POLL_INTERVAL_MS;
  const liveMs = options.liveIntervalMs ?? LIVE_INTERVAL_MS;
  const eventsUrl = options.eventsUrl ?? "/api/demo/events";
  let stopped = false,
    live = false,
    opened = false,
    running = false,
    again = false,
    timer: unknown = null,
    source: EventSourceLike | null = null,
    mode: SyncMode | null = null;

  const hidden = () => host.document?.hidden === true;
  const offline = () => host.navigator?.onLine === false;
  const report = () => {
    const next: SyncMode = offline()
      ? "offline"
      : hidden()
        ? "paused"
        : live
          ? "live"
          : "polling";
    if (next === mode) return;
    mode = next;
    options.onModeChange?.(next);
  };
  const clear = () => {
    if (timer === null) return;
    host.clearTimeout(timer);
    timer = null;
  };
  const schedule = () => {
    clear();
    report();
    if (stopped || hidden() || offline()) return;
    timer = host.setTimeout(
      () => {
        timer = null;
        void run();
      },
      live ? liveMs : pollMs,
    );
  };
  async function run(): Promise<void> {
    if (stopped) return;
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      await options.refresh();
    } catch {
      /* El hook ya refleja el error de conexión. */
    }
    running = false;
    if (stopped) return;
    if (again) {
      again = false;
      return run();
    }
    schedule();
  }
  const setLive = (value: boolean) => {
    if (live === value) return;
    live = value;
    options.onLiveChange?.(value);
    if (!running) schedule();
  };
  const open = () => {
    const Source = host.EventSource;
    if (!Source || stopped) return;
    const events = new Source(eventsUrl);
    source = events;
    events.onopen = () => {
      if (source !== events) return;
      opened = true;
      setLive(true);
    };
    events.onmessage = () => {
      if (source === events && !hidden()) void run();
    };
    events.onerror = () => {
      if (source === events) setLive(false);
    };
  };
  // Solo se reabre un SSE que llegó a funcionar y quedó cerrado (reinicio del
  // servidor local). Un 204 nunca abre la conexión: no genera peticiones extra.
  const reopen = () => {
    if (!opened || !source || source.readyState !== CLOSED) return;
    source.close();
    open();
  };
  const onVisibility = () => {
    if (hidden()) {
      clear();
      report();
      return;
    }
    reopen();
    void run();
  };
  const onOnline = () => {
    reopen();
    void run();
  };
  const onOffline = () => {
    clear();
    options.onOffline?.();
    report();
  };

  report();
  host.document?.addEventListener("visibilitychange", onVisibility);
  host.window?.addEventListener("online", onOnline);
  host.window?.addEventListener("offline", onOffline);
  open();
  void run();

  return () => {
    stopped = true;
    clear();
    const events = source;
    source = null;
    events?.close();
    host.document?.removeEventListener("visibilitychange", onVisibility);
    host.window?.removeEventListener("online", onOnline);
    host.window?.removeEventListener("offline", onOffline);
  };
}
