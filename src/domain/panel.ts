// Reglas puras del panel (bloqueos, fichas de cliente y caja). Sin I/O: se prueban en tests/panel.test.ts.
// Autocontenido (sin imports) para poder probarse con node --experimental-strip-types.
const localBogota = (date: string, time: string) => Date.parse(`${date}T${time}:00-05:00`);

const DAY = 86_400_000;

/** Teléfono normalizado a solo dígitos y sin el 57 de Colombia; null si no es un teléfono válido. */
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("57")) digits = digits.slice(2);
  return /^[0-9]{7,15}$/.test(digits) ? digits : null;
}

export type AbsenceInput =
  | { kind: "resto" }
  | { kind: "rango"; from: string; to: string }
  | { kind: "vacaciones"; dateFrom: string; dateTo: string };

export const validDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00-05:00`));
export const validTime = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const bogotaDay = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(ms));
const nextDay = (date: string) => bogotaDay(localBogota(date, "12:00") + DAY);

/** Ventana del bloqueo en UTC según el tipo. Lanza Error con un mensaje en español si es inválido. */
export function absenceWindow(input: AbsenceInput, now: number) {
  const today = bogotaDay(now);
  if (input.kind === "resto") {
    // Desde ahora hasta la medianoche de Cartagena.
    return { startsAt: now, endsAt: localBogota(nextDay(today), "00:00"), reason: "Resto del día" };
  }
  if (input.kind === "rango") {
    if (!validTime(input.from) || !validTime(input.to)) throw new Error("Hora inválida.");
    const startsAt = Math.max(localBogota(today, input.from), now);
    const endsAt = localBogota(today, input.to);
    if (endsAt <= startsAt) throw new Error("La hora final debe ser posterior a la inicial y a la hora actual.");
    return { startsAt, endsAt, reason: "Bloqueo del día" };
  }
  if (!validDate(input.dateFrom) || !validDate(input.dateTo)) throw new Error("Fecha inválida.");
  if (input.dateTo < input.dateFrom) throw new Error("La fecha final no puede ser anterior a la inicial.");
  if (input.dateTo < today) throw new Error("Las vacaciones deben terminar hoy o después.");
  const startsAt = localBogota(input.dateFrom, "00:00");
  const endsAt = localBogota(nextDay(input.dateTo), "00:00");
  if ((endsAt - startsAt) / DAY > 60) throw new Error("Las vacaciones no pueden pasar de 60 días.");
  return { startsAt: Math.max(startsAt, now), endsAt, reason: "Vacaciones" };
}

export type CajaRow = {
  /** Cobro en línea aprobado (Bold) en pesos; 0 si no hubo. */
  paidOnline: number;
  paidInStore: boolean;
  price: number;
};

/** Cada servicio cae en una sola columna: ya pagado en línea, cobrado en el local o por cobrar. */
export function cajaState(row: CajaRow): "en_linea" | "local" | "por_cobrar" {
  if (row.paidOnline > 0) return "en_linea";
  return row.paidInStore ? "local" : "por_cobrar";
}

export function cajaTotals(rows: CajaRow[]) {
  const totals = { services: rows.length, total: 0, online: 0, store: 0, pending: 0 };
  for (const row of rows) {
    totals.total += row.price;
    const state = cajaState(row);
    if (state === "en_linea") totals.online += row.price;
    else if (state === "local") totals.store += row.price;
    else totals.pending += row.price;
  }
  return totals;
}

/** Entero positivo en pesos (COP no usa centavos), o null. */
export const copAmount = (value: unknown, min = 0, max = 100_000_000): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : null;
