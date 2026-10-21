"use client";
import { useEffect, useRef, type CSSProperties } from "react";

/** Cada columna lleva 0–9 dos veces: el dígito final da al menos una vuelta completa. */
const STRIP = "01234567890123456789".split("");
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * Cifra con efecto ruleta (odómetro) al entrar en pantalla.
 * - El HTML del servidor ya muestra el valor final: sin JavaScript no cambia nada.
 * - Los lectores de pantalla leen el valor real (texto oculto); las columnas son decorativas.
 * - Columnas de ancho fijo (tabular-nums): el giro no mueve el diseño.
 * - Con movimiento reducido o si ya está en pantalla al cargar, no gira.
 */
export function Odometer({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Lo que ya se ve al cargar no se reinicia (sin parpadeo).
    const box = root.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) return;

    const strips = Array.from(
      root.querySelectorAll<HTMLElement>("[data-odo-strip]"),
    );
    strips.forEach((strip) => (strip.style.transform = "translate3d(0, 0, 0)"));

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        strips.forEach((strip, i) => {
          const target = Number(strip.dataset.odoStrip);
          const end = `translate3d(0, ${(-target * 100) / STRIP.length}%, 0)`;
          strip
            .animate(
              [{ transform: "translate3d(0, 0, 0)" }, { transform: end }],
              { duration: 1300 + i * 140, delay: 120, easing: EASE_OUT, fill: "forwards" },
            )
            .finished.then(
              (animation) => {
                // El CSS ya describe la posición final: se libera la animación.
                strip.style.removeProperty("transform");
                animation.cancel();
              },
              () => {},
            );
        });
      },
      { threshold: 0.6 },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      strips.forEach((strip) => {
        strip.getAnimations().forEach((animation) => animation.cancel());
        strip.style.removeProperty("transform");
      });
    };
  }, []);

  return (
    <span className="odometer" ref={ref}>
      <span className="visually-hidden">{value}</span>
      <span className="odometer-reel" aria-hidden="true">
        {Array.from(value).map((char, i) => {
          if (!/\d/.test(char))
            return (
              <span key={i} className="odometer-char">
                {char}
              </span>
            );
          const target = Number(char) + 10;
          return (
            <span key={i} className="odometer-col">
              <span
                className="odometer-strip"
                data-odo-strip={target}
                style={{ "--odo": target } as CSSProperties}
              >
                {STRIP.map((digit, n) => (
                  <span key={n}>{digit}</span>
                ))}
              </span>
              {/* Mantiene el ancho y la línea base del dígito real. */}
              <span className="odometer-ghost">{char}</span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
