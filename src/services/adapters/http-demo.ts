import { createDemoId } from "../../domain/id.ts";
import type { DemoService, SharedState } from "../contracts/demo.ts";
const retryKeys = new Map<string, string>();
const RETRY_HINT =
  "Reintenta la misma operación; su referencia evita duplicados.";
/** JSON de la respuesta; una página de error del proxy (HTML) devuelve {}. */
async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await response.json();
    return data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
const errorText = (data: Record<string, unknown>, fallback: string) =>
  typeof data.error === "string" && data.error ? data.error : fallback;
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
      `No se pudo confirmar la respuesta del servidor. ${RETRY_HINT}`,
    );
  }
  const result = await readJson(response);
  if (!response.ok) {
    // 5xx: el servidor o el almacenamiento fallaron y la operación pudo
    // guardarse; se conserva la referencia para que el reintento no duplique.
    if (response.status >= 500)
      throw new Error(
        errorText(result, `El servidor no confirmó la operación. ${RETRY_HINT}`),
      );
    retryKeys.delete(fingerprint);
    throw new Error(errorText(result, "No se pudo guardar la operación demo."));
  }
  retryKeys.delete(fingerprint);
  return result as T;
}
export const httpDemo: DemoService = {
  async read(): Promise<SharedState> {
    let response: Response;
    try {
      response = await fetch("/api/demo", {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new Error("La agenda está tardando en responder. Revisa tu conexión y vuelve a intentar.");
    }
    if (!response.ok)
      throw new Error(
        errorText(
          await readJson(response),
          "No hay conexión con el servidor demo. No se pueden confirmar cambios.",
        ),
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
      const result = await readJson(response);
      if (!response.ok)
        throw new Error(errorText(result, "No se pudo guardar la operación demo."));
      return result as unknown as Awaited<ReturnType<DemoService["execute"]>>;
    });
  },
};
