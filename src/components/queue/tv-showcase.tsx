"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../icons";
import { Brand } from "../media";
import { instagramHandle } from "../../domain/business";

export type ShowcaseMedia = {
  id: string;
  kind: "foto" | "video";
  title: string | null;
  alt: string;
  url: string;
  posterUrl: string | null;
};
export type ShowcaseService = { name: string; price_cop: number; duration_min: number };
type Slide =
  | { type: "media"; key: string; item: ShowcaseMedia }
  | { type: "prices"; key: string }
  | { type: "instagram"; key: string };

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const FADE_MS = 1600;
const duration = (slide: Slide) =>
  slide.type === "media" ? (slide.item.kind === "video" ? 14000 : 9000) : slide.type === "prices" ? 12000 : 9000;

/** Modo vitrina: trabajos, precios e Instagram en pantalla completa con fundidos lentos. */
export function TvShowcase({ services, onExit, demo }: { services: ShowcaseService[]; onExit: () => void; demo: boolean }) {
  const [media, setMedia] = useState<ShowcaseMedia[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/galeria", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setMedia(Array.isArray(data.items) ? (data.items as ShowcaseMedia[]).filter((m) => m.url) : []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const slides = useMemo<Slide[]>(() => {
    const list: Slide[] = media.slice(0, 16).map((item) => ({ type: "media", key: item.id, item }));
    // Precios e Instagram se intercalan para que no queden todos al final.
    list.splice(Math.min(4, list.length), 0, { type: "prices", key: "prices" });
    list.splice(Math.min(9, list.length), 0, { type: "instagram", key: "instagram" });
    return list;
  }, [media]);

  const [step, setStep] = useState(0);
  const [prevStep, setPrevStep] = useState<number | null>(null);
  const current = slides[step % slides.length];
  useEffect(() => {
    const timer = setTimeout(
      () => {
        setPrevStep(step);
        setStep((s) => s + 1);
      },
      demo ? 3500 : duration(current),
    );
    return () => clearTimeout(timer);
  }, [step, current, demo]);
  useEffect(() => {
    if (prevStep === null) return;
    const timer = setTimeout(() => setPrevStep(null), FADE_MS);
    return () => clearTimeout(timer);
  }, [prevStep]);

  const layers = [prevStep !== null ? { n: prevStep, leaving: true } : null, { n: step, leaving: false }].filter(
    (l): l is { n: number; leaving: boolean } => l !== null,
  );
  return (
    <div className="tv-showcase" role="presentation" onClick={onExit}>
      {layers.map(({ n, leaving }) => (
        <SlideView key={n} slide={slides[n % slides.length]} leaving={leaving} index={n} services={services} />
      ))}
      <div className="tv-showcase-brand" aria-hidden="true">
        <Brand className="tv-logo" title="" />
      </div>
    </div>
  );
}

function SlideView({ slide, leaving, index, services }: { slide: Slide; leaving: boolean; index: number; services: ShowcaseService[] }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    // Autoplay silenciado; si el navegador lo frena, el póster queda visible.
    void video.current?.play().catch(() => {});
  }, []);
  const origin = ["50% 40%", "30% 60%", "70% 50%", "50% 70%"][index % 4];
  const backdrop = slide.type === "media" ? (slide.item.kind === "video" ? slide.item.posterUrl : slide.item.url) : null;
  return (
    <section className={`tv-slide${leaving ? " is-leaving" : ""}`} data-type={slide.type}>
      {slide.type === "media" && (
        <>
          {/* Fondo desenfocado: la pieza se ve completa, sin recortes. */}
          {backdrop && <img className="tv-slide-backdrop" src={backdrop} alt="" aria-hidden="true" />}
          <div className="tv-kenburns" style={{ transformOrigin: origin }}>
            {slide.item.kind === "video" ? (
              <video
                ref={video}
                className="tv-slide-media"
                src={slide.item.url}
                poster={slide.item.posterUrl ?? undefined}
                muted
                autoPlay
                loop
                playsInline
                preload="auto"
                aria-label={slide.item.alt}
              />
            ) : (
              <img className="tv-slide-media" src={slide.item.url} alt={slide.item.alt} />
            )}
          </div>
          <p className="tv-slide-caption">
            <small>Trabajos reales · Elite Barber &amp; Tattoo</small>
            {slide.item.title && <b>{slide.item.title}</b>}
          </p>
        </>
      )}
      {slide.type === "prices" && (
        <div className="tv-prices">
          <p className="tv-kicker">Servicios y precios</p>
          <ul>
            {services.map((s) => (
              <li key={s.name}>
                <span>
                  {s.name}
                  <small>{s.duration_min} min</small>
                </span>
                <strong>{cop.format(s.price_cop)}</strong>
              </li>
            ))}
          </ul>
          <p className="tv-prices-note">Pago en el local · Tatuajes con evaluación previa</p>
        </div>
      )}
      {slide.type === "instagram" && (
        <div className="tv-instagram">
          <Icon name="instagram" aria-hidden="true" />
          <p className="tv-kicker">Síguenos</p>
          <strong>{instagramHandle}</strong>
          <span>Cortes, barbas y tatuajes del local, cada día</span>
        </div>
      )}
    </section>
  );
}
