import type { SharedState } from "../../../services/contracts/demo.ts";

/** Operaciones registradas (recibos de idempotencia) antes de exigir un reset. */
export const MAX_RECEIPTS = 5000;

/** El estado guardado no tiene el formato V4 esperado. */
export class IncompatibleStateError extends Error {
  constructor() {
    super("Datos incompatibles. Restaura la demo desde administración.");
    this.name = "IncompatibleStateError";
  }
}

/** El almacenamiento no respondió o falló: el resultado de una escritura puede ser incierto. */
export class StoreUnavailableError extends Error {
  constructor(
    message = "El almacenamiento de la demo no respondió. Reintenta la misma operación; su referencia evita duplicados.",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "StoreUnavailableError";
  }
}

/** Demasiadas escrituras simultáneas: ninguna de las tentativas se guardó. */
export class StoreConflictError extends Error {
  constructor() {
    super(
      "La demo está recibiendo muchos cambios a la vez. No se guardó la operación; inténtalo de nuevo.",
    );
    this.name = "StoreConflictError";
  }
}

/** Configuración de almacenamiento inválida (variables de entorno). */
export class StoreConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreConfigError";
  }
}

/** Errores propios cuyo mensaje es seguro y útil para mostrar al usuario. */
export const isStoreServiceError = (error: unknown) =>
  error instanceof Error &&
  ["StoreUnavailableError", "StoreConfigError"].includes(error.name);

/** Valida el estado leído (texto JSON u objeto ya interpretado). */
export function parseSharedState(raw: unknown): SharedState {
  let state: unknown = raw;
  if (typeof raw === "string") {
    try {
      state = JSON.parse(raw);
    } catch {
      throw new IncompatibleStateError();
    }
  }
  const candidate = state as Partial<SharedState> | null;
  if (
    !candidate ||
    typeof candidate !== "object" ||
    candidate.schema !== 4 ||
    !Number.isInteger(candidate.revision) ||
    ![
      candidate.bookings,
      candidate.requests,
      candidate.queue,
      candidate.team,
      candidate.receipts,
      candidate.notifications,
    ].every(Array.isArray)
  )
    throw new IncompatibleStateError();
  return candidate as SharedState;
}
