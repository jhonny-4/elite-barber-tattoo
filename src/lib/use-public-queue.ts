"use client";
import { useEffect, useState } from "react";
import type { PublicQueue, PublicTicket } from "../services/contracts/demo";
import {
  startLiveSync,
  type SyncMode,
} from "../services/adapters/live-sync";
const REQUEST_TIMEOUT_MS = 10000;
export function usePublicQueue(token = "") {
  const [queue, setQueue] = useState<PublicQueue | null>(null),
    [ticket, setTicket] = useState<PublicTicket | null>(null),
    [resolvedToken, setResolvedToken] = useState(""),
    [missing, setMissing] = useState(false),
    [error, setError] = useState(""),
    [online, setOnline] = useState(false),
    [live, setLive] = useState(false),
    [sync, setSync] = useState<SyncMode>("polling");
  useEffect(() => {
    setMissing(false);
    let alive = true,
      busy = false;
    const requests = new Set<AbortController>();
    const refresh = async () => {
      if (busy) return;
      busy = true;
      const controller = new AbortController();
      requests.add(controller);
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(
          `/api/demo/queue${token ? `?ticket=${encodeURIComponent(token)}` : ""}`,
          { cache: "no-store", signal: controller.signal },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (alive && response.status === 404) {
            setMissing(true);
            setTicket(null);
          }
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : "Sin conexión con la fila de turnos.",
          );
        }
        if (alive) {
          if (token) {
            setTicket(data);
            setResolvedToken(token);
            setMissing(false);
          } else setQueue(data);
          setError("");
          setOnline(true);
        }
      } catch (e) {
        if (alive) {
          // Errores propios del servidor (en español); los de red o tiempo de
          // espera del navegador se sustituyen por un aviso comprensible.
          setError(
            e instanceof Error && e.name === "Error" && e.message
              ? e.message
              : "Sin conexión con la fila de turnos.",
          );
          setOnline(false);
        }
      } finally {
        clearTimeout(timeout);
        requests.delete(controller);
        busy = false;
      }
    };
    const stop = startLiveSync({
      refresh,
      onLiveChange: (value) => {
        if (alive) setLive(value);
      },
      onModeChange: (mode) => {
        if (alive) setSync(mode);
      },
      onOffline: () => {
        if (!alive) return;
        setOnline(false);
        setError("Sin conexión. No confirmes turnos hasta reconectar.");
      },
    });
    return () => {
      alive = false;
      stop();
      requests.forEach((controller) => controller.abort());
    };
  }, [token]);
  return {
    queue,
    ticket: resolvedToken === token ? ticket : null,
    error,
    online,
    missing,
    /** SSE conectado (servidor local de un solo proceso). */
    live,
    /** live · polling (cada 4 s) · paused (pestaña oculta) · offline. */
    sync,
  };
}
