// Contratos del motor de esculturas 3D. Sin dependencias de Three.js: este archivo
// viaja en el paquete inicial y el motor (engine.ts) se carga bajo demanda.

/** Bisel de la extrusión, en unidades del viewBox del vector. */
export type SculptureBevel = {
  size: number;
  thickness: number;
  segments: number;
  /**
   * 1 = la silueta exterior coincide con el vector (el bisel se talla hacia dentro).
   * 0 = el bisel crece hacia fuera. Valores intermedios reparten la diferencia.
   */
  inset: number;
};

export type SculptureLayer = {
  /** Datos `d` del trazado SVG original (sin redibujar). */
  d: string;
  fillRule: "nonzero" | "evenodd";
  /** Profundidad de la extrusión, en unidades del viewBox. */
  depth: number;
  bevel: SculptureBevel;
  /** Puntos por curva al muestrear el trazado. */
  curveSegments: number;
  /** Ángulo (grados) por debajo del cual se suavizan las normales del bisel. */
  crease: number;
  /** "shape": cada forma es una pieza animable; "layer": la capa entera es una pieza. */
  pieces: "shape" | "layer";
};

export type SculptureMotion = {
  /** Pose de reposo en radianes. pitch > 0 muestra los cantos superiores. */
  rest: { pitch: number; yaw: number };
  /** Vaivén lento en reposo (radianes y periodo en segundos). */
  sway: { yaw: number; pitch: number; period: number };
  /** Flotación vertical como fracción de la altura del vector. */
  float: { amplitude: number; period: number };
  /** Inclinación máxima con puntero fino (radianes). */
  pointer: { yaw: number; pitch: number };
  /** Reacción al scroll del propio elemento; `recede` es fracción del ancho. */
  scroll: { yaw: number; pitch: number; recede: number } | null;
  /** Entrada: piezas desde la profundidad o elevación del conjunto. */
  intro:
    | { kind: "assemble"; duration: number; stagger: number }
    | { kind: "rise"; duration: number; yaw: number; recede: number };
  /** Periodo del barrido de la luz principal (s). */
  sweep: number;
};

export type SculptureSpec = {
  /** viewBox del vector original. */
  width: number;
  height: number;
  layers: SculptureLayer[];
  /** Fracción del ancho del lienzo que ocupa el vector en reposo. */
  fill: number;
  /** Extensión máxima permitida (NDC, 1 = borde) en cualquier pose animada. */
  limit: { x: number; y: number };
  /** Campo de visión vertical de la cámara (grados). */
  fov: number;
  exposure: number;
  /** Intensidad de la luz de borde roja (0 la apaga). */
  rim: number;
  motion: SculptureMotion;
};

export type SculptureStatus = "idle" | "loading" | "ready" | "failed";

export type SculptureCallbacks = {
  /** Primer fotograma dibujado: se puede retirar el respaldo. */
  onReady: () => void;
  /** WebGL no disponible o contexto perdido: se muestra el respaldo vectorial. */
  onFail: (reason: string) => void;
  /** El navegador devolvió el contexto: hay que reconstruir la escena. */
  onRestore: () => void;
};

export type SculptureHandle = {
  dispose: () => void;
};
