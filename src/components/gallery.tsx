"use client";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { portfolio } from "../domain/media";
import {
  artistInstagramHandle,
  artistInstagramUrl,
  instagramHandle,
  instagramUrl,
} from "../domain/business";
import { Photo, SectionBrand } from "./media";
import { BrandGlyph, JCMonogram } from "./brand/logos";
import { Icon } from "./icons";
import { Lightbox } from "./gallery/lightbox";
import {
  aspectOf,
  isCapture,
  prefersReducedMotion,
  type GalleryFilter,
} from "./gallery/shared";

export type { GalleryFilter } from "./gallery/shared";

const filters: { id: GalleryFilter; label: string; noun: string }[] = [
  { id: "todos", label: "Todo", noun: "trabajos" },
  { id: "barberia", label: "Barbería", noun: "cortes" },
  { id: "tattoo", label: "Tatuajes", noun: "tatuajes" },
];

const countOf = (id: GalleryFilter) =>
  id === "todos"
    ? portfolio.length
    : portfolio.filter((item) => item.category === id).length;

/** «Jean Carlos · Tatuaje» → ["Jean Carlos", "Tatuaje"]: en tarjetas estrechas solo se ve el tipo. */
const splitSubtitle = (subtitle: string) => {
  const parts = subtitle.split(" · ");
  return parts.length > 1
    ? [parts.slice(0, -1).join(" · "), parts[parts.length - 1]]
    : ["", subtitle];
};

/** Ancho visible estimado de cada tarjeta para elegir la variante del srcSet. */
const CARD_SIZES =
  "(max-width: 599px) 56vw, (max-width: 1100px) 40vw, 560px";
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * Galería filtrable con tarjetas flotantes ajustadas a la proporción completa de
 * cada foto y visor accesible. Sin props funciona como la galería de la portada
 * (sección `#galeria`); con `tattooOnly` muestra solo el portafolio de Jean Carlos.
 */
export function Gallery({
  tattooOnly = false,
  initialFilter = "todos",
  id = "galeria",
  eyebrow,
}: {
  /** Solo tatuajes, sin filtros y con los textos del portafolio de Jean Carlos. */
  tattooOnly?: boolean;
  /** Filtro activo al cargar (ignorado con `tattooOnly`). */
  initialFilter?: GalleryFilter;
  /** id de la sección, para anclas. */
  id?: string;
  /** Sustituye la etiqueta superior (p. ej. para la numeración de la portada). */
  eyebrow?: string;
} = {}) {
  const [filter, setFilter] = useState<GalleryFilter>(
    tattooOnly ? "tattoo" : initialFilter,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [angles, setAngles] = useState<Record<string, number>>({});
  const [announcement, setAnnouncement] = useState("");
  const gridRef = useRef<HTMLUListElement>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const flipFrom = useRef<Map<string, DOMRect> | null>(null);
  const tiltEnabled = useRef(false);
  const headingId = useId();

  const items = useMemo(
    () =>
      portfolio.filter(
        (item) => filter === "todos" || item.category === filter,
      ),
    [filter],
  );

  // Inclinación y luz solo con puntero fino y sin movimiento reducido.
  useEffect(() => {
    const query = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    const update = () => {
      tiltEnabled.current = query.matches;
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Revelado al entrar: solo se ocultan las tarjetas que aún están fuera de pantalla.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || prefersReducedMotion() || !("IntersectionObserver" in window))
      return;
    const pending = Array.from(
      grid.querySelectorAll<HTMLElement>(".gallery-item:not([data-in])"),
    ).filter((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.94) {
        el.setAttribute("data-in", "");
        return false;
      }
      return true;
    });
    if (!pending.length) return;
    grid.setAttribute("data-armed", "");
    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry, order) => {
            const el = entry.target as HTMLElement;
            el.style.setProperty("--reveal-delay", `${order * 90}ms`);
            el.setAttribute("data-in", "");
            observer.unobserve(el);
          });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.12 },
    );
    pending.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filter]);

  // Al filtrar: las tarjetas que siguen se deslizan a su sitio (FLIP) y las nuevas aparecen.
  useLayoutEffect(() => {
    const from = flipFrom.current;
    const grid = gridRef.current;
    flipFrom.current = null;
    if (!from || !grid) return;
    let entering = 0;
    grid.querySelectorAll<HTMLElement>(".gallery-item").forEach((el) => {
      el.setAttribute("data-in", "");
      el.style.removeProperty("--reveal-delay");
      const before = from.get(el.dataset.id ?? "");
      const now = el.getBoundingClientRect();
      if (!before) {
        el.animate(
          [
            { opacity: 0, transform: "translate3d(0, 28px, 0) scale(0.96)" },
            { opacity: 1, transform: "none" },
          ],
          {
            duration: 560,
            delay: 120 + entering++ * 70,
            easing: EASE_OUT,
            fill: "backwards",
          },
        );
        return;
      }
      const dx = before.left - now.left;
      const dy = before.top - now.top;
      const sx = before.width / now.width;
      const sy = before.height / now.height;
      if (
        Math.abs(dx) < 1 &&
        Math.abs(dy) < 1 &&
        Math.abs(sx - 1) < 0.01 &&
        Math.abs(sy - 1) < 0.01
      )
        return;
      el.animate(
        [
          {
            transformOrigin: "0 0",
            transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
          },
          { transformOrigin: "0 0", transform: "none" },
        ],
        { duration: 640, easing: EASE_OUT },
      );
    });
  }, [filter]);

  function choose(next: GalleryFilter) {
    if (next === filter) return;
    const grid = gridRef.current;
    if (grid && !prefersReducedMotion()) {
      const rects = new Map<string, DOMRect>();
      grid
        .querySelectorAll<HTMLElement>(".gallery-item")
        .forEach((el) => rects.set(el.dataset.id ?? "", el.getBoundingClientRect()));
      flipFrom.current = rects;
    }
    const option = filters.find((f) => f.id === next);
    setAnnouncement(
      `Mostrando ${countOf(next)} ${next === "todos" ? "trabajos" : option?.noun}.`,
    );
    setFilter(next);
  }

  function tilt(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!tiltEnabled.current || event.pointerType !== "mouse") return;
    const card = event.currentTarget;
    const box = card.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    card.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    card.style.setProperty("--ry", `${((x - 0.5) * 7).toFixed(2)}deg`);
    card.style.setProperty("--rx", `${((0.5 - y) * 6).toFixed(2)}deg`);
  }

  function untilt(event: ReactPointerEvent<HTMLButtonElement>) {
    const card = event.currentTarget;
    for (const property of ["--mx", "--my", "--rx", "--ry"])
      card.style.removeProperty(property);
  }

  return (
    <section
      className="section gallery-section"
      id={id}
      aria-labelledby={headingId}
      data-variant={tattooOnly ? "artist" : "home"}
    >
      {/* En la portada anima la coreografía GSAP (data-anim); en /jean-carlos, <Reveal />. */}
      <header
        className="section-heading gallery-heading"
        data-anim="heading"
        data-reveal={tattooOnly ? "" : undefined}
      >
        {tattooOnly ? (
          <JCMonogram
            className="gallery-signature"
            title="Monograma JC de Jean Carlos"
          />
        ) : (
          <SectionBrand />
        )}
        <p className="eyebrow">
          {eyebrow ??
            (tattooOnly
              ? `Portafolio · ${artistInstagramHandle}`
              : "El trabajo de Elite")}
        </p>
        <h2 id={headingId} data-split>
          {tattooOnly ? (
            <>
              El trazo
              <br />
              <span className="serif">
                de Jean Carlos<span className="dot">.</span>
              </span>
            </>
          ) : (
            <>
              Una galería<span className="dot">.</span>
              <br />
              <span className="serif">Muchas identidades.</span>
            </>
          )}
        </h2>
        <p className="section-note">
          {tattooOnly
            ? "Una selección de su trabajo en piel. Son capturas de referencia de su perfil de Instagram mientras llegan las fotografías originales."
            : "Cortes del local y tatuajes de Jean Carlos, siempre con la foto completa. Los tatuajes son capturas de referencia mientras llegan las fotografías originales."}
        </p>
      </header>

      {tattooOnly ? (
        <p className="gallery-meta">
          <Icon name="needle" />
          {items.length} piezas · toca una para verla en grande
        </p>
      ) : (
        <div
          className="gallery-filters"
          role="group"
          aria-label="Filtrar trabajos"
        >
          {filters.map((option) => (
            <button
              key={option.id}
              type="button"
              className="chip gallery-chip"
              aria-pressed={filter === option.id}
              onClick={() => choose(option.id)}
            >
              {option.label}
              <span className="gallery-chip-count" aria-hidden="true">
                {countOf(option.id)}
              </span>
              <span className="visually-hidden">
                {` (${countOf(option.id)})`}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>

      <ul
        ref={gridRef}
        className="gallery-grid"
        role="list"
        data-filter={filter}
        aria-label={tattooOnly ? "Tatuajes de Jean Carlos" : "Trabajos de Elite"}
      >
        {items.map((item) => {
          const shots = [item, ...(item.views ?? [])];
          const angle = angles[item.id] ?? 0;
          const photo = shots[angle] ?? item;
          const capture = isCapture(item);
          const [author, kind] = splitSubtitle(item.subtitle);
          return (
            <li
              key={item.id}
              className="gallery-item"
              data-id={item.id}
              style={
                {
                  "--ar": aspectOf(photo).toFixed(4),
                  // ×10 para que la suma de factores de una fila nunca baje de 1.
                  "--grow": (aspectOf(item) * 10).toFixed(3),
                } as CSSProperties
              }
            >
              <button
                type="button"
                className="gallery-card"
                ref={(node) => {
                  if (node) cards.current.set(item.id, node);
                  else cards.current.delete(item.id);
                }}
                aria-haspopup="dialog"
                aria-label={`Ver en grande: ${item.title} · ${item.subtitle}${capture ? " · Captura de referencia" : ""}`}
                onClick={() => setActiveId(item.id)}
                onPointerMove={tilt}
                onPointerLeave={untilt}
              >
                <span className="gallery-frame">
                  <Photo item={photo} fit="contain" sizes={CARD_SIZES} />
                  {shots.length > 1 && <span className="gallery-angle-badge">{angle + 1} / {shots.length} fotos</span>}
                  {capture && (
                    <span className="gallery-tag">Captura de referencia</span>
                  )}
                  <span className="gallery-zoom" aria-hidden="true">
                    <Icon name="expand" />
                  </span>
                </span>
                <span className="gallery-caption">
                  <span className="gallery-kind">
                    {author && (
                      <span className="gallery-kind-author">{`${author} · `}</span>
                    )}
                    {kind}
                  </span>
                  <span className="gallery-title">{item.title}</span>
                  {capture && (
                    <span className="gallery-tag-inline">
                      Captura de referencia
                    </span>
                  )}
                </span>
              </button>
              {shots.length > 1 && (
                <div className="gallery-angle-controls" role="group" aria-label={`Ángulos de ${item.title}`}>
                  <button type="button" className="icon-button" aria-label={`Foto anterior de ${item.title}`} onClick={() => setAngles((previous) => ({ ...previous, [item.id]: (angle - 1 + shots.length) % shots.length }))}><Icon name="chevron" /></button>
                  <span aria-live="polite">Foto {angle + 1} de {shots.length}</span>
                  <button type="button" className="icon-button" aria-label={`Foto siguiente de ${item.title}`} onClick={() => setAngles((previous) => ({ ...previous, [item.id]: (angle + 1) % shots.length }))}><Icon name="chevron" /></button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div
        className="gallery-foot"
        data-anim="rise"
        data-reveal={tattooOnly ? "" : undefined}
      >
        <p>
          {tattooOnly
            ? "El portafolio completo de Jean Carlos vive en su Instagram."
            : "Más cortes y tatuajes en el Instagram de Elite."}
        </p>
        <div className="button-row stack-mobile">
          <a
            className="button button-instagram"
            href={tattooOnly ? artistInstagramUrl : instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="button-glyph">
              <BrandGlyph name="instagram" />
            </span>
            <span className="button-label">
              Instagram
              <small>{tattooOnly ? artistInstagramHandle : instagramHandle}</small>
            </span>
            <span className="visually-hidden"> (abre otra pestaña)</span>
          </a>
          {!tattooOnly && (
            <Link className="button button-outline" href="/jean-carlos">
              Portafolio de Jean Carlos <Icon name="arrow" />
            </Link>
          )}
        </div>
      </div>

      <Lightbox
        items={items}
        activeId={activeId}
        initialAngle={activeId ? angles[activeId] ?? 0 : 0}
        onNavigate={setActiveId}
        onClosed={(lastId) => {
          setActiveId(null);
          // Devuelve el foco a la tarjeta de la última imagen vista.
          cards.current.get(lastId)?.focus();
        }}
      />
    </section>
  );
}
