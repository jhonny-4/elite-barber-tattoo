/** Hostinger ejecuta un servidor Node persistente. Cada instancia usa la misma cola en DB.
 * Resend recibe una clave de idempotencia por cita, incluso con varios procesos.
 * El `if` positivo con NEXT_RUNTIME permite a Next descartar el módulo Node en el bundle edge.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startConfirmationRetries } = await import("./instrumentation-node");
    await startConfirmationRetries();
  }
}
