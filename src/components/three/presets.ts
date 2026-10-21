// Configuración de las dos esculturas: vector, extrusión, encuadre y movimiento.
// Sin React ni Three.js: los componentes la pasan al motor.

import { eliteLogo, jcMonogram } from "../brand/logo-data";
import type { SculptureSpec } from "./types";

/** Caja real del logo Elite dentro de su viewBox 358 × 197 (medida sobre el vector). */
export const ELITE_BOX = [3.5, 3.27, 351, 189.69] as const;

/** Caja real del monograma JC dentro de su viewBox 1122 × 1249. */
export const JC_BOX = [6.8, 6.22, 1107.6, 1235.22] as const;

export const ELITE_SPEC: SculptureSpec = {
  width: eliteLogo.width,
  height: eliteLogo.height,
  layers: [
    {
      // E·L·I·T·E y las dos barras: más fondo, bisel redondeado que atrapa la luz.
      d: eliteLogo.geo,
      fillRule: "nonzero",
      depth: 20,
      bevel: { size: 1.3, thickness: 1.6, segments: 4, inset: 1 },
      curveSegments: 1,
      crease: 35,
      pieces: "shape",
    },
    {
      // BARBER y TATTOO: relieve fino; cada letra entra por separado.
      d: eliteLogo.serif,
      fillRule: "evenodd",
      depth: 5,
      bevel: { size: 0.28, thickness: 0.42, segments: 2, inset: 1 },
      curveSegments: 5,
      crease: 50,
      pieces: "shape",
    },
  ],
  // Con estos márgenes de movimiento ocupa el 85 % del ancho tanto en 4/3 como en 16/9.
  fill: 0.85,
  limit: { x: 0.965, y: 0.95 },
  fov: 22,
  exposure: 1.05,
  rim: 2.6,
  motion: {
    rest: { pitch: 0.1, yaw: 0 },
    sway: { yaw: 0.085, pitch: 0.025, period: 13 },
    float: { amplitude: 0.016, period: 6.5 },
    pointer: { yaw: 0.17, pitch: 0.1 },
    scroll: { yaw: 0.3, pitch: -0.4, recede: 0.38 },
    intro: { kind: "assemble", duration: 1.25, stagger: 0.075 },
    sweep: 12,
  },
};

export const JC_SPEC: SculptureSpec = {
  width: jcMonogram.width,
  height: jcMonogram.height,
  layers: [
    {
      d: jcMonogram.d,
      fillRule: "evenodd",
      depth: 56,
      bevel: { size: 3, thickness: 5, segments: 3, inset: 1 },
      curveSegments: 7,
      crease: 40,
      pieces: "layer",
    },
  ],
  fill: 0.76,
  limit: { x: 0.95, y: 0.95 },
  fov: 26,
  exposure: 1.05,
  rim: 2.4,
  motion: {
    rest: { pitch: 0.06, yaw: 0 },
    // Giro muy lento de ida y vuelta: nunca muestra el dorso ni el canto.
    sway: { yaw: 0.4, pitch: 0.04, period: 17 },
    float: { amplitude: 0.012, period: 7.5 },
    pointer: { yaw: 0.2, pitch: 0.12 },
    scroll: null,
    intro: { kind: "rise", duration: 2.2, yaw: -0.7, recede: 0.35 },
    sweep: 14,
  },
};

/** Trazados para el respaldo vectorial (mismo dibujo que el 3D). */
export const ELITE_PATHS = [
  { d: eliteLogo.geo },
  { d: eliteLogo.serif, fillRule: "evenodd" as const },
];

export const JC_PATHS = [{ d: jcMonogram.d, fillRule: "evenodd" as const }];
