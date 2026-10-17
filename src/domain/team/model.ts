import { barbers } from "../catalog.ts";
export type Pause = { start: string; end: string; label: string };
export type TeamMember = {
  id: string;
  active: boolean;
  open: string;
  close: string;
  days: number[];
  pauses: Pause[];
  absences: { date: string; start: string; end: string; label: string }[];
};
export const defaultTeam = (): TeamMember[] =>
  barbers.map(({ id }) => ({
    id,
    active: true,
    open: "10:00",
    close: "18:00",
    days: [0, 1, 2, 3, 4, 5, 6],
    pauses: [{ start: "13:00", end: "14:00", label: "Almuerzo demo" }],
    absences: [],
  }));
export const toMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const timeString = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
export const validTime = (time: string) =>
  /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
export function validateTeam(member: TeamMember) {
  if (
    !barbers.some((b) => b.id === member.id) ||
    typeof member.active !== "boolean" ||
    !validTime(member.open) ||
    !validTime(member.close) ||
    member.open >= member.close ||
    toMinutes(member.open) % 15 !== 0 ||
    toMinutes(member.close) % 15 !== 0 ||
    !Array.isArray(member.days) ||
    !member.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) ||
    !Array.isArray(member.pauses) ||
    !Array.isArray(member.absences)
  )
    throw new Error("Revisa profesional, días y jornada de ejemplo.");
  for (const period of [...member.pauses, ...member.absences])
    if (
      !validTime(period.start) ||
      !validTime(period.end) ||
      period.start >= period.end ||
      typeof period.label !== "string" ||
      period.label.length > 100
    )
      throw new Error("Revisa el inicio y final de cada descanso o ausencia.");
  for (const absence of member.absences)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(absence.date) ||
      new Date(`${absence.date}T12:00:00Z`).toISOString().slice(0, 10) !==
        absence.date
    )
      throw new Error("Fecha de ausencia inválida.");
  if (member.pauses.some((p) => p.start < member.open || p.end > member.close))
    throw new Error("Los descansos deben estar dentro de la jornada.");
}
