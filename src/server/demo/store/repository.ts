import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join, resolve } from "node:path";
import { applyCommand, freshSharedState } from "./commands.ts";
import type {
  SharedState,
  DemoCommand,
  CommandResult,
} from "../../../services/contracts/demo.ts";
type StoreRuntime = { tail: Promise<unknown>; listeners: Set<() => void> };
const globalStore = globalThis as typeof globalThis & {
  eliteDemoV4?: StoreRuntime;
};
const runtime = (globalStore.eliteDemoV4 ??= {
  tail: Promise.resolve(),
  listeners: new Set(),
});
const root = () =>
  resolve(process.env.ELITE_DEMO_DIR ?? join(process.cwd(), "var", "demo"));
export function subscribe(listener: () => void) {
  runtime.listeners.add(listener);
  return () => runtime.listeners.delete(listener);
}
export async function readShared(): Promise<SharedState> {
  try {
    const state = JSON.parse(
      await readFile(join(root(), "state.json"), "utf8"),
    ) as SharedState;
    if (
      state.schema !== 4 ||
      !Number.isInteger(state.revision) ||
      ![
        state.bookings,
        state.requests,
        state.queue,
        state.team,
        state.receipts,
        state.notifications,
      ].every(Array.isArray)
    )
      throw new Error(
        "Datos incompatibles. Restaura la demo desde administración.",
      );
    return state;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return freshSharedState();
    throw error;
  }
}
export async function execute(
  command: DemoCommand,
  key: string,
): Promise<CommandResult> {
  const operation = runtime.tail.then(async () => {
    let previous: SharedState;
    try {
      previous = await readShared();
    } catch (error) {
      if (command.type !== "reset") throw error;
      previous = freshSharedState();
    }
    const receipt = previous.receipts.find((r) => r.key === key);
    if (receipt) return { state: previous, resultId: receipt.resultId };
    if (previous.receipts.length >= 5000 && command.type !== "reset")
      throw new Error(
        "Límite de la presentación alcanzado. Restablece la demo.",
      );
    const result = applyCommand(previous, command);
    result.state.revision = previous.revision + 1;
    result.state.receipts.push({ key, resultId: result.resultId });
    await mkdir(root(), { recursive: true });
    const temp = join(root(), `state-${crypto.randomUUID()}.tmp`);
    await writeFile(temp, JSON.stringify(result.state), {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temp, join(root(), "state.json"));
    for (const listener of runtime.listeners)
      try {
        listener();
      } catch {
        /* A disconnected subscriber cannot roll back a saved command. */
      }
    return result;
  });
  runtime.tail = operation.catch(() => {});
  return operation;
}
