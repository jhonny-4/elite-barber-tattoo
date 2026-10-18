import type { DemoBackend } from "./backend.ts";

/**
 * Estado de proceso compartido entre copias del módulo (recarga en caliente de
 * Next.js y bundles distintos por ruta). Se conserva la clave histórica
 * `eliteDemoV4` para que una recarga no pierda suscriptores SSE abiertos.
 */
export type DemoRuntime = {
  /** Cola de escrituras del backend de archivo (un solo proceso). */
  tail: Promise<unknown>;
  /** Suscriptores en memoria (SSE) que reciben un aviso tras cada cambio. */
  listeners: Set<() => void>;
  /** Solo pruebas: backend inyectado en lugar de la selección automática. */
  backendOverride?: DemoBackend;
};

const scope = globalThis as typeof globalThis & { eliteDemoV4?: DemoRuntime };

export function demoRuntime(): DemoRuntime {
  return (scope.eliteDemoV4 ??= {
    tail: Promise.resolve(),
    listeners: new Set(),
  });
}
