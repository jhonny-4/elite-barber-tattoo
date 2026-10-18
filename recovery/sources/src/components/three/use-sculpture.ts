"use client";
// Monta el motor 3D en un contenedor: importación dinámica de Three.js en tiempo
// ocioso (o al acercarse al viewport) y estado para la transición desde el respaldo.

import { useEffect, useRef, useState } from "react";
import type {
  SculptureHandle,
  SculptureSpec,
  SculptureStatus,
} from "./types";

type Options = {
  /** Inicializa solo cuando el elemento está cerca del viewport. */
  lazy?: boolean;
  /** Margen del IntersectionObserver de la carga diferida. */
  margin?: string;
};

function whenIdle(callback: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 900 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 160);
  return () => window.clearTimeout(id);
}

export function useSculpture(
  spec: SculptureSpec,
  { lazy = false, margin = "300px 0px" }: Options = {},
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<SculptureStatus>("idle");
  // Se incrementa al recuperar un contexto WebGL perdido para reconstruir la escena.
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let handle: SculptureHandle | null = null;
    let cancelIdle = () => {};
    let observer: IntersectionObserver | null = null;

    const boot = () => {
      setStatus("loading");
      import("./engine")
        .then(({ mountSculpture }) => {
          if (cancelled) return;
          handle = mountSculpture(host, spec, {
            onReady: () => {
              if (!cancelled) setStatus("ready");
            },
            onFail: () => {
              if (!cancelled) setStatus("failed");
            },
            onRestore: () => {
              if (!cancelled) setGeneration((value) => value + 1);
            },
          });
        })
        .catch(() => {
          // Sin WebGL (o error de carga): el vector con profundidad CSS se queda.
          if (!cancelled) setStatus("failed");
        });
    };
    const schedule = () => {
      cancelIdle = whenIdle(boot);
    };

    if (lazy && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          observer = null;
          schedule();
        },
        { rootMargin: margin },
      );
      observer.observe(host);
    } else {
      schedule();
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      cancelIdle();
      handle?.dispose();
    };
  }, [spec, lazy, margin, generation]);

  return { hostRef, status };
}
