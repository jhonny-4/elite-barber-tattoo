// Browser SVG viewboxes frame the original screenshots without inventing image detail.
export type PortfolioItem = {
  id: string;
  category: "barberia" | "tattoo";
  title: string;
  subtitle: string;
  source: string;
  sourceWidth: number;
  sourceHeight: number;
  crop: [number, number, number, number];
  original?: string;
  position?: string;
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
export const portfolio: PortfolioItem[] = [
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
    crop: [239, 285, 230, 260],
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
    crop: [2, 898, 230, 278],
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
