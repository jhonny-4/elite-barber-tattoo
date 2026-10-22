"use client";
// Monograma JC de Jean Carlos extruido con el mismo motor y material que el logo Elite.
// Uso: <ArtistMonogram /> ocupa el 100 % del ancho de su contenedor; el escenario
// reserva aspect-ratio 10/11 y debajo va la etiqueta (desactivable con label={false}).
// Se inicializa solo al acercarse al viewport (300 px).

import { JC_BOX, JC_PATHS, JC_SPEC } from "./three/presets";
import { DepthMark, SculptureStage } from "./three/sculpture-stage";
import { JCWordmark } from "./brand/logos";

export function ArtistMonogram({
  className = "",
  label = true,
}: {
  className?: string;
  /** Etiqueta «Jean Carlos · Tattoo artist · Elite» bajo el monograma. */
  label?: boolean;
}) {
  return (
    <figure className={`jc-sculpture ${className}`.trim()}>
      <SculptureStage
        spec={JC_SPEC}
        label="Monograma JC de Jean Carlos en 3D"
        className="jc-sculpture__stage"
        lazy
      >
        <DepthMark box={JC_BOX} paths={JC_PATHS} />
      </SculptureStage>
      {label ? (
        <figcaption className="jc-sculpture__label">
          {/* Firma original del artista bajo el monograma, como en su logo. */}
          <JCWordmark className="jc-wordmark" title="Jean Carlos" />
          <span className="visually-hidden">, </span>
          <span>Tattoo artist</span>
          <span className="jc-sculpture__sep" aria-hidden="true" />
          <span className="visually-hidden">, </span>
          <strong>Elite</strong>
        </figcaption>
      ) : null}
    </figure>
  );
}
