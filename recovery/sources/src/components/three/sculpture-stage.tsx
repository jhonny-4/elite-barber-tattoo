"use client";
// Escenario compartido: respaldo vectorial con profundidad + lienzo WebGL encima.
// El respaldo se ve en el HTML del servidor, mientras carga Three.js y si WebGL falla.

import { useId, type CSSProperties, type ReactNode } from "react";
import type { SculptureSpec } from "./types";
import { useSculpture } from "./use-sculpture";

type MarkPath = { d: string; fillRule?: "nonzero" | "evenodd" };

/** Tono de cada capa: grafito que se apaga hacia el fondo y un filo rojo profundo. */
function layerFill(depth: number, layers: number) {
  if (depth === layers) return "#6e0a12"; // --red-700: eco de la luz de borde roja
  const t = (depth - 1) / Math.max(1, layers - 2);
  const v = Math.round(108 - t * 84);
  return `rgb(${v} ${v} ${Math.max(0, v - 3)})`;
}

/**
 * El vector original apilado en capas desplazadas (profundidad CSS) con una cara
 * blanca metálica. El trazado se declara una sola vez y las capas son `<use>`.
 */
export function DepthMark({
  box,
  paths,
  layers = 6,
}: {
  /** Caja del vector (x, y, ancho, alto) para encuadrarlo igual que el 3D. */
  box: readonly [number, number, number, number];
  paths: readonly MarkPath[];
  layers?: number;
}) {
  const uid = useId().replace(/[^\w-]/g, "");
  const glyph = `${uid}-glyph`;
  const face = `${uid}-face`;
  return (
    <svg
      className="sculpture__mark"
      viewBox={box.join(" ")}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <g id={glyph}>
          {paths.map((path, index) => (
            <path key={index} d={path.d} fillRule={path.fillRule} />
          ))}
        </g>
        <linearGradient id={face} x1="0" y1="0" x2="0.18" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.44" stopColor="#efeee9" />
          <stop offset="0.53" stopColor="#c9c8c3" />
          <stop offset="0.62" stopColor="#f2f1ec" />
          <stop offset="1" stopColor="#fafaf8" />
        </linearGradient>
      </defs>
      {Array.from({ length: layers }, (_, i) => layers - i).map((depth) => (
        <use
          key={depth}
          href={`#${glyph}`}
          className="sculpture__layer"
          fill={layerFill(depth, layers)}
          style={{ "--depth": depth } as CSSProperties}
        />
      ))}
      <use href={`#${glyph}`} className="sculpture__face" fill={`url(#${face})`} />
    </svg>
  );
}

export function SculptureStage({
  spec,
  label,
  className,
  lazy = false,
  children,
}: {
  spec: SculptureSpec;
  /** Nombre accesible del conjunto (role="img"). */
  label: string;
  className: string;
  /** Inicializar solo cerca del viewport (rootMargin 300px). */
  lazy?: boolean;
  /** Respaldo visible mientras carga o sin WebGL. */
  children: ReactNode;
}) {
  const { hostRef, status } = useSculpture(spec, { lazy });
  return (
    <div
      className={`sculpture ${className}`}
      data-state={status}
      role="img"
      aria-label={label}
      style={{ "--sculpture-fill": `${spec.fill * 100}%` } as CSSProperties}
    >
      <div className="sculpture__fallback" aria-hidden="true">
        {children}
      </div>
      <div className="sculpture__canvas" ref={hostRef} aria-hidden="true" />
    </div>
  );
}
