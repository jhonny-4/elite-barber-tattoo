import { freshSharedState } from "./commands.ts";
import {
  parseSharedState,
  StoreConfigError,
  StoreConflictError,
  StoreUnavailableError,
} from "./state.ts";
import { isReferenceId, sniffImageType, toArrayBuffer } from "./references.ts";
import type { DemoBackend, Mutation, UpdateOptions } from "./backend.ts";
import type { StoredReference } from "./references.ts";
import type { SharedState } from "../../../services/contracts/demo.ts";

export type BlobsConsistency = "strong" | "eventual";

/**
 * Subconjunto del `Store` de @netlify/blobs que usa este backend. Las pruebas
 * lo implementan con un almacén falso en memoria.
 */
export interface BlobsStoreLike {
  getWithMetadata(
    key: string,
    options: { type: "text"; consistency?: BlobsConsistency },
  ): Promise<{ data: string; etag?: string } | null>;
  setJSON(
    key: string,
    data: unknown,
    options: { onlyIfMatch: string } | { onlyIfNew: true },
  ): Promise<{ modified: boolean; etag?: string }>;
  get(
    key: string,
    options: { type: "arrayBuffer"; consistency?: BlobsConsistency },
  ): Promise<ArrayBuffer | null>;
  set(
    key: string,
    data: ArrayBuffer,
    options?: { metadata?: Record<string, unknown> },
  ): Promise<{ modified: boolean; etag?: string }>;
  delete(key: string): Promise<void>;
  deleteAll(): Promise<{ deletedBlobs: number }>;
}

type StoreOpener = () => BlobsStoreLike | Promise<BlobsStoreLike>;

export type BlobsBackendOptions = {
  /** Se invoca en cada operación: el contexto de Netlify Blobs llega con la petición. */
  stateStore: StoreOpener;
  referenceStore: StoreOpener;
  /** Tentativas ante conflicto de ETag antes de rendirse (sin escribir nada). */
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  /** Compartido entre peticiones: recuerda si las lecturas fuertes no están disponibles. */
  consistency?: { strong: boolean };
  log?: (message: string, error?: unknown) => void;
};

export const STATE_KEY = "state";
const BASE_BACKOFF_MS = 40;
const MAX_BACKOFF_MS = 1000;

/**
 * Backend para Netlify Blobs (varias instancias serverless sin memoria compartida).
 * Todo el estado vive en un único blob JSON: cada cambio lee con consistencia
 * fuerte, aplica el comando y escribe solo si el ETag no cambió (`onlyIfMatch`, u
 * `onlyIfNew` en la primera escritura). Ante conflicto reintenta tras una espera
 * aleatoria creciente. Los recibos de idempotencia viajan dentro del mismo blob,
 * así que un reintento tras una respuesta perdida no duplica la operación.
 * No es una base de datos transaccional: ver docs/NETLIFY.md.
 */
export function createBlobsBackend(options: BlobsBackendOptions): DemoBackend {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 8);
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  const random = options.random ?? Math.random;
  const consistency = options.consistency ?? { strong: true };
  const log =
    options.log ??
    ((message: string, error?: unknown) =>
      console.error(`[elite-demo] ${message}`, error ?? ""));

  /** Convierte fallos del servicio en StoreUnavailableError (mensaje apto para el usuario). */
  async function guard<T>(action: () => T | Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (
        error instanceof StoreUnavailableError ||
        error instanceof StoreConfigError
      )
        throw error;
      log("Netlify Blobs no respondió correctamente.", error);
      throw new StoreUnavailableError(undefined, { cause: error });
    }
  }

  /** Lectura fuerte; si el entorno no la admite, lectura eventual (las escrituras siguen siendo condicionales). */
  async function strongRead<T>(
    read: (mode: BlobsConsistency) => Promise<T>,
  ): Promise<T> {
    if (!consistency.strong) return read("eventual");
    try {
      return await read("strong");
    } catch (error) {
      if ((error as Error)?.name !== "BlobsConsistencyError") throw error;
      consistency.strong = false;
      log(
        "Lectura con consistencia fuerte no disponible; se usan lecturas eventuales con escrituras condicionales.",
        error,
      );
      return read("eventual");
    }
  }

  const assertId = (id: string) => {
    if (!isReferenceId(id)) throw new Error("Referencia inválida.");
  };

  async function readEntry(store: BlobsStoreLike) {
    return guard(() =>
      strongRead((mode) =>
        store.getWithMetadata(STATE_KEY, { type: "text", consistency: mode }),
      ),
    );
  }

  return {
    kind: "netlify-blobs",
    singleProcess: false,
    async read(): Promise<SharedState> {
      const store = await guard(options.stateStore);
      const entry = await readEntry(store);
      return entry ? parseSharedState(entry.data) : freshSharedState();
    },
    async update<T>(
      mutate: (previous: SharedState) => Mutation<T>,
      updateOptions?: UpdateOptions,
    ): Promise<T> {
      // true si alguna escritura pudo guardarse sin confirmación (no un 412 limpio).
      let uncertain = false;
      for (let attempt = 1; ; attempt++) {
        const store = await guard(options.stateStore);
        const entry = await readEntry(store);
        const etag = entry?.etag;
        if (entry && !etag) throw new StoreUnavailableError();
        let previous: SharedState;
        try {
          previous = entry ? parseSharedState(entry.data) : freshSharedState();
        } catch (error) {
          if (!updateOptions?.recoverCorrupt) throw error;
          previous = freshSharedState();
        }
        // Las reglas pueden lanzar errores de validación: se propagan sin escribir.
        const { next, value } = mutate(previous);
        if (!next) return value;
        const written = await guard(() =>
          etag
            ? store.setJSON(STATE_KEY, next, { onlyIfMatch: etag })
            : store.setJSON(STATE_KEY, next, { onlyIfNew: true }),
        );
        if (written.modified) {
          if (written.etag) return value;
          // @netlify/blobs 11 trata como guardada cualquier respuesta condicional
          // distinta de 412 (también un 5xx o 403). Sin ETag nuevo se comprueba
          // leyendo; si no coincide, se repite: el recibo evita duplicar.
          const check = await readEntry(store);
          if (check?.data === JSON.stringify(next)) return value;
          uncertain = true;
        }
        if (attempt >= maxAttempts)
          throw uncertain ? new StoreUnavailableError() : new StoreConflictError();
        await sleep(
          Math.round(
            random() *
              Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** (attempt - 1)),
          ),
        );
      }
    },
    async putReference(id: string, reference: StoredReference) {
      assertId(id);
      const store = await guard(options.referenceStore);
      await guard(() =>
        store.set(id, toArrayBuffer(reference.bytes), {
          metadata: { contentType: reference.contentType },
        }),
      );
    },
    async getReference(id: string): Promise<StoredReference | null> {
      assertId(id);
      const store = await guard(options.referenceStore);
      const data = await guard(() =>
        strongRead((mode) =>
          store.get(id, { type: "arrayBuffer", consistency: mode }),
        ),
      );
      if (!data) return null;
      const bytes = new Uint8Array(data);
      const contentType = sniffImageType(bytes);
      return contentType ? { contentType, bytes } : null;
    },
    async deleteReference(id: string) {
      assertId(id);
      const store = await guard(options.referenceStore);
      await guard(() => store.delete(id));
    },
    async clearReferences() {
      const store = await guard(options.referenceStore);
      await guard(() => store.deleteAll());
    },
  };
}

export type BlobsScope = "deploy" | "site";
type EnvLike = Record<string, string | undefined>;

/**
 * Alcance y nombre de los almacenes en Netlify:
 * - `deploy` (predeterminado): `getDeployStore`, datos aislados por despliegue.
 *   Los Deploy Previews nunca leen ni borran datos de producción; cada
 *   despliegue nuevo empieza con la agenda vacía.
 * - `site`: `getStore`, datos que sobreviven a los despliegues pero que
 *   comparten TODOS los contextos. Úsalo solo en el contexto Production.
 */
export function netlifyBlobsSettings(env: EnvLike = process.env): {
  scope: BlobsScope;
  base: string;
} {
  const scope = (env.ELITE_BLOBS_SCOPE?.trim().toLowerCase() ||
    "deploy") as BlobsScope;
  if (scope !== "deploy" && scope !== "site")
    throw new StoreConfigError(
      `ELITE_BLOBS_SCOPE="${env.ELITE_BLOBS_SCOPE}" no es válido. Usa "deploy" (predeterminado) o "site".`,
    );
  const base = env.ELITE_BLOBS_STORE?.trim() || "elite-demo";
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(base))
    throw new StoreConfigError(
      `ELITE_BLOBS_STORE="${env.ELITE_BLOBS_STORE}" no es válido. Usa minúsculas, números y guiones (máximo 40).`,
    );
  return { scope, base };
}

type PatchedFetch = typeof fetch & { _nextOriginalFetch?: typeof fetch };

/** fetch sin la caché de datos de Next.js (lo mismo que hace el runtime de Netlify). */
const unpatchedFetch: typeof fetch = (input, init) => {
  const current = globalThis.fetch as PatchedFetch;
  const original = current._nextOriginalFetch ?? current;
  return original(input, { ...init, next: { internal: true } } as RequestInit);
};

const sharedConsistency = { strong: true };

/** Backend real: abre los almacenes de @netlify/blobs en cada operación. */
export function createNetlifyBlobsBackend(
  env: EnvLike = process.env,
): DemoBackend {
  const { scope, base } = netlifyBlobsSettings(env);
  const open =
    (name: string): StoreOpener =>
    async () => {
      const blobs = await import("@netlify/blobs");
      if (scope === "site") return blobs.getStore({ name, fetch: unpatchedFetch });
      try {
        return blobs.getDeployStore({ name, fetch: unpatchedFetch });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        // Sin región en el contexto: la misma región por defecto que usa el runtime de Next.js en Netlify.
        if (/region/i.test(message))
          return blobs.getDeployStore({
            name,
            fetch: unpatchedFetch,
            region: "us-east-2",
          });
        // `netlify dev` puede no aportar deployID: almacén local del sandbox de la CLI.
        if (
          (error as Error)?.name === "MissingBlobsEnvironmentError" &&
          env.NETLIFY_DEV === "true"
        )
          return blobs.getStore({ name: `${name}-local`, fetch: unpatchedFetch });
        throw error;
      }
    };
  return createBlobsBackend({
    stateStore: open(base),
    referenceStore: open(`${base}-referencias`),
    consistency: sharedConsistency,
  });
}
