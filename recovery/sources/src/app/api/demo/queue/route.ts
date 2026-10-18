import { readShared } from "../../../../server/demo/store/repository.ts";
import { commandResponse, noStore } from "../../../../server/demo/http.ts";
import { isStoreServiceError } from "../../../../server/demo/store/state.ts";
import { publicQueue, ticketView } from "../../../../domain/queue/logic.ts";
import type { CommandResult } from "../../../../services/contracts/demo.ts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const unavailable = (error: unknown) =>
  Response.json(
    {
      error: isStoreServiceError(error)
        ? (error as Error).message
        : "Servidor no disponible.",
    },
    { status: 503, headers: noStore },
  );
export async function GET(request: Request) {
  try {
    const state = await readShared();
    const token = new URL(request.url).searchParams.get("ticket");
    if (token) {
      const ticket = state.queue.find((t) => t.token === token);
      return ticket
        ? Response.json(ticketView(state, ticket), { headers: noStore })
        : Response.json(
            {
              error: "Turno no encontrado; puede que se hayan restablecido los datos.",
            },
            { status: 404, headers: noStore },
          );
    }
    return Response.json(publicQueue(state), { headers: noStore });
  } catch (error) {
    return unavailable(error);
  }
}
export async function POST(request: Request) {
  // Reuse strict body/idempotency validation; return only the generated ticket capability, not other customers.
  const response = await commandResponse(request, ["queue.join"]);
  if (!response.ok) return response;
  try {
    const result = (await response.json()) as CommandResult;
    const ticket = result.state.queue.find((t) => t.id === result.resultId);
    if (!ticket) throw new Error("Turno guardado no encontrado.");
    return Response.json(
      { ticket: ticketView(result.state, ticket), token: ticket.token },
      { headers: noStore },
    );
  } catch (error) {
    return unavailable(error);
  }
}
