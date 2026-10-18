"use client";
import { useEffect, useRef, useState } from "react";
import type {
  CommandResult,
  DemoCommand,
} from "../../services/contracts/demo";
import { commandKey, successMessage } from "./labels";

export type Feedback = { tone: "ok" | "alert"; text: string; id: number };

/**
 * Ejecuta comandos del panel a través de `useDemo().dispatch` (sin cambiar su contrato).
 * Marca con `aria-busy` el botón de la operación en curso y bloquea las demás para
 * evitar dobles envíos. El servidor sigue validando cada operación.
 */
export function useCommandRunner(
  dispatch: (command: DemoCommand) => Promise<CommandResult>,
  online: boolean,
) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    if (feedback?.tone !== "ok") return;
    const timer = window.setTimeout(() => setFeedback(null), 6000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function run(command: DemoCommand) {
    setBusyKey(commandKey(command));
    setFeedback(null);
    try {
      const result = await dispatch(command);
      sequence.current += 1;
      setFeedback({
        tone: "ok",
        text: successMessage(command),
        id: sequence.current,
      });
      return result;
    } catch (error) {
      sequence.current += 1;
      setFeedback({
        tone: "alert",
        text:
          (error as Error).message ||
          "No se pudo guardar el cambio. Revisa la conexión y reintenta.",
        id: sequence.current,
      });
      return undefined;
    } finally {
      setBusyKey(null);
    }
  }

  /** Propiedades del botón que ejecuta `command`. */
  function control(command: DemoCommand, unavailable = false) {
    const mine = busyKey === commandKey(command);
    return {
      disabled: !mine && (busyKey !== null || !online || unavailable),
      "aria-busy": mine ? (true as const) : undefined,
    };
  }

  return {
    run,
    control,
    busy: busyKey !== null,
    online,
    feedback,
    dismiss: () => setFeedback(null),
  };
}

export type Runner = ReturnType<typeof useCommandRunner>;

/** Reloj del panel: se actualiza cada 30 s para la fecha, la hora y «hoy». */
export function useNow(interval = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(timer);
  }, [interval]);
  return now;
}
