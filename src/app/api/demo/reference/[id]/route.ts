import { readReference } from "../../../../../server/demo/store/repository.ts";
import { isReferenceId } from "../../../../../server/demo/store/references.ts";
import { isStoreServiceError } from "../../../../../server/demo/store/state.ts";
import { accessFrom, noStore } from "../../../../../server/demo/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const notFound = () =>
  Response.json(
    { error: "Referencia no encontrada; puede haberse restablecido la demo." },
    { status: 404, headers: noStore },
  );

/** Imagen de referencia de una solicitud de tatuaje (datos de demostración, sin autenticación). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Las referencias de tatuaje solo las ve el dueño.
  if (accessFrom(request) !== "dueno") return notFound();
  const { id } = await params;
  if (!isReferenceId(id)) return notFound();
  try {
    const reference = await readReference(id);
    if (!reference) return notFound();
    const body = new Uint8Array(reference.bytes);
    return new Response(body, {
      headers: {
        "Content-Type": reference.contentType,
        "Content-Length": String(body.byteLength),
        "Content-Disposition": `inline; filename="referencia-${id.slice(0, 8)}.${extensions[reference.contentType]}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: isStoreServiceError(error)
          ? (error as Error).message
          : "No se pudo leer la referencia de la demo.",
      },
      { status: 503, headers: noStore },
    );
  }
}
