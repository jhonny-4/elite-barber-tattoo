/** Hostinger ejecuta un servidor Node persistente. Cada instancia usa la misma cola en DB.
 * Resend recibe una clave de idempotencia por cita, incluso con varios procesos.
 */
export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PHASE === "phase-production-build" ||
    !process.env.RESEND_API_KEY
  )
    return;
  const { retryPendingConfirmations } = await import("./server/bookings");
  let busy = false;
  const timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await retryPendingConfirmations();
    } catch {
      console.error("No se pudo procesar la cola de confirmaciones.");
    } finally {
      busy = false;
    }
  }, 60000);
  timer.unref();
}
