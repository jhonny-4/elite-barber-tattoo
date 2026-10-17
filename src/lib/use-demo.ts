"use client";
import { useCallback, useEffect, useState } from "react";
import { emptyState, type DemoState } from "../domain/demo";
import { readDemo, saveDemo } from "./storage";
export function useDemo() {
  const [state, setState] = useState<DemoState>(emptyState),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      try {
        setState(readDemo());
        setError("");
      } catch (e) {
        setError((e as Error).message);
      }
      setReady(true);
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("elite-demo-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("elite-demo-updated", refresh);
    };
  }, []);
  const transact = useCallback(
    async (updater: (state: DemoState) => DemoState) => {
      const write = () => {
        let next: DemoState;
        try {
          next = updater(readDemo());
          saveDemo(next);
        } catch (e) {
          if (e instanceof DOMException && e.name === "QuotaExceededError")
            throw new Error(
              "No queda espacio en este navegador. Retira la referencia o restablece los datos demo.",
            );
          throw e;
        }
        setState(next);
        setError("");
        window.dispatchEvent(new Event("elite-demo-updated"));
      };
      if (navigator.locks)
        await navigator.locks.request("elite-demo-write", write);
      else write();
    },
    [],
  );
  const reset = useCallback(() => {
    saveDemo(emptyState());
    setState(emptyState());
    setError("");
    window.dispatchEvent(new Event("elite-demo-updated"));
  }, []);
  return { state, ready, error, transact, reset };
}
