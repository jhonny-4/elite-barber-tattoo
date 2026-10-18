"use client";
import { useRef, useState } from "react";
import { Icon } from "../icons";
import type { SlotView } from "./availability-view";

const periods = [
  { id: "manana", label: "Mañana", test: (time: string) => time < "12:00" },
  {
    id: "tarde",
    label: "Tarde",
    test: (time: string) => time >= "12:00" && time < "18:00",
  },
  { id: "noche", label: "Noche", test: (time: string) => time >= "18:00" },
];

const navigationKeys = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
];

/**
 * Rejilla de horarios. Un solo punto de tabulación; las flechas recorren la
 * rejilla (arriba/abajo por filas visuales). Los horarios no disponibles se
 * pueden enfocar para conocer el motivo, pero no se seleccionan.
 */
export function TimeSlots({
  slots,
  value,
  onChange,
  dateLabel,
  empty,
  describedBy,
}: {
  slots: SlotView[];
  value: string;
  onChange: (time: string) => void;
  dateLabel: string;
  /** Contenido cuando no queda ningún horario libre. */
  empty?: React.ReactNode;
  describedBy?: string;
}) {
  const [focusTime, setFocusTime] = useState(value);
  const [notice, setNotice] = useState("");
  const group = useRef<HTMLDivElement>(null);
  const free = slots.filter((slot) => slot.available).length;
  const tabbable = slots.some((slot) => slot.time === focusTime)
    ? focusTime
    : slots.some((slot) => slot.time === value)
      ? value
      : (slots.find((slot) => slot.available) ?? slots[0])?.time;

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!navigationKeys.includes(event.key)) return;
    const buttons = [
      ...(group.current?.querySelectorAll<HTMLButtonElement>("button[data-slot]") ??
        []),
    ];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    let target = index;
    if (event.key === "ArrowLeft") target = Math.max(0, index - 1);
    else if (event.key === "ArrowRight")
      target = Math.min(buttons.length - 1, index + 1);
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = buttons.length - 1;
    else {
      const current = buttons[index].getBoundingClientRect();
      const down = event.key === "ArrowDown";
      let best = Infinity;
      buttons.forEach((button, i) => {
        const rect = button.getBoundingClientRect();
        const dy = down ? rect.top - current.top : current.top - rect.top;
        if (dy <= 4) return;
        const score = dy * 1000 + Math.abs(rect.left - current.left);
        if (score < best) {
          best = score;
          target = i;
        }
      });
    }
    buttons[target].focus();
    setFocusTime(buttons[target].dataset.slot ?? "");
  }

  function choose(slot: SlotView) {
    setFocusTime(slot.time);
    if (!slot.available) {
      setNotice(`${slot.time} no disponible: ${slot.reason}.`);
      return;
    }
    setNotice("");
    onChange(slot.time);
  }

  const order = new Map(slots.map((slot, i) => [slot.time, i]));
  return (
    <div className="bk-slots">
      <div className="bk-slots-head">
        <h3 className="bk-slots-title">
          Horarios
          {dateLabel && <span>{dateLabel}</span>}
        </h3>
        <span className="status-badge" data-tone={free ? "ok" : "muted"}>
          {free} {free === 1 ? "libre" : "libres"}
        </span>
      </div>
      {free === 0 && empty}
      {slots.length > 0 && (
        <div
          ref={group}
          className="bk-slot-groups"
          role="radiogroup"
          aria-label={`Horarios${dateLabel ? ` del ${dateLabel}` : ""}`}
          aria-describedby={describedBy}
          onKeyDown={onKeyDown}
        >
          {periods.map((period) => {
            const list = slots.filter((slot) => period.test(slot.time));
            if (!list.length) return null;
            const periodFree = list.filter((slot) => slot.available).length;
            return (
              <div key={period.id} className="bk-slot-group">
                <p className="bk-slot-period">
                  {period.label}
                  <span>
                    {periodFree} {periodFree === 1 ? "libre" : "libres"}
                  </span>
                </p>
                <div className="bk-slot-grid">
                  {list.map((slot) => {
                    const selected = slot.available && slot.time === value;
                    const delay = Math.min(order.get(slot.time) ?? 0, 18);
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        role="radio"
                        data-slot={slot.time}
                        aria-checked={selected}
                        aria-disabled={!slot.available || undefined}
                        aria-label={
                          slot.available
                            ? slot.time
                            : `${slot.time}, no disponible: ${slot.reason}`
                        }
                        tabIndex={slot.time === tabbable ? 0 : -1}
                        className={[
                          "bk-slot",
                          selected && "is-selected",
                          !slot.available && "is-off",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{ "--i": delay } as React.CSSProperties}
                        onClick={() => choose(slot)}
                        onFocus={() => setFocusTime(slot.time)}
                      >
                        <span className="bk-slot-time">{slot.time}</span>
                        {slot.available ? (
                          selected && <Icon name="check" className="bk-slot-check" />
                        ) : (
                          <span className="bk-slot-reason" aria-hidden="true">
                            {slot.short}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="bk-slots-status" role="status">
        {notice}
      </p>
    </div>
  );
}
