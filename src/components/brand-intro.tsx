"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DepthMark, SculptureStage } from "./three/sculpture-stage";
import { ELITE_BOX, ELITE_PATHS, ELITE_SPEC } from "./three/presets";
import type { SculptureSpec } from "./three/types";

const STORAGE_KEY = "elite:intro:v4";
/** Duración total (ms) desde el primer pintado. La salida empieza en FLIGHT_AT. */
const TOTAL_MS = 1950;
const FLIGHT_AT = 1450;
const FLIGHT_MS = TOTAL_MS - FLIGHT_AT;
/** Si WebGL no ha dibujado a tiempo, la intro sigue con el vector (sin saltos a mitad). */
const WEBGL_DEADLINE_MS = 900;
const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";

// Misma pose y encuadre que el logo del hero para que el relevo no se note.
const INTRO_SPEC: SculptureSpec = {
  ...ELITE_SPEC,
  exposure: 1.15,
  rim: 3,
  motion: {
    ...ELITE_SPEC.motion,
    sway: { yaw: 0.02, pitch: 0.01, period: 6 },
    scroll: null,
    // Armado por piezas desde la profundidad: termina antes del vuelo al hero.
    intro: { kind: "assemble", duration: 0.62, stagger: 0.04 },
    sweep: 2.4,
  },
};

function readSeen() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false; // Navegación privada o almacenamiento bloqueado.
  }
}
function markSeen() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* Sin almacenamiento: la intro puede repetirse, nunca rompe la página. */
  }
}

/**
 * Intro de marca (≤ 2 s, una vez por sesión): el logo se arma por piezas en 3D, lo
 * cruza un barrido metálico, destella en rojo y vuela a su sitio en el hero, donde la
 * escultura del hero ya espera asentada (atributo `data-intro-handoff`).
 * - No bloquea: el fondo no captura el puntero; rueda, toque o cualquier tecla la saltan.
 * - Con movimiento reducido no se muestra.
 */
export function BrandIntro() {
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const flightRef = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    markSeen();
    setVisible(false);
  }, []);

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || readSeen()) {
      done.current = true;
      setVisible(false);
      return;
    }
    // El hero arranca asentado: el logo que ve el usuario es el que aterriza.
    const heroStage = document.querySelector<HTMLElement>("[data-hero-stage]");
    heroStage?.setAttribute("data-intro-handoff", "");
    document.documentElement.setAttribute("data-intro", "playing");
    return () => {
      document.documentElement.removeAttribute("data-intro");
    };
  }, []);

  useEffect(() => {
    if (done.current || !visible) return;
    const root = rootRef.current;
    const timers: number[] = [];
    // Las animaciones CSS de la intro arrancan con el primer pintado; la hidratación
    // llega después. Se mide desde ese pintado para que JS y CSS vayan sincronizados.
    const paint =
      performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;
    const elapsed = Math.max(0, performance.now() - paint);
    const at = (fn: () => void, ms: number) =>
      timers.push(window.setTimeout(fn, Math.max(0, ms - elapsed)));

    at(() => {
      const sculpture = root?.querySelector<HTMLElement>(".sculpture");
      if (sculpture?.dataset.state !== "ready") root?.setAttribute("data-late", "");
    }, WEBGL_DEADLINE_MS);

    // Vuelo FLIP hasta la escultura del hero (solo transform y opacidad, en el
    // compositor). La intro se retira cuando el vuelo termina de verdad, aunque el hilo
    // principal se haya retrasado (hidratación o compilación de shaders).
    at(() => {
      const flight = flightRef.current;
      const target = document.querySelector<HTMLElement>(
        "[data-hero-stage] .sculpture",
      );
      root?.setAttribute("data-leaving", "");
      // El texto del hero (pausado durante la intro) entra mientras el logo aterriza.
      document.documentElement.setAttribute("data-intro", "leaving");
      const from = flight?.getBoundingClientRect();
      const to = target?.getBoundingClientRect();
      // Sin hero visible (recarga a media página): solo se desvanece.
      const land =
        flight && from && to && from.width > 0 && to.bottom > 0 && to.top < window.innerHeight;
      const keyframes = land
        ? (() => {
            const pose = `translate3d(${to.left + to.width / 2 - (from.left + from.width / 2)}px, ${
              to.top + to.height / 2 - (from.top + from.height / 2)
            }px, 0) scale(${to.width / from.width})`;
            // Se funde con el logo del hero durante el último tramo del vuelo.
            return [
              { transform: "none", opacity: 1 },
              { opacity: 1, offset: 0.55 },
              { transform: pose, opacity: 0 },
            ];
          })()
        : [{ opacity: 1 }, { opacity: 0 }];
      const flightAnimation = flight?.animate(keyframes, {
        duration: FLIGHT_MS,
        easing: EASE_IN_OUT,
        fill: "forwards",
      });
      if (flightAnimation) flightAnimation.finished.then(finish, finish);
      else finish();
      // Red de seguridad: nunca más de un instante tras el vuelo previsto.
      timers.push(window.setTimeout(finish, FLIGHT_MS + 400));
    }, FLIGHT_AT);

    // Saltar: cualquier tecla, rueda o toque. Nunca retiene al usuario.
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchstart", skip, { passive: true });
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
    };
    // Al ocultarse (`visible` → false) se limpian temporizadores y escuchas.
  }, [finish, visible]);

  useEffect(() => {
    if (!visible) document.documentElement.removeAttribute("data-intro");
  }, [visible]);

  if (!visible) return null;
  return (
    <div ref={rootRef} className="elite-intro elite-intro-premium">
      <div className="elite-intro-veil" aria-hidden="true">
        <div className="elite-intro-spot elite-intro-spot-left" />
        <div className="elite-intro-spot elite-intro-spot-right" />
        <div className="elite-intro-orbit" />
      </div>
      <div className="elite-intro-flight" ref={flightRef} aria-hidden="true">
        <div className="elite-intro-stage">
          <SculptureStage
            spec={INTRO_SPEC}
            label="Elite en relieve metálico"
            className="elite-intro-sculpture"
          >
            <DepthMark box={ELITE_BOX} paths={ELITE_PATHS} layers={10} />
          </SculptureStage>
          <span className="elite-intro-glint" />
          <span className="elite-intro-flash" />
          <span className="elite-intro-floor" />
        </div>
      </div>
      <span className="elite-intro-caption" aria-hidden="true">
        CARTAGENA · UNA FIRMA PROPIA
      </span>
      <span className="elite-intro-progress" aria-hidden="true" />
      <button type="button" className="elite-intro-skip" onClick={finish}>
        Saltar intro <span aria-hidden="true">· Esc</span>
      </button>
    </div>
  );
}
