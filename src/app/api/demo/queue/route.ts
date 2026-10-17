import { readShared } from "../../../../server/demo/store/repository";
import { commandResponse, noStore } from "../../../../server/demo/http";
import { publicQueue, ticketView } from "../../../../domain/queue/logic";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
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
              error: "Turno no encontrado; puede haberse restablecido la demo.",
            },
            { status: 404, headers: noStore },
          );
    }
    return Response.json(publicQueue(state), { headers: noStore });
  } catch {
    return Response.json(
      { error: "Servidor demo no disponible." },
      { status: 503, headers: noStore },
    );
  }
}
export async function POST(request: Request) {
  // Reuse strict body/idempotency validation; return only the generated ticket capability, not other customers.
  const response = await commandResponse(request, ["queue.join"]);
  if (!response.ok) return response;
  const result = await response.json();
  const ticket = result.state.queue.find(
    (t: { id: string }) => t.id === result.resultId,
  );
  return Response.json(
    { ticket: ticketView(result.state, ticket), token: ticket.token },
    { headers: noStore },
  );
}
