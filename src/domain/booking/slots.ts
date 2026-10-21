export type SlotRules = {
  date: string;
  opens: string;
  closes: string;
  durationMin: number;
  breaks: { starts: string; ends: string }[];
  busy: { startsAt: number; endsAt: number }[];
  now: number;
  barberId?: string;
};

export type SlotRow = { time: string; available: boolean };
export type BarberSummary = { id: string; slug: string; display_name: string; photo_path: string | null; bio: string | null; sort_order: number };
export type ServiceSummary = { id: string; slug: string; name: string; price_cop: number; duration_min: number; sort_order: number };
export type BarberServiceLink = { barber_id: string; service_id: string };

const minutes = (value: string) => {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
};

export function localBogota(date: string, time: string) {
  return Date.parse(`${date}T${time}:00-05:00`);
}

export function slotsForDay(rules: SlotRules) {
  const open = minutes(rules.opens), close = minutes(rules.closes);
  const out: { time: string; available: boolean }[] = [];
  for (let start = open; start + rules.durationMin <= close; start += 15) {
    const time = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
    const from = localBogota(rules.date, time), to = from + rules.durationMin * 60_000;
    const past = from <= rules.now + 30 * 60_000;
    const paused = rules.breaks.some((b) => start < minutes(b.ends) && start + rules.durationMin > minutes(b.starts));
    const occupied = rules.busy.some((b) => from < b.endsAt && to > b.startsAt);
    out.push({ time, available: !past && !paused && !occupied });
  }
  return out;
}

export function combineAny(days: { barberId: string; slots: ReturnType<typeof slotsForDay> }[]) {
  const byTime = new Map<string, boolean>();
  for (const day of days) for (const slot of day.slots)
    byTime.set(slot.time, (byTime.get(slot.time) ?? false) || slot.available);
  return [...byTime].sort(([a], [b]) => a.localeCompare(b)).map(([time, available]) => ({ time, available }));
}
