/**
 * Reglas de reprogramación y cancelación por el cliente. Puras (sin servidor ni base)
 * para poder probarlas y compartirlas entre la página, la acción y la API.
 * La base de datos las vuelve a aplicar dentro de reschedule_booking_by_token.
 */
export const CHANGE_WINDOW_MS = 2 * 60 * 60 * 1000;
export const MAX_RESCHEDULES = 3;

export type RescheduleDenial = "no_confirmada" | "fuera_de_ventana" | "limite";

export function checkReschedule(input: {
  status: string;
  startsAt: number;
  now: number;
  rescheduleCount: number;
}): { ok: true } | { ok: false; reason: RescheduleDenial } {
  if (input.status !== "confirmada") return { ok: false, reason: "no_confirmada" };
  // Estrictamente más de 2 h: a las 2 h exactas ya no se puede (igual que cancelar).
  if (input.startsAt - input.now <= CHANGE_WINDOW_MS) return { ok: false, reason: "fuera_de_ventana" };
  if (input.rescheduleCount >= MAX_RESCHEDULES) return { ok: false, reason: "limite" };
  return { ok: true };
}

export const denialMessage: Record<RescheduleDenial, string> = {
  no_confirmada: "Esta cita ya no se puede reprogramar.",
  fuera_de_ventana: "Faltan menos de 2 horas para tu cita. Escríbenos por WhatsApp para ayudarte.",
  limite: `Esta cita ya se reprogramó ${MAX_RESCHEDULES} veces. Escríbenos por WhatsApp si necesitas otro cambio.`,
};
