"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import type { PortfolioItem } from "../../domain/media";
import { Brand, Photo } from "../media";
import { Icon } from "../icons";
import { aspectOf, maxWidthOf, pad2, prefersReducedMotion } from "./shared";

const LIGHTBOX_SIZES = "(max-width: 760px) 94vw, 760px";
const CLOSE_MS = 220;
const SWIPE_PX = 56;
const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Swipe = {
  id: number;
  x: number;
  y: number;
  dx: number;
  axis: "x" | "y" | null;
};

/**
 * Visor accesible sobre `<dialog>` modal: título, foco atrapado, Esc, flechas,
 * contador, bloqueo del scroll de fondo y deslizamiento táctil. La imagen se
 * muestra completa (sin recorte) y las capturas no pasan de 1,6× su tamaño.
 */
export function Lightbox({
  items,
  activeId,
  initialAngle = 0,
  onNavigate,
  onClosed,
}: {
  items: PortfolioItem[];
  activeId: string | null;
  initialAngle?: number;
  onNavigate: (id: string) => void;
  /** Se llama al cerrarse, con el id de la última imagen vista. */
  onClosed: (lastId: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef(0);
  const swipe = useRef<Swipe | null>(null);
  const swallowClick = useRef(false);
  const [direction, setDirection] = useState<"next" | "prev" | "none">("none");
  const [angleState, setAngleState] = useState<{
    work: string | null;
    value: number;
  }>({ work: null, value: 0 });
  const angle = angleState.work === activeId ? angleState.value : initialAngle;
  const setAngle = (value: number) => setAngleState({ work: activeId, value });
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const noteId = `${baseId}-note`;

  const index = activeId ? items.findIndex((i) => i.id === activeId) : -1;
  const item = index >= 0 ? items[index] : null;
  const shots = item ? [item, ...(item.views ?? [])] : [];
  const photo = shots[angle] ?? item;
  const total = items.length;
  const open = item !== null;

  // Abrir como modal y bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    if (!dialog.open) dialog.showModal();
    const root = document.documentElement;
    const previous = {
      overflow: root.style.overflow,
      gutter: root.style.scrollbarGutter,
    };
    // Conserva el hueco de la barra de desplazamiento para que nada salte.
    if (root.scrollHeight > root.clientHeight)
      root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";
    return () => {
      window.clearTimeout(closeTimer.current);
      root.style.overflow = previous.overflow;
      root.style.scrollbarGutter = previous.gutter;
      if (dialog.open) dialog.close();
    };
  }, [open]);

  // Precarga las vecinas para que la navegación sea inmediata.
  useEffect(() => {
    if (index < 0 || total < 2) return;
    for (const neighbour of [
      items[(index + 1) % total],
      items[(index - 1 + total) % total],
    ]) {
      if (!neighbour.original) continue;
      const image = new Image();
      image.sizes = LIGHTBOX_SIZES;
      if (neighbour.srcSet) image.srcset = neighbour.srcSet;
      image.src = neighbour.original;
    }
  }, [index, items, total]);

  const goTo = useCallback(
    (target: number, dir: "next" | "prev") => {
      if (target < 0 || target >= total || target === index) return;
      setDirection(dir);
      setAngleState({ work: items[target].id, value: 0 });
      onNavigate(items[target].id);
    },
    [index, items, onNavigate, total],
  );

  const step = useCallback(
    (delta: 1 | -1) => {
      if (index < 0 || total < 2) return;
      goTo((index + delta + total) % total, delta > 0 ? "next" : "prev");
    },
    [goTo, index, total],
  );

  const requestClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open || dialog.dataset.closing !== undefined) return;
    if (prefersReducedMotion()) {
      dialog.close();
      return;
    }
    dialog.dataset.closing = "";
    closeTimer.current = window.setTimeout(() => {
      if (dialog.open) dialog.close();
    }, CLOSE_MS);
  }, []);

  function handleClose() {
    const dialog = dialogRef.current;
    if (dialog) delete dialog.dataset.closing;
    window.clearTimeout(closeTimer.current);
    setDirection("none");
    setAngleState({ work: null, value: 0 });
    if (item) onClosed(item.id);
  }

  function trapFocus(event: ReactKeyboardEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => el.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || current === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDialogElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        step(1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        step(-1);
        break;
      case "Home":
        event.preventDefault();
        goTo(0, "prev");
        break;
      case "End":
        event.preventDefault();
        goTo(total - 1, "next");
        break;
      case "Tab":
        trapFocus(event);
        break;
    }
  }

  // Clic en el fondo vacío (no en la foto, botones ni textos) cierra el visor.
  function handleClick(event: ReactMouseEvent<HTMLDialogElement>) {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    const target = event.target as HTMLElement;
    if (target === event.currentTarget || target.hasAttribute("data-dismiss"))
      requestClose();
  }

  // Deslizar en táctil: la foto sigue al dedo y cambia al superar el umbral.
  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" || !event.isPrimary || total < 2) return;
    swipe.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      dx: 0,
      axis: null,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = swipe.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.axis && Math.hypot(dx, dy) > 10)
      current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (current.axis !== "x") return;
    current.dx = dx;
    const figure = figureRef.current;
    if (figure && !prefersReducedMotion()) {
      figure.dataset.dragging = "";
      figure.style.setProperty("--drag", `${Math.round(dx * 0.55)}px`);
    }
  }

  function endSwipe(event: ReactPointerEvent<HTMLDivElement>) {
    const current = swipe.current;
    if (!current || current.id !== event.pointerId) return;
    swipe.current = null;
    const figure = figureRef.current;
    if (figure) {
      delete figure.dataset.dragging;
      figure.style.removeProperty("--drag");
    }
    if (
      event.type === "pointerup" &&
      current.axis === "x" &&
      Math.abs(current.dx) >= SWIPE_PX
    ) {
      swallowClick.current = true;
      window.setTimeout(() => {
        swallowClick.current = false;
      }, 400);
      step(current.dx < 0 ? 1 : -1);
    }
  }

  const frameStyle = photo
    ? ({
        "--ar": aspectOf(photo),
        "--cap": `${maxWidthOf(photo)}px`,
      } as CSSProperties)
    : undefined;

  return (
    <dialog
      ref={dialogRef}
      className="lightbox"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={noteId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={handleClose}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
    >
      {item && (
        <div className="lightbox-shell" data-dismiss="">
          <div className="lightbox-bar" data-dismiss="">
            <span className="lightbox-brand">
              <Brand title="" />
              <span>Portafolio</span>
            </span>
            <button
              type="button"
              className="icon-button lightbox-close"
              aria-label="Cerrar visor"
              onClick={requestClose}
            >
              <Icon name="close" />
            </button>
          </div>

          <div
            className="lightbox-stage"
            data-dismiss=""
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endSwipe}
            onPointerCancel={endSwipe}
          >
            <button
              type="button"
              className="icon-button lightbox-nav lightbox-prev"
              aria-label="Imagen anterior"
              onClick={() => step(-1)}
              disabled={total < 2}
            >
              <Icon name="chevron" />
            </button>
            <div className="lightbox-figure" ref={figureRef} data-dismiss="">
              <figure
                className="lightbox-frame"
                key={photo?.id}
                data-dir={direction}
                style={frameStyle}
              >
                {photo && (
                  <Photo
                    item={photo}
                    fit="contain"
                    priority
                    sizes={LIGHTBOX_SIZES}
                  />
                )}
              </figure>
            </div>
            <p className="lightbox-count" aria-hidden="true">
              <b>{pad2(index + 1)}</b>
              <span>/</span>
              {pad2(total)}
            </p>
            <button
              type="button"
              className="icon-button lightbox-nav lightbox-next"
              aria-label="Imagen siguiente"
              onClick={() => step(1)}
              disabled={total < 2}
            >
              <Icon name="chevron" />
            </button>
          </div>

          <div className="lightbox-info">
            {item?.videos?.map((video) => (
              <video
                key={video}
                controls
                playsInline
                preload="none"
                style={{
                  width: "100%",
                  maxHeight: "60vh",
                  objectFit: "contain",
                }}
                src={video}
                aria-label={`Video de ${item.title}`}
              />
            ))}
            {shots.length > 1 && (
              <div
                className="gallery-angle-controls"
                role="group"
                aria-label="Fotos del mismo tatuaje"
              >
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Ángulo anterior"
                  onClick={() =>
                    setAngle((angle - 1 + shots.length) % shots.length)
                  }
                >
                  <Icon name="chevron" />
                </button>
                <span aria-live="polite">
                  Mismo tatuaje · foto {angle + 1} de {shots.length}
                </span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Ángulo siguiente"
                  onClick={() => setAngle((angle + 1) % shots.length)}
                >
                  <Icon name="chevron" />
                </button>
              </div>
            )}
            <p className="eyebrow">{item.subtitle}</p>
            <h2 id={titleId}>{item.title}</h2>
            <p id={noteId} className="lightbox-note">
              {item.description ??
                (item.category === "tattoo"
                  ? "Tatuaje realizado por Jean Carlos en Elite."
                  : "Corte realizado por el equipo de Elite.")}
            </p>
            <Link
              className="button button-accent button-small"
              href={item.category === "tattoo" ? "/tatuaje" : "/reservar"}
            >
              {item.category === "tattoo"
                ? "Solicitar valoración"
                : "Reservar un corte"}
              <Icon name="arrow" />
            </Link>
          </div>

          <p className="visually-hidden" aria-live="polite" aria-atomic="true">
            {`Imagen ${index + 1} de ${total}: ${item.title}`}
          </p>
        </div>
      )}
    </dialog>
  );
}
