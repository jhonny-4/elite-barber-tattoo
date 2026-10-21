/**
 * Ventanas de tiempo del cron de avisos. Funciones puras (sin "server-only") para probarlas con node --test.
 * El cron corre cada 5 min; cada ventana mide 30 min para tolerar retrasos o un tick perdido.
 * La tabla notifications (único por cita+canal+plantilla) evita que el solape cause duplicados.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;

export type Window = { from: string; to: string };
export type ReminderKind = "recordatorio_24h" | "recordatorio_2h";

const span = (now: number, startMs: number, endMs: number): Window => ({
  from: new Date(now + startMs).toISOString(),
  to: new Date(now + endMs).toISOString(),
});

/** Citas cuyo inicio cae en [now+23h45, now+24h15) o [now+1h45, now+2h15). */
export function reminderWindow(kind: ReminderKind, now: number): Window {
  const center = kind === "recordatorio_24h" ? 24 * HOUR : 2 * HOUR;
  return span(now, center - 15 * MIN, center + 15 * MIN);
}

/** Citas finalizadas cuyo fin programado fue hace entre 1 y 3 horas: [now-3h, now-1h). */
export function reviewWindow(now: number): Window {
  return span(now, -3 * HOUR, -1 * HOUR);
}

const bogota = (now: number) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(now))
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
};

/** Día de Bogotá (YYYY-MM-DD) si `now` está entre 8:00 y 8:14 hora local; si no, null. */
export function digestDay(now: number): string | null {
  const { day, hour, minute } = bogota(now);
  return hour === 8 && minute < 15 ? day : null;
}

/** Inicio y fin (exclusivo) de un día de Bogotá. Colombia no usa horario de verano: UTC-5 fijo. */
export function bogotaDayRange(day: string): Window {
  const start = Date.parse(`${day}T00:00:00-05:00`);
  return { from: new Date(start).toISOString(), to: new Date(start + 24 * HOUR).toISOString() };
}
