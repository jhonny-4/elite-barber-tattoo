"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { Icon } from "../icons";
import { Brand } from "../media";
import { HoverTilt } from "../motion/hover-tilt";
import { pad2, prefersReducedMotion } from "./shared";

type Work = {
  id: string;
  kind: "foto" | "video";
  title: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  url: string;
  posterUrl: string | null;
};

const SWIPE_PX = 56;
const FOCUSABLE = 'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';
const ratioOf = (w: Work) => (w.width && w.height ? w.width / w.height : w.kind === "video" ? 9 / 16 : 4 / 5);

/**
 * «Ver trabajos»: galería publicada de un barbero en un visor a pantalla completa (`<dialog>` modal).
 * Rejilla de tarjetas flotantes con la proporción completa de cada foto y, al elegir una, visor con
 * contador, flechas, teclado y deslizamiento. Los videos arrancan sin sonido y solo cargan metadatos.
 */
export function BarberWorks({ slug, name, onChoose }: { slug: string; name: string; onChoose?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const swipe = useRef<{ id: number; x: number; y: number; dx: number; axis: "x" | "y" | null } | null>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ items: Work[] | null; error: string }>({ items: null, error: "" });
  const [active, setActive] = useState<number | null>(null);
  const [dir, setDir] = useState<"next" | "prev" | "none">("none");

  const load = useCallback(async () => {
    setState({ items: null, error: "" });
    try {
      const response = await fetch(`/api/galeria?barbero=${encodeURIComponent(slug)}`);
      if (!response.ok) throw new Error("load");
      const data = (await response.json()) as { items: Work[] };
      setState({ items: data.items, error: "" });
    } catch {
      setState({ items: null, error: "No pudimos cargar los trabajos. Revisa tu conexión e inténtalo de nuevo." });
    }
  }, [slug]);

  function show() {
    setOpen(true);
    setActive(null);
    void load();
  }

  useEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    if (!node.open) node.showModal();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
      if (node.open) node.close();
    };
  }, [open]);

  // Al pasar de la rejilla al visor (o al revés) el botón enfocado desaparece: el foco vuelve al diálogo
  // para que flechas, Esc y Tab sigan funcionando.
  const inViewer = active !== null;
  useEffect(() => {
    if (open) dialog.current?.focus({ preventScroll: true });
  }, [inViewer, open]);

  const items = state.items ?? [];
  const total = items.length;
  const work = active !== null ? items[active] : null;

  const go = useCallback(
    (delta: 1 | -1) => {
      if (active === null || total < 2) return;
      setDir(delta > 0 ? "next" : "prev");
      setActive((active + delta + total) % total);
    },
    [active, total],
  );

  function close() {
    setOpen(false);
    setActive(null);
    trigger.current?.focus();
  }

  function back() {
    setActive(null);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDialogElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowRight" && work) {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft" && work) {
      event.preventDefault();
      go(-1);
    } else if (event.key === "Tab") {
      // Foco atrapado: Tab recorre solo lo visible del visor.
      const list = Array.from(dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((el) => el.getClientRects().length > 0);
      if (!list.length) return;
      const current = document.activeElement;
      if (event.shiftKey && (current === list[0] || current === dialog.current)) {
        event.preventDefault();
        list[list.length - 1].focus();
      } else if (!event.shiftKey && current === list[list.length - 1]) {
        event.preventDefault();
        list[0].focus();
      }
    }
  }

  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" || !event.isPrimary || total < 2) return;
    if ((event.target as HTMLElement).closest("video")) return; // los controles del video no deben deslizar
    swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, axis: null };
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const s = swipe.current;
    if (!s || s.id !== event.pointerId) return;
    const dx = event.clientX - s.x;
    const dy = event.clientY - s.y;
    if (!s.axis && Math.hypot(dx, dy) > 10) s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (s.axis === "x") s.dx = dx;
  }
  function up(event: ReactPointerEvent<HTMLDivElement>) {
    const s = swipe.current;
    if (!s || s.id !== event.pointerId) return;
    swipe.current = null;
    if (event.type === "pointerup" && s.axis === "x" && Math.abs(s.dx) >= SWIPE_PX) go(s.dx < 0 ? 1 : -1);
  }

  const frame = work
    ? ({ "--ar": ratioOf(work), "--cap": `${work.kind === "video" ? 560 : (work.width ?? 900)}px` } as CSSProperties)
    : undefined;

  return (
    <>
      <button ref={trigger} type="button" className="button button-outline button-small bk-works-button" onClick={show} aria-haspopup="dialog">
        <Icon name="image" />
        Ver trabajos
        <span className="visually-hidden"> de {name}</span>
      </button>
      {open ? (
        <dialog
          ref={dialog}
          className="lightbox works-dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            if (active !== null) back();
            else close();
          }}
          onKeyDown={onKeyDown}
        >
          <div className="lightbox-shell works-shell">
            <div className="lightbox-bar">
              <span className="lightbox-brand">
                <Brand title="" />
                <span id={titleId}>Trabajos de {name}</span>
              </span>
              <span className="works-bar-actions">
                {work ? (
                  <button type="button" className="button button-outline button-small" onClick={back}>
                    Ver todos
                  </button>
                ) : null}
                <button type="button" className="icon-button lightbox-close" aria-label="Cerrar visor" onClick={close} autoFocus>
                  <Icon name="close" />
                </button>
              </span>
            </div>

            {!work ? (
              <div className="works-body">
                {!state.items && !state.error ? <p className="loading-state" role="status">Cargando trabajos…</p> : null}
                {state.error ? (
                  <div className="works-empty" role="alert">
                    <p>{state.error}</p>
                    <button type="button" className="button button-small" onClick={() => void load()}>
                      Reintentar
                    </button>
                  </div>
                ) : null}
                {state.items && !total ? (
                  <div className="works-empty">
                    <span className="works-empty-icon" aria-hidden="true">
                      <Icon name="image" />
                    </span>
                    <h3>Pronto verás aquí sus cortes</h3>
                    <p>{name} aún no tiene trabajos publicados. Puedes reservar igual y ver su agenda.</p>
                  </div>
                ) : null}
                {total ? (
                  <header className="works-head">
                    <p className="eyebrow">Elite / Portafolio</p>
                    <h2>
                      {name}
                      <span className="serif"> en su silla.</span>
                    </h2>
                    <p className="works-count">
                      {total} {total === 1 ? "trabajo" : "trabajos"} · Toca uno para verlo en grande
                    </p>
                  </header>
                ) : null}
                {total ? (
                  <>
                  <ul className="works-grid" style={{ "--count": Math.min(total, 4) } as CSSProperties}>
                    <HoverTilt />
                    {items.map((item, i) => (
                      <li key={item.id} style={{ "--i": Math.min(i, 8) } as CSSProperties}>
                        <button type="button" className="works-card home-tilt" data-tilt="6" onClick={() => { setDir("none"); setActive(i); }} aria-label={`${item.kind === "video" ? "Video" : "Foto"} ${i + 1} de ${total}: ${item.title ?? item.alt}`}>
                          <span className="home-glare" aria-hidden="true" />
                          <span className="works-thumb" style={{ aspectRatio: ratioOf(item) }}>
                            {item.kind === "foto" || item.posterUrl ? (
                              <img src={item.kind === "foto" ? item.url : (item.posterUrl ?? "")} alt="" width={item.width ?? undefined} height={item.height ?? undefined} loading="lazy" decoding="async" />
                            ) : (
                              <span className="works-noposter" aria-hidden="true" />
                            )}
                            {item.kind === "video" ? (
                              <span className="works-play" aria-hidden="true">
                                <Icon name="play" />
                              </span>
                            ) : null}
                          </span>
                          <span className="works-caption">{item.title ?? item.alt}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="works-choose">
                    <button type="button" className="button button-accent" onClick={() => { close(); onChoose?.(); }}>
                      Elegir a {name}
                      <Icon name="arrow" />
                    </button>
                  </div>
                  </>
                ) : null}
              </div>
            ) : (
              <>
                <div className="lightbox-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
                  <button type="button" className="icon-button lightbox-nav lightbox-prev" aria-label="Trabajo anterior" onClick={() => go(-1)} disabled={total < 2}>
                    <Icon name="chevron" />
                  </button>
                  <div className="lightbox-figure">
                    <figure className="lightbox-frame works-frame" key={work.id} data-dir={dir} data-reduced={prefersReducedMotion() || undefined} style={frame}>
                      {work.kind === "video" ? (
                        <video className="works-media" controls playsInline muted preload="metadata" poster={work.posterUrl ?? undefined} src={work.url} aria-label={work.alt} />
                      ) : (
                        <img className="works-media" src={work.url} alt={work.alt} width={work.width ?? undefined} height={work.height ?? undefined} decoding="async" />
                      )}
                    </figure>
                  </div>
                  <p className="lightbox-count" aria-hidden="true">
                    <b>{pad2(active! + 1)}</b>
                    <span>/</span>
                    {pad2(total)}
                  </p>
                  <button type="button" className="icon-button lightbox-nav lightbox-next" aria-label="Trabajo siguiente" onClick={() => go(1)} disabled={total < 2}>
                    <Icon name="chevron" />
                  </button>
                </div>
                <div className="lightbox-info">
                  <h2>{work.title ?? work.alt}</h2>
                  {work.title ? <p className="lightbox-note">{work.alt}</p> : null}
                  <button type="button" className="button button-accent button-small" onClick={() => { close(); onChoose?.(); }}>
                    Elegir a {name}
                    <Icon name="arrow" />
                  </button>
                </div>
                <p className="visually-hidden" aria-live="polite" aria-atomic="true">{`Trabajo ${active! + 1} de ${total}: ${work.alt}`}</p>
              </>
            )}
          </div>
        </dialog>
      ) : null}
    </>
  );
}
