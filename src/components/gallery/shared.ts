import type { PortfolioItem } from "../../domain/media";

export type GalleryFilter = "todos" | "barberia" | "tattoo";

/**
 * Ampliación máxima de las capturas (recortes por `viewBox` de imágenes pequeñas):
 * más allá de ~1,6× su tamaño natural se degradan visiblemente.
 */
export const CAPTURE_MAX_SCALE = 1.6;

/** Las imágenes sin `original` son recortes de capturas de pantalla. */
export const isCapture = (item: PortfolioItem) => !item.original;

/** Proporción completa de la foto (ancho / alto) para no recortarla nunca. */
export const aspectOf = (item: PortfolioItem) => item.crop[2] / item.crop[3];

/** Ancho máximo en px al que puede mostrarse sin degradarse. */
export const maxWidthOf = (item: PortfolioItem) =>
  Math.round(item.crop[2] * (isCapture(item) ? CAPTURE_MAX_SCALE : 1));

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const pad2 = (n: number) => String(n).padStart(2, "0");
