import { createDemoId } from "../../domain/id.ts";
import type { DemoService, SharedState } from "../contracts/demo.ts";
const retryKeys = new Map<string, string>();
export async function postDemo<T>(path: string, body: unknown): Promise<T> {
  if (!navigator.onLine)
    throw new Error(
      "Sin conexión: no se puede confirmar ni guardar una operación.",
    );
  const serialized = JSON.stringify(body),
    fingerprint = path + serialized;
  const key = retryKeys.get(fingerprint) ?? createDemoId();
  retryKeys.set(fingerprint, key);
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      body: serialized,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "No se pudo confirmar la respuesta del servidor. Reintenta la misma operación; su referencia evita duplicados.",
    );
  }
  const result = await response.json();
  if (!response.ok) {
    retryKeys.delete(fingerprint);
    throw new Error(result.error ?? "No se pudo guardar la operación demo.");
  }
  retryKeys.delete(fingerprint);
  return result as T;
}
export const httpDemo: DemoService = {
  async read(): Promise<SharedState> {
    const response = await fetch("/api/demo", {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new Error(
        "No hay conexión con el servidor demo. No se pueden confirmar cambios.",
      );
    return response.json();
  },
  execute(command, key) {
    return fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify(command),
      cache: "no-store",
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    });
  },
};
