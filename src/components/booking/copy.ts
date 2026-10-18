/**
 * Textos públicos del área de reservas.
 *
 * Algunos mensajes del dominio y del servidor conservan la palabra «demo»
 * (p. ej. «Ocupado en demo»). La experiencia pública no la muestra
 * (docs/DISENO.md): aquí solo se limpia la presentación, sin cambiar reglas.
 */
export function publicMessage(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\s+(?:de\s+(?:la\s+)?|en\s+(?:la\s+)?)?demo\b/gi, "")
    .replace(/\bdemo\s+/gi, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Etiqueta corta para un horario no disponible (la razón completa va en el nombre accesible). */
export function shortSlotReason(reason: string): string {
  const text = publicMessage(reason);
  if (!text) return "No disponible";
  if (/pasad/i.test(text)) return "Pasado";
  if (/ocupad/i.test(text)) return "Ocupado";
  if (/^no disponible:\s*/i.test(text))
    return text.replace(/^no disponible:\s*/i, "") || "Pausa";
  if (/jornada/i.test(text)) return "Sin jornada";
  if (/pausad/i.test(text)) return "En pausa";
  if (/inactiv/i.test(text)) return "Inactivo";
  if (/en curso/i.test(text)) return "En atención";
  if (/sin profesional|ocupados|completo/i.test(text)) return "Completo";
  return "No disponible";
}

/** Formatos de fecha en español de Colombia, siempre sobre claves `AAAA-MM-DD`. */
const dayMonth = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function shortDate(date: Date) {
  return dayMonth.format(date).replace(/\./g, "");
}

export const steps = [
  { id: 1, label: "Servicio", title: "Servicio y profesional" },
  { id: 2, label: "Fecha y hora", title: "Fecha y hora" },
  { id: 3, label: "Tus datos", title: "Tus datos" },
  { id: 4, label: "Confirmar", title: "Revisión y confirmación" },
] as const;

export type StepId = (typeof steps)[number]["id"];
