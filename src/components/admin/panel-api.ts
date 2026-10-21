"use client";
import { useCallback, useEffect, useState } from "react";

/** fetch JSON contra /api/panel/*: lanza un Error con el mensaje del servidor si la respuesta no es 2xx. */
export async function panelFetch<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    cache: "no-store",
    headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error ?? "No se pudo completar la operación.");
  return data as T;
}

/** Carga con estados loading/error y recarga manual; `url` null no consulta. */
export function usePanelData<T>(url: string | null) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string }>({ data: null, loading: Boolean(url), error: "" });
  const load = useCallback(async () => {
    if (!url) return;
    try {
      const data = await panelFetch<T>(url);
      setState({ data, loading: false, error: "" });
    } catch (e) {
      setState((s) => ({ data: s.data, loading: false, error: e instanceof Error ? e.message : "No se pudo cargar." }));
    }
  }, [url]);
  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    void load();
  }, [load]);
  return { ...state, reload: load };
}

export const cop = (value: number) => `$${value.toLocaleString("es-CO")}`;
