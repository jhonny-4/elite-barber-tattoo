import { applyCommand } from "./commands.ts";
import { getDemoBackend } from "./backend.ts";
import { demoRuntime } from "./runtime.ts";
import { MAX_RECEIPTS } from "./state.ts";
import {
  decodeReferenceDataUrl,
  findReferenceSource,
  isReferenceId,
  REFERENCE_ERROR,
  referenceUrlFor,
  toPublicState,
} from "./references.ts";
import { createDemoId } from "../../../domain/id.ts";
import type { BackendKind } from "./backend.ts";
import type { StoredReference } from "./references.ts";
import type {
  SharedState,
  DemoCommand,
  CommandResult,
} from "../../../services/contracts/demo.ts";

/** Avisos en memoria para SSE (solo útiles con un único proceso servidor). */
export function subscribe(listener: () => void) {
  const { listeners } = demoRuntime();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Estado compartido apto para HTTP: nunca incluye data URLs de referencias. */
export async function readShared(): Promise<SharedState> {
  return toPublicState(await getDemoBackend().read());
}

/** Backend activo y si admite SSE en memoria. */
export function storeInfo(): { kind: BackendKind; singleProcess: boolean } {
  const { kind, singleProcess } = getDemoBackend();
  return { kind, singleProcess };
}

type Prepared = {
  command: DemoCommand;
  reference?: { id: string; data: StoredReference };
};

/**
 * Extrae la imagen de `tattoo.create` antes de la transacción: valida tipo y
 * tamaño, le asigna un id propio y deja en el comando solo `referenceUrl`.
 * Un `referenceUrl` enviado por el cliente nunca se acepta.
 */
function prepare(command: DemoCommand): Prepared {
  if (
    !command ||
    typeof command !== "object" ||
    command.type !== "tattoo.create" ||
    !command.input ||
    typeof command.input !== "object"
  )
    return { command };
  const input = { ...command.input };
  const dataUrl: unknown = input.referenceDataUrl;
  delete input.referenceDataUrl;
  delete input.referenceUrl;
  if (dataUrl === undefined || dataUrl === null || dataUrl === "")
    return { command: { ...command, input } };
  if (typeof dataUrl !== "string") throw new Error(REFERENCE_ERROR);
  const data = decodeReferenceDataUrl(dataUrl);
  const id = createDemoId();
  return {
    command: { ...command, input: { ...input, referenceUrl: referenceUrlFor(id) } },
    reference: { id, data },
  };
}

type Outcome = {
  result: { state: SharedState; resultId?: string };
  applied: boolean;
};

export async function execute(
  command: DemoCommand,
  key: string,
): Promise<CommandResult> {
  const backend = getDemoBackend();
  const prepared = prepare(command);
  const type =
    prepared.command && typeof prepared.command === "object"
      ? prepared.command.type
      : undefined;
  const reference = prepared.reference;
  // La imagen se guarda antes que el estado: el estado nunca apunta a un archivo inexistente.
  if (reference) await backend.putReference(reference.id, reference.data);
  let outcome: Outcome;
  try {
    outcome = await backend.update<Outcome>(
      (previous) => {
        const receipt = previous.receipts.find((r) => r.key === key);
        if (receipt)
          return {
            next: null,
            value: {
              result: { state: previous, resultId: receipt.resultId },
              applied: false,
            },
          };
        if (previous.receipts.length >= MAX_RECEIPTS && type !== "reset")
          throw new Error(
            "Límite de la presentación alcanzado. Restablece la demo.",
          );
        const result = applyCommand(previous, prepared.command);
        result.state.revision = previous.revision + 1;
        result.state.receipts.push({ key, resultId: result.resultId });
        // Primera escritura de un almacén nuevo o reset: nueva época.
        if (!result.state.epoch || type === "reset")
          result.state.epoch = createDemoId();
        return { next: result.state, value: { result, applied: true } };
      },
      { recoverCorrupt: type === "reset" },
    );
  } catch (error) {
    // Si el almacenamiento falló, el estado pudo guardarse con la imagen enlazada:
    // se conserva (un reset la limpia). Si se rechazó o no se escribió, se borra.
    if (reference && (error as Error)?.name !== "StoreUnavailableError")
      await backend.deleteReference(reference.id).catch(() => undefined);
    throw error;
  }
  // Operación repetida (mismo Idempotency-Key): la imagen nueva sobra, salvo que
  // el estado ya la enlace (escritura propia confirmada en un reintento interno).
  if (
    reference &&
    !outcome.applied &&
    !outcome.result.state.requests.some(
      (r) => r.referenceUrl === referenceUrlFor(reference.id),
    )
  )
    await backend.deleteReference(reference.id).catch(() => undefined);
  if (outcome.applied) {
    if (type === "reset")
      await backend.clearReferences().catch((error: unknown) => {
        console.error("[elite-demo] No se pudieron borrar las referencias.", error);
      });
    for (const listener of demoRuntime().listeners)
      try {
        listener();
      } catch {
        /* A disconnected subscriber cannot roll back a saved command. */
      }
  }
  return {
    state: toPublicState(outcome.result.state),
    resultId: outcome.result.resultId,
  };
}

/** Bytes de una referencia enlazada desde el estado vigente; null si no existe. */
export async function readReference(
  id: string,
): Promise<StoredReference | null> {
  if (!isReferenceId(id)) return null;
  const backend = getDemoBackend();
  const source = findReferenceSource(await backend.read(), id);
  if (!source) return null;
  if (source.kind === "legacy")
    try {
      return decodeReferenceDataUrl(source.dataUrl);
    } catch {
      return null;
    }
  return backend.getReference(id);
}
