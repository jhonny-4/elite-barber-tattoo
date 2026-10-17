"use client";
import { useEffect, useSyncExternalStore } from "react";
import { emptyState } from "../domain/demo";
import { defaultTeam } from "../domain/team/model";
import type {
  SharedState,
  DemoCommand,
  CommandResult,
} from "../services/contracts/demo";
import { httpDemo, postDemo } from "../services/adapters/http-demo";
const initial = {
  state: {
    ...emptyState(),
    schema: 4,
    revision: 0,
    queue: [],
    team: defaultTeam(),
    notifications: [],
    receipts: [],
  } as SharedState,
  ready: false,
  online: false,
  live: false,
  error: "",
};
let snapshot = initial,
  users = 0,
  stop = () => {},
  inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
function emit(patch: Partial<typeof initial>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((fn) => fn());
}
async function refresh() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const state = await httpDemo.read();
      if (state.revision >= snapshot.state.revision)
        emit({ state, ready: true, online: true, error: "" });
    } catch (e) {
      emit({ ready: true, online: false, error: (e as Error).message });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
function connect() {
  const events = new EventSource("/api/demo/events");
  events.onopen = () => emit({ live: true });
  events.onmessage = () => void refresh();
  events.onerror = () => emit({ live: false });
  const online = () => void refresh(),
    offline = () =>
      emit({
        online: false,
        live: false,
        error:
          "Sin conexión. Los datos visibles pueden estar desactualizados; no se pueden confirmar operaciones.",
      });
  window.addEventListener("online", online);
  window.addEventListener("offline", offline);
  const poll = setInterval(() => void refresh(), 15000);
  void refresh();
  stop = () => {
    events.close();
    clearInterval(poll);
    window.removeEventListener("online", online);
    window.removeEventListener("offline", offline);
  };
}
async function dispatch(command: DemoCommand): Promise<CommandResult> {
  const result = await postDemo<CommandResult>("/api/demo", command);
  emit({ state: result.state, online: true, ready: true, error: "" });
  void refresh();
  return result;
}
const reset = () => dispatch({ type: "reset" });
export function useDemo() {
  const value = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => snapshot,
    () => initial,
  );
  useEffect(() => {
    users++;
    if (users === 1) connect();
    return () => {
      users--;
      if (!users) stop();
    };
  }, []);
  return { ...value, dispatch, reset, refresh };
}
