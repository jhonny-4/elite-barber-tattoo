"use client";
import { useEffect, useRef, useState } from "react";
import {
  bookingHorizonDays,
  dateKey,
  parseDate,
  shiftDate,
} from "../domain/availability";
import { Icon } from "./icons";
export function Calendar({
  value,
  today,
  onChange,
}: {
  value: string;
  today: string;
  onChange: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const date = parseDate(value || today);
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  });
  const selectedRef = useRef<HTMLButtonElement>(null);
  const last = shiftDate(today, bookingHorizonDays);
  const offset = (month.getDay() + 6) % 7;
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const monthEnd = dateKey(
    new Date(month.getFullYear(), month.getMonth() + 1, 0, 12),
  );
  const prevDisabled =
    month <=
    new Date(
      parseDate(today).getFullYear(),
      parseDate(today).getMonth(),
      1,
      12,
    );
  const nextDisabled = monthEnd >= last;
  useEffect(() => {
    const el = selectedRef.current;
    if (el && document.activeElement?.closest(".calendar-grid")) el.focus();
  }, [value, month]);
  function goMonth(direction: number) {
    setMonth(
      new Date(month.getFullYear(), month.getMonth() + direction, 1, 12),
    );
  }
  function keyboard(
    event: React.KeyboardEvent<HTMLButtonElement>,
    date: string,
  ) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (event.key in offsets) {
      event.preventDefault();
      const next = shiftDate(date, offsets[event.key]);
      if (next >= today && next <= last) {
        onChange(next);
        const target = parseDate(next);
        setMonth(new Date(target.getFullYear(), target.getMonth(), 1, 12));
      }
    }
  }
  const label = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(month);
  return (
    <div className="calendar-slab">
      <div className="calendar-engraving">
        <span>ELITE / AGENDA</span>
        <Icon name="spark" />
      </div>
      <div className="calendar-heading">
        <div>
          <span className="eyebrow">ENCUENTRA TU MOMENTO</span>
          <h3 aria-live="polite">{label}</h3>
        </div>
        <div className="calendar-navigation">
          <button
            type="button"
            className="icon-button"
            aria-label="Mes anterior"
            disabled={prevDisabled}
            onClick={() => goMonth(-1)}
          >
            <Icon name="chevron" style={{ transform: "rotate(180deg)" }} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Mes siguiente"
            disabled={nextDisabled}
            onClick={() => goMonth(1)}
          >
            <Icon name="chevron" />
          </button>
        </div>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div
        className="calendar-grid"
        role="group"
        aria-label={`Días de ${label}`}
      >
        {Array.from({ length: offset }, (_, i) => (
          <span className="calendar-blank" key={`blank-${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const date = dateKey(
            new Date(month.getFullYear(), month.getMonth(), i + 1, 12),
          );
          const selected = date === value;
          return (
            <button
              type="button"
              key={date}
              ref={selected ? selectedRef : undefined}
              disabled={date < today || date > last}
              aria-label={new Intl.DateTimeFormat("es-CO", {
                dateStyle: "full",
              }).format(parseDate(date))}
              aria-pressed={selected}
              aria-current={date === today ? "date" : undefined}
              className={`calendar-day ${selected ? "selected" : ""} ${date === today ? "today" : ""}`}
              onClick={() => onChange(date)}
              onKeyDown={(e) => keyboard(e, date)}
            >
              {i + 1}
              {selected && <span className="day-dot" />}
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i />
          Fecha seleccionada
        </span>
        <span>Hora de Cartagena</span>
      </div>
      <div className="calendar-base" aria-hidden="true" />
    </div>
  );
}
