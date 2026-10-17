import { readShared } from "../../../server/demo/store/repository";
import { commandResponse, noStore } from "../../../server/demo/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await readShared(), { headers: noStore });
  } catch {
    return Response.json(
      {
        error:
          "No se pudo leer la demo. Revisa o restablece los datos locales.",
      },
      { status: 503, headers: noStore },
    );
  }
}
export const POST = (request: Request) => commandResponse(request);
