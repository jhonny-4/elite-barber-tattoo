"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

/** Pantalla siempre activa (Screen Wake Lock). Sin soporte o sin permiso, falla en silencio. */
export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null,
      alive = true;
    const request = () => {
      if (!alive || document.visibilityState !== "visible" || lock) return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (!alive) return void sentinel.release();
          lock = sentinel;
          // El sistema lo libera al ocultar la pestaña o ahorrar energía: se vuelve a pedir.
          sentinel.addEventListener("release", () => {
            if (lock === sentinel) lock = null;
            request();
          });
        })
        .catch(() => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    // Respaldo por si el navegador libera el bloqueo sin avisar.
    const retry = setInterval(request, 60_000);
    return () => {
      alive = false;
      clearInterval(retry);
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => {});
    };
  }, []);
}

export function useFullscreen() {
  const [supported, setSupported] = useState(false),
    [active, setActive] = useState(false);
  useEffect(() => {
    setSupported(Boolean(document.fullscreenEnabled));
    const sync = () => setActive(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const enter = () => {
    document.documentElement.requestFullscreen().catch(() => {});
  };
  return { supported, active, enter };
}

/** Anti-marcado OLED: mueve el contenido ±4 px cada ~3 min, sin que se note. */
export function useOledShift(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const move = () => {
      const r = () => Math.round(Math.random() * 8 - 4);
      ref.current?.style.setProperty("--tv-shift", `${r()}px ${r()}px`);
    };
    const timer = setInterval(move, 3 * 60_000);
    return () => clearInterval(timer);
  }, [ref]);
}

/** Pasa a "idle" tras `limit` ms sin cambios en la fila. Cualquier cambio lo apaga al instante. */
export function useIdle(signature: string, busy: boolean, limit: number) {
  const last = useRef(0);
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    last.current = Date.now();
    setIdle(false);
  }, [signature, busy]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!busy && Date.now() - last.current >= limit) setIdle(true);
    }, 1000);
    return () => clearInterval(timer);
  }, [busy, limit]);
  const wake = () => {
    last.current = Date.now();
    setIdle(false);
  };
  return { idle, wake };
}
