"use client";
import { useState } from "react";

const labels = ["", "Mala", "Regular", "Buena", "Muy buena", "Excelente"];

/** Selector de 1 a 5 estrellas (radios accesibles con teclado) con brillo al elegir. */
export function StarInput() {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset className="rv-stars-input" onMouseLeave={() => setHover(0)}>
      <legend>Tu calificación</legend>
      <div className="rv-stars-row">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= shown ? "is-on" : ""} onMouseEnter={() => setHover(n)}>
            <input type="radio" name="rating" value={n} required checked={value === n} onChange={() => setValue(n)} />
            <span aria-hidden="true">★</span>
            <span className="visually-hidden">{n} {n === 1 ? "estrella" : "estrellas"}</span>
          </label>
        ))}
      </div>
      <p className="rv-stars-label" aria-live="polite">{labels[shown] || "Toca una estrella"}</p>
    </fieldset>
  );
}
