import { execute } from "./store/repository.ts";
import { isStoreServiceError } from "./store/state.ts";
import type { DemoCommand } from "../../services/contracts/demo.ts";
class RequestError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export const noStore = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};
/**
 * Protección básica contra envíos desde otros sitios: si el navegador manda
 * Origin, debe coincidir con el Host de la petición (o el X-Forwarded-Host que
 * añade un proxy como el de Netlify). No sustituye a una autenticación real.
 */
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const hosts = new Set([
    request.headers.get("host") ?? new URL(request.url).host,
  ]);
  const forwarded = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  if (forwarded) hosts.add(forwarded);
  return hosts.has(originHost);
}
export async function commandResponse(request: Request, allowed?: string[]) {
  try {
    if (!sameOrigin(request))
      return Response.json(
        { error: "Origen no permitido." },
        { status: 403, headers: noStore },
      );
    if (!request.headers.get("content-type")?.includes("application/json"))
      throw new RequestError("Usa un cuerpo JSON.");
    const key = request.headers.get("idempotency-key");
    if (!key || !/^[a-zA-Z0-9-]{8,100}$/.test(key))
      throw new RequestError("Falta la referencia única de la operación.");
    if (Number(request.headers.get("content-length") ?? 0) > 1600000)
      return Response.json(
        { error: "Referencia demasiado grande." },
        { status: 413, headers: noStore },
      );
    const reader = request.body?.getReader();
    if (!reader) throw new RequestError("Petición vacía.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 1600000) {
        await reader.cancel();
        throw new RequestError("Referencia demasiado grande.", 413);
      }
      chunks.push(part.value);
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    let command: DemoCommand;
    try {
      command = JSON.parse(new TextDecoder().decode(buffer)) as DemoCommand;
    } catch {
      throw new RequestError("El cuerpo no es JSON válido.");
    }
    if (!command || typeof command !== "object" || typeof command.type !== "string")
      throw new RequestError("Operación inválida.");
    if (allowed && !allowed.includes(command?.type))
      throw new RequestError("Operación no permitida en este endpoint.");
    const result = await execute(command, key);
    return Response.json(result, { headers: noStore });
  } catch (error) {
    // 503: el almacenamiento falló y el resultado puede ser incierto; el cliente
    // conserva su Idempotency-Key para reintentar sin duplicar.
    if (isStoreServiceError(error))
      return Response.json(
        { error: (error as Error).message },
        { status: 503, headers: noStore },
      );
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la operación demo.",
      },
      { status: error instanceof RequestError ? error.status : 409, headers: noStore },
    );
  }
}
