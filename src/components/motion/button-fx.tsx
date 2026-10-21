"use client";
import { useEffect } from "react";

/** Botones principales que reciben brillo periódico, imán y onda. */
const SELECTOR = ".home-page .button-accent, .header-book";
const MAX_PULL = 6;
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * Botones vivos de la portada:
 * - Onda al pulsar (cualquier puntero): pseudo-elemento animado con WAAPI, sin tocar
 *   el DOM de React. Con movimiento reducido no hay onda.
 * - Atracción magnética ≤ 6 px solo con puntero fino, mediante la propiedad `translate`
 *   (compone con el `transform` de los estados hover/press del botón 3D).
 * El brillo metálico periódico es CSS (src/styles/cinematic.css).
 */
export function ButtonFx() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (reduce.matches) return;

    const buttons = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
    const offs = buttons.map((button) => {
      button.setAttribute("data-fx", "");

      const press = (event: PointerEvent) => {
        if (button.matches(":disabled, [aria-disabled='true'], [aria-busy='true']")) return;
        const box = button.getBoundingClientRect();
        button.style.setProperty("--fx-x", `${event.clientX - box.left}px`);
        button.style.setProperty("--fx-y", `${event.clientY - box.top}px`);
        button.animate(
          [
            { opacity: 0.55, transform: "scale(0.15)" },
            { opacity: 0, transform: "scale(1)" },
          ],
          { duration: 560, easing: EASE_OUT, pseudoElement: "::after" },
        );
      };

      const move = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || !fine.matches) return;
        const box = button.getBoundingClientRect();
        const dx = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
        const dy = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);
        const clamp = (v: number) => Math.max(-1, Math.min(1, v));
        button.style.translate = `${(clamp(dx) * MAX_PULL).toFixed(2)}px ${(clamp(dy) * MAX_PULL * 0.5).toFixed(2)}px`;
      };
      const leave = () => button.style.removeProperty("translate");

      button.addEventListener("pointerdown", press);
      button.addEventListener("pointermove", move);
      button.addEventListener("pointerleave", leave);
      return () => {
        button.removeEventListener("pointerdown", press);
        button.removeEventListener("pointermove", move);
        button.removeEventListener("pointerleave", leave);
        leave();
        button.removeAttribute("data-fx");
      };
    });
    return () => offs.forEach((off) => off());
  }, []);
  return null;
}
