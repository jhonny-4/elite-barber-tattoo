import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { freshSharedState } from "./commands.ts";
import { demoRuntime } from "./runtime.ts";
import { parseSharedState } from "./state.ts";
import { isReferenceId, sniffImageType } from "./references.ts";
import type { DemoBackend, Mutation, UpdateOptions } from "./backend.ts";
import type { StoredReference } from "./references.ts";
import type { SharedState } from "../../../services/contracts/demo.ts";

/** Carpeta de datos: ELITE_DEMO_DIR o var/demo (se resuelve en cada uso). */
const root = () =>
  resolve(process.env.ELITE_DEMO_DIR ?? join(process.cwd(), "var", "demo"));
const referencesDir = () => join(root(), "references");
const referenceFile = (id: string) => {
  if (!isReferenceId(id)) throw new Error("Referencia inválida.");
  return join(referencesDir(), `${id}.bin`);
};
const missing = (error: unknown) =>
  (error as NodeJS.ErrnoException)?.code === "ENOENT";

/** Escritura atómica: archivo temporal en la misma carpeta y reemplazo con rename. */
async function writeAtomic(
  folder: string,
  target: string,
  data: string | Uint8Array,
  prefix: string,
) {
  await mkdir(folder, { recursive: true });
  const temp = join(folder, `${prefix}-${crypto.randomUUID()}.tmp`);
  await writeFile(temp, data, { mode: 0o600 });
  await rename(temp, target);
}

async function readState(): Promise<SharedState> {
  try {
    return parseSharedState(await readFile(join(root(), "state.json"), "utf8"));
  } catch (error) {
    if (missing(error)) return freshSharedState();
    throw error;
  }
}

/**
 * Backend de archivo para desarrollo local y un único proceso servidor:
 * serializa las escrituras en memoria y reemplaza state.json de forma atómica.
 * No es válido para varias instancias ni para sistemas de archivos efímeros.
 */
export function createFileBackend(): DemoBackend {
  return {
    kind: "file",
    singleProcess: true,
    read: readState,
    update<T>(
      mutate: (previous: SharedState) => Mutation<T>,
      options?: UpdateOptions,
    ): Promise<T> {
      const runtime = demoRuntime();
      const operation = runtime.tail.then(async () => {
        let previous: SharedState;
        try {
          previous = await readState();
        } catch (error) {
          if (!options?.recoverCorrupt) throw error;
          previous = freshSharedState();
        }
        const { next, value } = mutate(previous);
        if (next)
          await writeAtomic(
            root(),
            join(root(), "state.json"),
            JSON.stringify(next),
            "state",
          );
        return value;
      });
      runtime.tail = operation.catch(() => {});
      return operation;
    },
    async putReference(id: string, reference: StoredReference) {
      await writeAtomic(referencesDir(), referenceFile(id), reference.bytes, id);
    },
    async getReference(id: string): Promise<StoredReference | null> {
      try {
        const bytes = new Uint8Array(await readFile(referenceFile(id)));
        const contentType = sniffImageType(bytes);
        return contentType ? { contentType, bytes } : null;
      } catch (error) {
        if (missing(error)) return null;
        throw error;
      }
    },
    async deleteReference(id: string) {
      await rm(referenceFile(id), { force: true });
    },
    async clearReferences() {
      let names: string[];
      try {
        names = await readdir(referencesDir());
      } catch (error) {
        if (missing(error)) return;
        throw error;
      }
      // Solo archivos con el formato propio (<uuid>.bin o temporales <uuid>-*.tmp).
      await Promise.all(
        names
          .filter((name) =>
            /^[0-9a-f-]{36}(?:\.bin|-[0-9a-f-]{36}\.tmp)$/.test(name),
          )
          .map((name) => rm(join(referencesDir(), name), { force: true })),
      );
    },
  };
}
