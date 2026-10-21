"use client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { DepthMark } from "../three/sculpture-stage";
import { ELITE_BOX, ELITE_PATHS } from "../three/presets";

/** Rutas públicas entre las que corre la cortina. Nunca /administracion ni paneles. */
const PUBLIC_ROUTES = new Set(["/", "/reservar", "/jean-carlos", "/tatuaje", "/turnos"]);
const COVER_MS = 190;
const REVEAL_MS = 240;
/** Si la ruta tarda, la cortina se retira igualmente: nunca deja la pantalla tapada. */
const SAFETY_MS = 2600;
const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";

const isPublic = (path: string) => PUBLIC_ROUTES.has(path.replace(/\/$/, "") || "/");

/**
 * Cortina negra con el logo Elite entre rutas públicas (≈ 430 ms en total).
 * Se eligió un control con el router y no `<ViewTransition>` de React: la cortina
 * necesita un elemento propio (logo) que no existe en ninguna de las dos páginas,
 * y así funciona igual en navegadores sin View Transitions.
 * - Solo clics normales en enlaces internos (sin modificadores, mismo origen,
 *   sin target ni descarga) hacia otra ruta pública. Atrás/adelante quedan nativos.
 * - El enlace se activa igual que con <Link>; Next gestiona scroll y anclas.
 * - Con movimiento reducido no interviene.
 */
export function PageCurtain() {
  const router = useRouter();
  const pathname = usePathname();
  const curtain = useRef<HTMLDivElement>(null);
  const state = useRef<{ from: string; covered: boolean; safety: number } | null>(null);

  const reveal = useCallback(() => {
    const el = curtain.current;
    const current = state.current;
    if (!el || !current) return;
    window.clearTimeout(current.safety);
    state.current = null;
    el.getAnimations().forEach((animation) => animation.cancel());
    el.animate(
      [
        { transform: "translate3d(0, 0, 0)" },
        { transform: "translate3d(0, -100%, 0)" },
      ],
      { duration: REVEAL_MS, easing: EASE_IN_OUT, fill: "forwards" },
    ).finished.then(
      () => {
        if (!state.current) el.removeAttribute("data-active");
      },
      () => {},
    );
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        reduce.matches ||
        state.current
      )
        return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download") || anchor.dataset.noCurtain !== undefined) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const here = window.location.pathname;
      if (url.pathname === here) return; // Anclas y filtros de la misma página.
      if (!isPublic(here) || !isPublic(url.pathname)) return;
      const el = curtain.current;
      if (!el) return;

      event.preventDefault(); // <Link> respeta defaultPrevented y no navega dos veces.
      const href = url.pathname + url.search + url.hash;
      state.current = {
        from: here,
        covered: false,
        safety: window.setTimeout(reveal, SAFETY_MS),
      };
      el.setAttribute("data-active", "");
      el.getAnimations().forEach((animation) => animation.cancel());
      el.animate(
        [
          { transform: "translate3d(0, 100%, 0)" },
          { transform: "translate3d(0, 0, 0)" },
        ],
        { duration: COVER_MS, easing: EASE_IN_OUT, fill: "forwards" },
      ).finished.then(
        () => {
          if (state.current) state.current.covered = true;
          router.push(href);
        },
        () => router.push(href),
      );
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [router, reveal]);

  // La nueva ruta ya está montada: se retira la cortina.
  useEffect(() => {
    const current = state.current;
    if (current && current.covered && pathname !== current.from) reveal();
  }, [pathname, reveal]);

  return (
    <div ref={curtain} className="page-curtain" aria-hidden="true">
      <div className="page-curtain-mark">
        <DepthMark box={ELITE_BOX} paths={ELITE_PATHS} layers={6} />
        <span className="page-curtain-line" />
      </div>
    </div>
  );
}
