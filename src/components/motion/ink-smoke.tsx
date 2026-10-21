"use client";
import { useEffect, useId, useRef } from "react";

/** Capas de tinta: [color, opacidad, semilla de turbulencia]. */
const LAYERS = [
  ["#3a3a3a", 0.9, 3],
  ["#e11d2e", 0.32, 11],
  ["#9a9a9a", 0.28, 23],
] as const;

/**
 * Tinta/humo detrás del monograma JC a bajo coste: cada capa es un SVG con
 * turbulencia ESTÁTICA (se rasteriza una vez) que solo se mueve con `transform`
 * y `opacity` mediante CSS. Se pausa fuera de pantalla; con movimiento reducido queda
 * quieta. Decorativo (aria-hidden).
 */
export function InkSmoke() {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^\w-]/g, "");

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) el.setAttribute("data-inview", "");
        else el.removeAttribute("data-inview");
      },
      { rootMargin: "80px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="ink-smoke" aria-hidden="true">
      {LAYERS.map(([color, alpha, seed], i) => {
        const filter = `${uid}-ink-${i}`;
        return (
          <svg
            key={i}
            className={`ink-layer ink-layer-${i + 1}`}
            viewBox="0 0 400 400"
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            <defs>
              <filter id={filter} x="-30%" y="-30%" width="160%" height="160%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={0.011 + i * 0.004}
                  numOctaves={3}
                  seed={seed}
                  result="noise"
                />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale={90 + i * 20} />
                <feGaussianBlur stdDeviation={6 + i * 3} />
              </filter>
            </defs>
            <g filter={`url(#${filter})`} fill={color} opacity={alpha}>
              <ellipse cx={200 - i * 18} cy={210 + i * 10} rx={120 - i * 16} ry={92 - i * 10} />
              <ellipse cx={150 + i * 40} cy={150 + i * 22} rx={56} ry={74 - i * 8} />
              <ellipse cx={260 - i * 30} cy={270 - i * 16} rx={70} ry={44} />
            </g>
          </svg>
        );
      })}
    </div>
  );
}
