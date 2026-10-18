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
import {
  startLiveSync,
  type SyncMode,
} from "../services/adapters/live-sync";
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
  /** SSE conectado (servidor local de un solo proceso). */
  live: false,
  /** live: SSE · polling: consulta cada 4 s · paused: pestaña oculta · offline: sin red. */
  sync: "polling" as SyncMode,
  error: "",
};
let snapshot = initial,
  users = 0,
  stop = () => {},
  inflight: Promise<void> | null = null,
  // Orden de las peticiones de este cliente y la que produjo el estado visible.
  sequence = 0,
  shownSequence = 0;
const listeners = new Set<() => void>();
function emit(patch: Partial<typeof initial>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((fn) => fn());
}
/**
 * Evita mostrar respuestas viejas: dentro de la misma época solo avanza la
 * revisión; si la época cambió (reset o almacén nuevo, p. ej. otro despliegue)
 * se acepta el estado de la petición más reciente aunque su revisión sea menor.
 */
function accept(state: SharedState, requestSequence: number) {
  const current = snapshot.state;
  const fresh =
    state.epoch === current.epoch
      ? state.revision >= current.revision
      : requestSequence > shownSequence;
  if (fresh) shownSequence = Math.max(shownSequence, requestSequence);
  return fresh;
}
async function refresh() {
  if (inflight) return inflight;
  inflight = (async () => {
    const requestSequence = ++sequence;
    try {
      const state = await httpDemo.read();
      emit(
        accept(state, requestSequence)
          ? { state, ready: true, online: true, error: "" }
          : { ready: true, online: true, error: "" },
      );
    } catch (e) {
      emit({ ready: true, online: false, error: (e as Error).message });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
/** Consulta posterior a una escritura: espera la consulta en curso y lanza otra. */
async function refreshAfterWrite() {
  if (inflight) await inflight;
  return refresh();
}
function connect() {
  stop = startLiveSync({
    refresh,
    onLiveChange: (live) => emit({ live }),
    onModeChange: (sync) => emit({ sync }),
    onOffline: () =>
      emit({
        online: false,
        live: false,
        error:
          "Sin conexión. Los datos visibles pueden estar desactualizados; no se pueden confirmar operaciones.",
      }),
  });
}
async function dispatch(command: DemoCommand): Promise<CommandResult> {
  const requestSequence = ++sequence;
  const result = await postDemo<CommandResult>("/api/demo", command);
  emit(
    accept(result.state, requestSequence)
      ? { state: result.state, online: true, ready: true, error: "" }
      : { online: true, ready: true, error: "" },
  );
  void refreshAfterWrite();
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
