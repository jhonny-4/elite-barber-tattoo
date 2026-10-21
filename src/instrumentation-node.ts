/** Cola de reintentos de confirmaciones: solo en el servidor Node de producción. */
export async function startConfirmationRetries() {
  if (
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
