import type { PortfolioItem } from "./media";

export type PublishedWork = {
  id: string;
  kind: "foto" | "video";
  title: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  url: string;
  posterUrl: string | null;
  barberName: string;
};

/** El catálogo público comparte las mismas publicaciones que el panel y la reserva. */
export function publishedPortfolio(works: PublishedWork[]): PortfolioItem[] {
  return works.flatMap((work) => {
    const source = work.kind === "video" ? work.posterUrl : work.url;
    if (!source || !work.barberName) return [];
    const width = work.width ?? 900;
    const height = work.height ?? 1200;
    return [{
      id: `published-${work.id}`,
      category: "barberia" as const,
      title: work.title || work.alt,
      subtitle: `${work.barberName} · ${work.kind === "video" ? "Video" : "Barbería"}`,
      description: work.alt,
      source,
      original: source,
      sourceWidth: width,
      sourceHeight: height,
      crop: [0, 0, width, height] as [number, number, number, number],
      capture: false,
      ...(work.kind === "video" ? { videos: [work.url] } : {}),
    }];
  });
}
