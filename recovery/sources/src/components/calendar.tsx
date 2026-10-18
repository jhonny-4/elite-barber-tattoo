"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  bookingHorizonDays,
  dateKey,
  parseDate,
  shiftDate,
} from "../domain/availability";
import { Icon } from "./icons";

export type CalendarDayStatus = {
  available: boolean;
  /** Motivo visible y accesible cuando el día no se puede elegir. */
  reason?: string;
  /** Horarios libres ese día (solo informativo). */
  count?: number;
};

const WEEKDAYS = [
  ["LUN", "lunes"],
  ["MAR", "martes"],
  ["MIÉ", "miércoles"],
  ["JUE", "jueves"],
  ["VIE", "viernes"],
  ["SÁB", "sábado"],
  ["DOM", "domingo"],
] as const;

const fullDate = new Intl.DateTimeFormat("es-CO", { dateStyle: "full" });
const monthLabel = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
});
const longDay = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const monthOf = (value: string) => {
  const date = parseDate(value);
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
};
const addMonths = (month: Date, amount: number) =>
  new Date(month.getFullYear(), month.getMonth() + amount, 1, 12);
const endOfMonth = (month: Date) =>
  dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0, 12));
/** 0 = lunes … 6 = domingo. */
const weekdayIndex = (value: string) => (parseDate(value).getDay() + 6) % 7;

function shiftMonthKeepingDay(value: string, amount: number) {
  const date = parseDate(value);
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
  const days = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), days));
  return dateKey(target);
}

/** Seis semanas siempre: la losa no cambia de alto al cambiar de mes. */
function weeksOf(month: Date): (string | null)[][] {
  const offset = (month.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: count }, (_, i) =>
      dateKey(new Date(month.getFullYear(), month.getMonth(), i + 1, 12)),
    ),
  ];
  while (cells.length < 42) cells.push(null);
  return Array.from({ length: 6 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

export function Calendar({
  value,
  today,
  onChange,
  getDayStatus,
  lastDate,
}: {
  value: string;
  today: string;
  onChange: (date: string) => void;
  getDayStatus?: (date: string) => CalendarDayStatus;
  lastDate?: string;
}) {
  const last = lastDate ?? shiftDate(today, bookingHorizonDays);
  const firstMonth = monthOf(today);
  const lastMonth = monthOf(last);
  const [month, setMonth] = useState(() => monthOf(value || today));
  const [focusDate, setFocusDate] = useState(value || today);
  const [direction, setDirection] = useState(0);
  const [notice, setNotice] = useState("");
  const [syncedValue, setSyncedValue] = useState(value);
  // Si la fecha cambia desde fuera (p. ej. «próximo día disponible»), se muestra su mes.
  if (syncedValue !== value) {
    setSyncedValue(value);
    if (value) {
      const target = monthOf(value);
      if (target.getTime() !== month.getTime()) {
        setDirection(target > month ? 1 : -1);
        setMonth(target);
      }
      setFocusDate(value);
      setNotice("");
    }
  }

  const grid = useRef<HTMLTableElement>(null);
  const focusPending = useRef(false);
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    grid.current
      ?.querySelector<HTMLButtonElement>(`button[data-date="${focusDate}"]`)
      ?.focus();
  }, [focusDate, month]);

  const labelId = useId();
  const hintId = useId();
  const weeks = useMemo(() => weeksOf(month), [month]);
  const days = weeks.flat().filter((d): d is string => Boolean(d));

  const status = (date: string): CalendarDayStatus => {
    if (date < today) return { available: false, reason: "Fecha pasada" };
    if (date > last)
      return {
        available: false,
        reason: `Fuera del periodo de reserva (hasta ${bookingHorizonDays} días)`,
      };
    return getDayStatus?.(date) ?? { available: true };
  };

  const tabbable = days.includes(focusDate)
    ? focusDate
    : days.includes(value)
      ? value
      : (days.find((d) => status(d).available) ?? days[0]);

  const prevDisabled = month.getTime() <= firstMonth.getTime();
  const nextDisabled = month.getTime() >= lastMonth.getTime();

  function showMonth(target: Date) {
    if (target.getTime() === month.getTime()) return;
    setDirection(target > month ? 1 : -1);
    setMonth(target);
  }

  function moveFocus(next: string) {
    const min = dateKey(firstMonth);
    const max = endOfMonth(lastMonth);
    const clamped = next < min ? min : next > max ? max : next;
    showMonth(monthOf(clamped));
    setFocusDate(clamped);
    focusPending.current = true;
  }

  function onKey(event: React.KeyboardEvent<HTMLButtonElement>, date: string) {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => shiftDate(date, -1),
      ArrowRight: () => shiftDate(date, 1),
      ArrowUp: () => shiftDate(date, -7),
      ArrowDown: () => shiftDate(date, 7),
      Home: () => shiftDate(date, -weekdayIndex(date)),
      End: () => shiftDate(date, 6 - weekdayIndex(date)),
      PageUp: () => shiftMonthKeepingDay(date, -1),
      PageDown: () => shiftMonthKeepingDay(date, 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveFocus(move());
  }

  function choose(date: string) {
    const day = status(date);
    setFocusDate(date);
    if (!day.available) {
      setNotice(
        `${capitalize(longDay.format(parseDate(date)))}: ${day.reason ?? "no disponible"}.`,
      );
      return;
    }
    setNotice("");
    onChange(date);
  }

  const selectedStatus = value ? status(value) : null;
  const statusText =
    notice ||
    (!value || !selectedStatus
      ? "Elige un día disponible."
      : selectedStatus.available
        ? `${capitalize(longDay.format(parseDate(value)))}${
            selectedStatus.count
              ? ` · ${selectedStatus.count} ${selectedStatus.count === 1 ? "horario libre" : "horarios libres"}`
              : ""
          }`
        : `${capitalize(longDay.format(parseDate(value)))}: ${selectedStatus.reason ?? "no disponible"}.`);

  return (
    <div className="cal-slab">
      <div className="cal-top" aria-hidden="true">
        <span className="cal-engraving">
          <i /> Elite · Agenda
        </span>
        <span className="cal-zone">
          <Icon name="clock" /> Hora de Cartagena
        </span>
      </div>
      <div className="cal-head">
        <button
          type="button"
          className="icon-button cal-nav"
          aria-label="Mes anterior"
          disabled={prevDisabled}
          onClick={() => showMonth(addMonths(month, -1))}
        >
          <Icon name="chevron" style={{ transform: "rotate(180deg)" }} />
        </button>
        <h3 className="cal-month" id={labelId} aria-live="polite">
          {monthLabel.format(month)}
        </h3>
        <button
          type="button"
          className="icon-button cal-nav"
          aria-label="Mes siguiente"
          disabled={nextDisabled}
          onClick={() => showMonth(addMonths(month, 1))}
        >
          <Icon name="chevron" />
        </button>
      </div>
      <table
        ref={grid}
        className="cal-grid"
        role="grid"
        aria-labelledby={labelId}
        aria-describedby={hintId}
      >
        <thead>
          <tr>
            {WEEKDAYS.map(([short, long]) => (
              <th key={long} scope="col" abbr={long}>
                {short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody key={dateKey(month)} className="cal-body" data-direction={direction}>
          {weeks.map((week, row) => (
            <tr key={row}>
              {week.map((date, column) => {
                if (!date)
                  return <td key={`empty-${row}-${column}`} className="cal-cell" />;
                const day = status(date);
                const selected = date === value;
                const isToday = date === today;
                const label = [
                  capitalize(fullDate.format(parseDate(date))),
                  isToday ? "hoy" : "",
                  selected ? "seleccionado" : "",
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <td key={date} className="cal-cell" aria-selected={selected}>
                    <button
                      type="button"
                      data-date={date}
                      className={[
                        "cal-day",
                        selected && "is-selected",
                        isToday && "is-today",
                        !day.available && "is-off",
                        column < 2 && "tip-start",
                        column > 4 && "tip-end",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      tabIndex={date === tabbable ? 0 : -1}
                      aria-disabled={!day.available || undefined}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={
                        day.available
                          ? label
                          : `${label}. No disponible: ${day.reason ?? "sin horarios"}`
                      }
                      data-tip={day.available ? undefined : day.reason}
                      onClick={() => choose(date)}
                      onKeyDown={(event) => onKey(event, date)}
                      onFocus={() => setFocusDate(date)}
                    >
                      <span className="cal-face">{parseDate(date).getDate()}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p id={hintId} className="visually-hidden">
        Usa las flechas para moverte entre días, Re Pág y Av Pág para cambiar de
        mes y Enter para elegir. Los días no disponibles explican el motivo.
      </p>
      <p className="cal-status" role="status">
        {statusText}
      </p>
      <ul className="cal-legend" aria-label="Leyenda del calendario">
        <li>
          <span className="cal-swatch is-selected" aria-hidden="true" />
          Elegido
        </li>
        <li>
          <span className="cal-swatch is-today" aria-hidden="true" />
          Hoy
        </li>
        <li>
          <span className="cal-swatch" aria-hidden="true" />
          Disponible
        </li>
        <li>
          <span className="cal-swatch is-off" aria-hidden="true" />
          No disponible
        </li>
      </ul>
    </div>
  );
}
