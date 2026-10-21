import {
  readShared,
  storeInfo,
} from "../../../server/demo/store/repository.ts";
import { accessFrom, commandResponse, noStore, stateFor } from "../../../server/demo/http.ts";
import { isStoreServiceError } from "../../../server/demo/store/state.ts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const state = await readShared();
    return Response.json(stateFor(state, accessFrom(request)), {
      headers: { ...noStore, "X-Elite-Store": storeInfo().kind },
    });
  } catch (error) {
    const known =
      isStoreServiceError(error) ||
      (error as Error)?.name === "IncompatibleStateError";
    return Response.json(
      {
        error: known
          ? (error as Error).message
          : "No se pudo leer la demo. Revisa el almacenamiento o restablece los datos.",
      },
      { status: 503, headers: noStore },
    );
  }
}
export const POST = (request: Request) => commandResponse(request);
