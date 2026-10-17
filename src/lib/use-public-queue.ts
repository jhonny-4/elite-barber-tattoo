"use client";
import { useEffect, useState } from "react";
import type { PublicQueue, PublicTicket } from "../services/contracts/demo";
export function usePublicQueue(token = "") {
  const [queue, setQueue] = useState<PublicQueue | null>(null),
    [ticket, setTicket] = useState<PublicTicket | null>(null),
    [resolvedToken, setResolvedToken] = useState(""),
    [missing, setMissing] = useState(false),
    [error, setError] = useState(""),
    [online, setOnline] = useState(false);
  useEffect(() => {
    setMissing(false);
    let alive = true,
      busy = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (busy) return;
      busy = true;
      try {
        const response = await fetch(
          `/api/demo/queue${token ? `?ticket=${encodeURIComponent(token)}` : ""}`,
          { cache: "no-store", signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok) {
          if (alive && response.status === 404) {
            setMissing(true);
            setTicket(null);
          }
          throw new Error(data.error);
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
          setError((e as Error).message ?? "Sin conexión con la fila demo.");
          setOnline(false);
        }
      } finally {
        busy = false;
      }
    };
    const events = new EventSource("/api/demo/events");
    events.onmessage = () => void refresh();
    const timer = setInterval(() => void refresh(), 10000);
    const offline = () => {
      setOnline(false);
      setError("Sin conexión. No confirmes turnos hasta reconectar.");
    };
    window.addEventListener("online", refresh);
    window.addEventListener("offline", offline);
    void refresh();
    return () => {
      alive = false;
      controller.abort();
      events.close();
      clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", offline);
    };
  }, [token]);
  return {
    queue,
    ticket: resolvedToken === token ? ticket : null,
    error,
    online,
    missing,
  };
}
