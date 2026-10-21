// Browser SVG viewboxes frame the original screenshots without inventing image detail.
import additionalPortfolio from "./portfolio-extra.json";

export type PortfolioItem = {
  id: string;
  category: "barberia" | "tattoo";
  title: string;
  subtitle: string;
  description?: string;
  source: string;
  sourceWidth: number;
  sourceHeight: number;
  crop: [number, number, number, number];
  original?: string;
  /** Variantes responsivas del original (`src 720w, src 1290w`). */
  srcSet?: string;
  position?: string;
  /** Additional angles of the same tattoo, grouped under one gallery card. */
  views?: PortfolioItem[];
  videos?: string[];
  capture?: boolean;
};
const tattoo = {
  source: "/media/reference/tattoo-source.jpeg",
  sourceWidth: 709,
  sourceHeight: 1536,
};
const barber = {
  source: "/media/reference/barber-source.jpeg",
  sourceWidth: 709,
  sourceHeight: 1536,
};
const legacyPortfolio: PortfolioItem[] = [
  ...(additionalPortfolio as PortfolioItem[]),
  {
    id: "tattoo-01",
    category: "tattoo",
    title: "Trazos que cuentan",
    subtitle: "Jean Carlos · Tatuaje",
    ...tattoo,
    crop: [2, 534, 231, 312],
  },
  {
    id: "barber-01",
    category: "barberia",
    title: "La precisión del detalle",
    subtitle: "Elite · Barbería",
    ...barber,
    crop: [0, 0, 1290, 1514],
    original: "/media/barber/barber-precision-1290.webp",
    srcSet:
      "/media/barber/barber-precision-720.webp 720w, /media/barber/barber-precision-1290.webp 1290w",
  },
  {
    id: "tattoo-02",
    category: "tattoo",
    title: "Carácter en la piel",
    subtitle: "Jean Carlos · Tatuaje",
    ...tattoo,
    crop: [237, 1164, 234, 313],
  },
  {
    id: "barber-02",
    category: "barberia",
    title: "Textura & forma",
    subtitle: "Elite · Barbería",
    ...barber,
    crop: [0, 0, 1290, 1165],
    original: "/media/barber/barber-texture-1290.webp",
    srcSet:
      "/media/barber/barber-texture-720.webp 720w, /media/barber/barber-texture-1290.webp 1290w",
  },
  {
    id: "tattoo-03",
    category: "tattoo",
    title: "Cada línea, una intención",
    subtitle: "Jean Carlos · Tatuaje",
    ...tattoo,
    crop: [237, 848, 234, 315],
  },
  {
    id: "tattoo-04",
    category: "tattoo",
    title: "Arte con identidad",
    subtitle: "Jean Carlos · Tatuaje",
    ...tattoo,
    crop: [474, 1164, 234, 313],
  },
];
export const portfolio = legacyPortfolio.filter(item => item.category === "barberia" || item.id.startsWith("portfolio-"));
