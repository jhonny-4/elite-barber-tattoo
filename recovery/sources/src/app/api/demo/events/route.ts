import {
  storeInfo,
  subscribe,
} from "../../../../server/demo/store/repository.ts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * SSE solo con un único proceso servidor (backend de archivo). En serverless
 * (Netlify Blobs) los avisos en memoria no cruzan instancias: se responde 204 y
 * EventSource deja de reconectar; los clientes pasan a sondeo adaptativo.
 */
export function GET(request: Request) {
  let singleProcess = false;
  try {
    singleProcess = storeInfo().singleProcess;
  } catch {
    /* Configuración inválida: sin SSE; la API informa del error. */
  }
  if (!singleProcess)
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store, max-age=0", "X-Elite-Sync": "polling" },
    });
  const encoder = new TextEncoder();
  let dispose = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        unsubscribe();
        request.signal.removeEventListener("abort", close);
        try {
          controller.close();
        } catch {}
      };
      const send = (text: string) => {
        if (!closed)
          try {
            controller.enqueue(encoder.encode(text));
          } catch {
            close();
          }
      };
      const unsubscribe = subscribe(() => send('data: {"refresh":true}\n\n'));
      const timer = setInterval(() => send(": heartbeat\n\n"), 15000);
      dispose = close;
      request.signal.addEventListener("abort", close);
      send('retry: 2500\ndata: {"connected":true}\n\n');
      if (request.signal.aborted) close();
    },
    cancel() {
      dispose();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Elite-Sync": "sse",
    },
  });
}
