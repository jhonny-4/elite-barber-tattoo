import { noStore } from "../demo/http";
import { BookingError } from "./index";
export { noStore };
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin"); if (!origin) return true;
  try { const host = new URL(origin).host; return host === (request.headers.get("host") ?? new URL(request.url).host) || host === request.headers.get("x-forwarded-host"); } catch { return false; }
}
/** Solo los BookingError llevan su mensaje al cliente; el resto se registra y sale genérico (no filtra detalles internos). */
export function errorResponse(error: unknown) {
  if (error instanceof BookingError) return Response.json({ error: error.message }, { status: error.status, headers: noStore });
  console.error(error);
  return Response.json({ error: "No se pudo completar la operación. Intenta de nuevo." }, { status: 500, headers: noStore });
}
export async function readJson(request: Request, max = 10_240) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new BookingError("Usa un cuerpo JSON.");
  const reader = request.body?.getReader(); if (!reader) throw new BookingError("Petición vacía.");
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > max) { await reader.cancel(); throw new BookingError("El cuerpo supera el tamaño permitido.", 413); } chunks.push(part.value); }
  const body = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(body)) as Record<string, unknown>; } catch { throw new BookingError("El cuerpo JSON no es válido."); }
}
