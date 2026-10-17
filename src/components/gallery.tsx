"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { portfolio, type PortfolioItem } from "../domain/media";
import { Photo, SectionBrand } from "./media";
import { Icon } from "./icons";
export function Gallery({ tattooOnly = false }: { tattooOnly?: boolean }) {
  const [filter, setFilter] = useState(tattooOnly ? "tattoo" : "todos"),
    [active, setActive] = useState<PortfolioItem | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const items = portfolio.filter(
    (i) => filter === "todos" || i.category === filter,
  );
  useEffect(() => {
    if (active && !dialog.current?.open) dialog.current?.showModal();
  }, [active]);
  function move(direction: number) {
    if (!active) return;
    const index = items.findIndex((i) => i.id === active.id);
    setActive(items[(index + direction + items.length) % items.length]);
  }
  return (
    <section className="section gallery-section" id="galeria">
      <div className="section-heading" data-reveal>
        <div>
          <p className="eyebrow">03 / EL TRABAJO DE ELITE</p>
          <h2>
            Una galería.
            <br />
            <span className="serif">Muchas identidades.</span>
          </h2>
        </div>
        <div>
          <SectionBrand />
          <p className="section-note">
            {tattooOnly
              ? "Selección de tatuajes de Jean Carlos."
              : "Cortes y tatuajes del negocio."}
            <br />
            Capturas provisionales para esta demo.
          </p>
        </div>
      </div>
      <div
        className="gallery-filter"
        role="group"
        aria-label="Filtrar portafolio"
      >
        {(tattooOnly
          ? [["tattoo", "Tatuajes"]]
          : [
              ["todos", "Todo el trabajo"],
              ["barberia", "Barbería"],
              ["tattoo", "Tatuajes"],
            ]
        ).map(([id, label]) => (
          <button
            className={filter === id ? "active" : ""}
            key={id}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
            <span>
              {id === "todos"
                ? portfolio.length
                : portfolio.filter((i) => i.category === id).length}
            </span>
          </button>
        ))}
      </div>
      <div className={`gallery-grid filter-${filter}`}>
        {items.map((item, i) => (
          <button
            className={`gallery-card floating-work card-${i}`}
            style={{ animationDelay: `${i * -1.3}s` }}
            key={item.id}
            onClick={() => setActive(item)}
            aria-label={`Ampliar ${item.title}`}
          >
            <div className="gallery-image">
              <Photo item={item} fit="contain" />
              <span className="image-expand">
                <Icon name="plus" />
              </span>
              <span className="image-tag">
                {item.category === "tattoo"
                  ? "ELITE / TATTOO"
                  : "ELITE / BARBER"}
              </span>
            </div>
            <div className="gallery-card-caption">
              <div>
                <h3>{item.title}</h3>
                <span>{item.subtitle}</span>
              </div>
              <span className="gallery-order">
                /{String(i + 1).padStart(2, "0")}
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="gallery-bottom">
        <span>
          El trabajo real es el protagonista. Fotografías originales pendientes.
        </span>
        <Link className="text-link" href="/tatuaje">
          Hablemos de tu idea <Icon name="arrow" />
        </Link>
      </div>
      <dialog
        ref={dialog}
        className="lightbox"
        aria-labelledby="lightbox-title"
        onClose={() => setActive(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") move(1);
          if (e.key === "ArrowLeft") move(-1);
        }}
      >
        {active && (
          <div className="lightbox-inner">
            <button
              className="icon-button lightbox-close"
              aria-label="Cerrar imagen"
              onClick={() => dialog.current?.close()}
            >
              <Icon name="close" />
            </button>
            <div className="lightbox-photo">
              <Photo item={active} fit="contain" />
            </div>
            <div className="lightbox-info">
              <p className="eyebrow">{active.subtitle}</p>
              <h2 id="lightbox-title">{active.title}</h2>
              <p>
                Captura de referencia. La resolución y el encuadre se
                actualizarán con la fotografía original.
              </p>
              <div className="lightbox-controls">
                <button
                  className="icon-button"
                  aria-label="Imagen anterior"
                  onClick={() => move(-1)}
                >
                  <Icon
                    name="chevron"
                    style={{ transform: "rotate(180deg)" }}
                  />
                </button>
                <span>
                  {items.findIndex((i) => i.id === active.id) + 1} /{" "}
                  {items.length}
                </span>
                <button
                  className="icon-button"
                  aria-label="Imagen siguiente"
                  onClick={() => move(1)}
                >
                  <Icon name="chevron" />
                </button>
              </div>
              <Link
                className="button button-outline"
                href={active.category === "tattoo" ? "/tatuaje" : "/reservar"}
              >
                {active.category === "tattoo"
                  ? "Proponer un tatuaje"
                  : "Reservar un corte"}
                <Icon name="arrow" />
              </Link>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
