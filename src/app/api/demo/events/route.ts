import { subscribe } from "../../../../server/demo/store/repository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
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
    },
  });
}
