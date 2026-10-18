import { createFileBackend } from "./file-backend.ts";
import { createNetlifyBlobsBackend } from "./blobs-backend.ts";
import { demoRuntime } from "./runtime.ts";
import { StoreConfigError } from "./state.ts";
import type { StoredReference } from "./references.ts";
import type { SharedState } from "../../../services/contracts/demo.ts";

export type BackendKind = "file" | "netlify-blobs";

/** Resultado de una transacción: `next` null significa que no hay nada que escribir. */
export type Mutation<T> = { next: SharedState | null; value: T };
export type UpdateOptions = {
  /** Si el estado guardado es ilegible, partir de uno vacío (solo para reset). */
  recoverCorrupt?: boolean;
};

export interface DemoBackend {
  readonly kind: BackendKind;
  /** true solo si un único proceso atiende todo: habilita SSE en memoria. */
  readonly singleProcess: boolean;
  read(): Promise<SharedState>;
  /**
   * Lee el último estado, aplica `mutate` y guarda el resultado de forma atómica.
   * `mutate` puede ejecutarse más de una vez (reintentos por conflicto): debe ser pura.
   */
  update<T>(
    mutate: (previous: SharedState) => Mutation<T>,
    options?: UpdateOptions,
  ): Promise<T>;
  putReference(id: string, reference: StoredReference): Promise<void>;
  getReference(id: string): Promise<StoredReference | null>;
  deleteReference(id: string): Promise<void>;
  clearReferences(): Promise<void>;
}

type EnvLike = Record<string, string | undefined>;
type ScopeLike = {
  netlifyBlobsContext?: unknown;
  Netlify?: { env?: { get?: (key: string) => string | undefined } };
};

/**
 * Misma detección que @netlify/blobs (src/environment.ts): variable global
 * `netlifyBlobsContext` o `NETLIFY_BLOBS_CONTEXT` (vía `Netlify.env` o `process.env`).
 * Se evalúa en cada petición porque Netlify aporta el contexto en tiempo de ejecución.
 */
export function hasNetlifyBlobsContext(
  env: EnvLike = process.env,
  scope: ScopeLike = globalThis as unknown as ScopeLike,
): boolean {
  if (
    typeof scope.netlifyBlobsContext === "string" &&
    scope.netlifyBlobsContext.length > 0
  )
    return true;
  try {
    const value = scope.Netlify?.env?.get?.("NETLIFY_BLOBS_CONTEXT");
    if (typeof value === "string" && value.length > 0) return true;
  } catch {
    /* Netlify.env no disponible fuera de su runtime. */
  }
  return Boolean(env.NETLIFY_BLOBS_CONTEXT);
}

/** ELITE_STORE=file|netlify-blobs fuerza el backend; si no, se detecta Netlify Blobs. */
export function selectBackendKind(
  env: EnvLike = process.env,
  scope?: ScopeLike,
): BackendKind {
  const forced = env.ELITE_STORE?.trim();
  if (forced) {
    const kind = forced.toLowerCase();
    if (kind === "file" || kind === "netlify-blobs") return kind;
    throw new StoreConfigError(
      `ELITE_STORE="${forced}" no es válido. Usa "file" o "netlify-blobs", o elimínala para detectar Netlify automáticamente.`,
    );
  }
  return hasNetlifyBlobsContext(env, scope) ? "netlify-blobs" : "file";
}

/** Backend para la petición actual (objetos ligeros: se crean en cada llamada). */
export function getDemoBackend(): DemoBackend {
  const runtime = demoRuntime();
  if (runtime.backendOverride) return runtime.backendOverride;
  return selectBackendKind() === "netlify-blobs"
    ? createNetlifyBlobsBackend()
    : createFileBackend();
}

/** Solo pruebas: sustituye el backend (undefined vuelve a la selección automática). */
export function setDemoBackendForTesting(backend: DemoBackend | undefined) {
  demoRuntime().backendOverride = backend;
}
