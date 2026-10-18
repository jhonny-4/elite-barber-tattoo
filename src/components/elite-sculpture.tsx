"use client";
// Logo Elite extruido en 3D real a partir del vector original (src/components/brand).
// Uso: <EliteSculpture /> ocupa el 100 % del ancho de su contenedor y reserva su alto
// con aspect-ratio (4/3 por debajo de 768 px de viewport, 16/9 desde 768 px).
// Configuración (extrusión, encuadre, movimiento): src/components/three/presets.ts.

import { ELITE_BOX, ELITE_PATHS, ELITE_SPEC } from "./three/presets";
import { DepthMark, SculptureStage } from "./three/sculpture-stage";

export function EliteSculpture({ className = "" }: { className?: string }) {
  return (
    <SculptureStage
      spec={ELITE_SPEC}
      label="Logo Elite Barber & Tattoo en 3D"
      className={`elite-sculpture ${className}`.trim()}
    >
      <DepthMark box={ELITE_BOX} paths={ELITE_PATHS} />
    </SculptureStage>
  );
}
