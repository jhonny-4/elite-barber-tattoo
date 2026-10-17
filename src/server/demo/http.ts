import { execute } from "./store/repository.ts";
import type { DemoCommand } from "../../services/contracts/demo.ts";
export const noStore = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};
export async function commandResponse(request: Request, allowed?: string[]) {
  try {
    const origin = request.headers.get("origin");
    if (
      origin &&
      new URL(origin).host !==
        (request.headers.get("host") ?? new URL(request.url).host)
    )
      return Response.json(
        { error: "Origen no permitido." },
        { status: 403, headers: noStore },
      );
    if (!request.headers.get("content-type")?.includes("application/json"))
      throw new Error("Usa un cuerpo JSON.");
    const key = request.headers.get("idempotency-key");
    if (!key || !/^[a-zA-Z0-9-]{8,100}$/.test(key))
      throw new Error("Falta la referencia única de la operación.");
    if (Number(request.headers.get("content-length") ?? 0) > 1600000)
      return Response.json(
        { error: "Referencia demasiado grande." },
        { status: 413, headers: noStore },
      );
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Petición vacía.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 1600000) {
        await reader.cancel();
        throw new Error("Referencia demasiado grande.");
      }
      chunks.push(part.value);
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    const command = JSON.parse(new TextDecoder().decode(buffer)) as DemoCommand;
    if (allowed && !allowed.includes(command.type))
      throw new Error("Operación no permitida en este endpoint.");
    const result = await execute(command, key);
    return Response.json(result, { headers: noStore });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la operación demo.",
      },
      { status: 409, headers: noStore },
    );
  }
}
