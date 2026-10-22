"use client";
import { useEffect } from "react";

type Gsap = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;
type SplitTextStatic = typeof import("gsap/SplitText").SplitText;

const all = <T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document,
) => Array.from(root.querySelectorAll<T>(selector));

/** Solo se anima lo que aún no se ve: lo que ya está en pantalla no parpadea. */
const pending = (el: Element) =>
  el.getBoundingClientRect().top > window.innerHeight * 0.92;

/**
 * Coreografía de scroll de la portada con GSAP + ScrollTrigger (carga diferida).
 * - Todo el contenido es visible sin JavaScript: solo se ocultan, al iniciar, los
 *   elementos que aún están fuera de pantalla y se revelan al llegar.
 * - Con `prefers-reduced-motion: reduce` no se crea ninguna animación.
 * - `gsap.matchMedia` revierte estilos, ScrollTriggers y SplitText al desmontar.
 */
export function HomeMotion() {
  useEffect(() => {
    let disposed = false;
    let teardown = () => {};

    void Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
      import("gsap/SplitText"),
    ])
      .then(([{ gsap }, { ScrollTrigger }, { SplitText }]) => {
        if (disposed) return;
        gsap.registerPlugin(ScrollTrigger, SplitText);
        const mm = gsap.matchMedia();
        mm.add(
          {
            motion: "(prefers-reduced-motion: no-preference)",
            wide: "(min-width: 900px)",
          },
          (context) => {
            const { motion, wide } = (context.conditions ?? {}) as Record<
              string,
              boolean
            >;
            if (!motion) return;
            heroExit(gsap, wide);
            marquee(gsap, ScrollTrigger);
            headings(gsap, SplitText);
            reveals(gsap, ScrollTrigger);
            const unveil = wide ? veils() : undefined;
            manifesto(gsap);
            depth(gsap, wide);
            return unveil;
          },
        );

        // Recalcula posiciones si cambia la altura (filtros de galería, fuentes, 3D).
        let timer = 0;
        let lastHeight = document.body.scrollHeight;
        const resize = new ResizeObserver(() => {
          const height = document.body.scrollHeight;
          if (Math.abs(height - lastHeight) < 2) return;
          lastHeight = height;
          window.clearTimeout(timer);
          timer = window.setTimeout(() => ScrollTrigger.refresh(), 180);
        });
        resize.observe(document.body);
        void document.fonts?.ready.then(() => {
          if (!disposed) ScrollTrigger.refresh();
        });

        teardown = () => {
          resize.disconnect();
          window.clearTimeout(timer);
          mm.revert();
        };
      })
      .catch(() => {
        /* Sin GSAP la portada queda estática y completamente visible. */
      });

    return () => {
      disposed = true;
      teardown();
    };
  }, []);
  return null;
}

/** Salida del hero: la escultura se aleja y el título se abre hacia los lados. */
function heroExit(gsap: Gsap, wide: boolean) {
  const hero = document.querySelector<HTMLElement>("[data-home-hero]");
  if (!hero) return;
  const shift = () => window.innerWidth * (wide ? 0.07 : 0.045);
  const timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: hero,
      start: 0,
      end: "bottom top",
      scrub: 0.5,
      invalidateOnRefresh: true,
    },
  });
  const pick = (selector: string) => hero.querySelector(selector);
  timeline
    // La escultura ya se aleja sola con el scroll; el contenedor solo acompaña.
    .to(pick("[data-hero-stage]"), { yPercent: wide ? -8 : -5, scale: 0.94, opacity: 0.35 }, 0)
    .to(pick("[data-hero-halo]"), { scale: 1.35, opacity: 0.4 }, 0)
    .to(pick("[data-hero-line='start']"), { x: () => -shift(), opacity: 0.3 }, 0)
    .to(pick("[data-hero-line='end']"), { x: () => shift(), opacity: 0.3 }, 0)
    .to(pick("[data-hero-fade]"), { y: -36, opacity: 0.15 }, 0)
    .to(pick("[data-hero-floor]"), { yPercent: 16, opacity: 0.25 }, 0);
}

/** Bandas en sentidos opuestos; aceleran con la velocidad del scroll. */
function marquee(gsap: Gsap, ScrollTrigger: ScrollTriggerStatic) {
  const root = document.querySelector<HTMLElement>("[data-marquee]");
  if (!root) return;
  const loops = all("[data-marquee-band]", root).map((band) => {
    const track = band.querySelector(".home-marquee-track");
    const forward = band.dataset.marqueeBand === "1";
    return gsap.fromTo(
      track,
      { xPercent: forward ? -50 : 0 },
      { xPercent: forward ? 0 : -50, duration: 46, ease: "none", repeat: -1 },
    );
  });
  const speed = { value: 1 };
  const apply = () => loops.forEach((loop) => loop.timeScale(speed.value));
  const trigger = ScrollTrigger.create({
    trigger: root,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) =>
      loops.forEach((loop) => (self.isActive ? loop.resume() : loop.pause())),
    onUpdate: (self) => {
      const boost = gsap.utils.clamp(1, 5, 1 + Math.abs(self.getVelocity()) / 300);
      if (boost <= speed.value + 0.05) return;
      speed.value = boost;
      apply();
      gsap.to(speed, {
        value: 1,
        duration: 1.2,
        ease: "power2.out",
        overwrite: true,
        onUpdate: apply,
      });
    },
  });
  if (!trigger.isActive) loops.forEach((loop) => loop.pause());
}

/** Títulos: líneas que se levantan en 3D; el resto del bloque sube en cascada. */
function headings(gsap: Gsap, SplitText: SplitTextStatic) {
  all("[data-anim='heading']").forEach((block) => {
    if (!pending(block)) return;
    const parts = Array.from(block.children).filter(
      (child) => !child.hasAttribute("data-split"),
    );
    if (parts.length)
      gsap.from(parts, {
        opacity: 0,
        y: 28,
        duration: 0.9,
        ease: "expo.out",
        stagger: 0.09,
        scrollTrigger: { trigger: block, start: "clamp(top 88%)", once: true },
      });
    const title = block.querySelector<HTMLElement>("[data-split]");
    if (!title) return;
    SplitText.create(title, {
      type: "lines",
      linesClass: "home-split-line",
      autoSplit: true,
      onSplit: (split) =>
        // rotateX positivo: la línea se aleja (nunca se amplía ni desborda en móvil).
        gsap.from(split.lines, {
          opacity: 0,
          yPercent: 65,
          rotateX: 75,
          transformOrigin: "50% 100%",
          transformPerspective: 900,
          duration: 1.15,
          ease: "expo.out",
          stagger: 0.12,
          scrollTrigger: { trigger: title, start: "clamp(top 90%)", once: true },
          // Al terminar se restaura el marcado original (sin líneas fijas).
          onComplete: () => {
            split.kill();
            split.revert();
          },
        }),
    });
  });
}

/** Revelados por lotes: bloques, tarjetas con giro 3D y fotos. */
function reveals(gsap: Gsap, ScrollTrigger: ScrollTriggerStatic) {
  const groups: [string, GSAPTweenVars, number][] = [
    ["[data-anim='rise']", { y: 40 }, 0.08],
    [
      "[data-anim='card']",
      { y: 72, rotateX: -14, transformPerspective: 1100, transformOrigin: "50% 0%" },
      0.11,
    ],
    ["[data-anim='photo']", { y: 90, scale: 0.94 }, 0.16],
  ];
  for (const [selector, from, stagger] of groups) {
    const targets = all(selector).filter(pending);
    if (!targets.length) continue;
    gsap.set(targets, { opacity: 0, ...from });
    ScrollTrigger.batch(targets, {
      start: "clamp(top 92%)",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          rotateX: 0,
          scale: 1,
          duration: 1.05,
          ease: "expo.out",
          stagger,
          overwrite: true,
        }),
    });
  }
}

/**
 * Cortina sobre las fotos de trabajos (solo escritorio): una capa oscura con filo rojo
 * se retira de lado y la foto se asienta. Es CSS (solo transform, ver `.veil` en
 * cinematic.css) disparado por IntersectionObserver, que no guarda posiciones: al
 * filtrar la galería ninguna foto queda tapada. Devuelve la limpieza.
 */
function veils() {
  const targets = all(".home-shop-photo, .gallery-section[data-variant='home'] .gallery-frame").filter(pending);
  if (!targets.length) return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-unveiled");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -6% 0px" },
  );
  targets.forEach((el) => {
    el.classList.add("veil");
    io.observe(el);
  });
  return () => {
    io.disconnect();
    targets.forEach((el) => el.classList.remove("veil", "is-unveiled"));
  };
}

/** El manifiesto se ilumina palabra a palabra al avanzar (scrub). */
function manifesto(gsap: Gsap) {
  const paragraph = document.querySelector<HTMLElement>("[data-lit]");
  if (!paragraph) return;
  gsap.fromTo(
    all(".home-lit-word", paragraph),
    { opacity: 0.18 },
    {
      opacity: 1,
      ease: "none",
      stagger: 0.12,
      scrollTrigger: {
        trigger: paragraph,
        start: "top 82%",
        end: "bottom 46%",
        scrub: 0.4,
      },
    },
  );
}

/** Capas con profundidad: parallax moderado, monograma y calendario. */
function depth(gsap: Gsap, wide: boolean) {
  const factor = wide ? 1 : 0.5;
  all("[data-parallax]").forEach((frame) => {
    const amount = (Number(frame.dataset.parallax) || 0) * factor;
    gsap.fromTo(
      frame,
      { yPercent: -amount },
      {
        yPercent: amount,
        ease: "none",
        scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: 0.6 },
      },
    );
  });

  // Marcas de agua de cada sección: capa lenta detrás del contenido (solo escritorio).
  // Se usa `translate` para no pisar su animación CSS de ambiente (que usa transform).
  if (wide)
    all(".home-page > .section > .elite-section-watermark").forEach((mark, i) => {
      const travel = 34 + (i % 3) * 12; // Cabe en el margen (inset 8 %) de la sección.
      gsap.fromTo(
        mark,
        { translate: `0px ${-travel}px` },
        {
          translate: `0px ${travel}px`,
          ease: "none",
          scrollTrigger: {
            trigger: mark.parentElement,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
          },
        },
      );
    });

  const ghost = document.querySelector<HTMLElement>("[data-ghost]");
  if (ghost)
    // El centrado (-50 %) lo asume GSAP mientras anima; sin JS lo hace el CSS.
    gsap.fromTo(
      ghost,
      { x: 0, xPercent: -43 },
      {
        xPercent: -57,
        ease: "none",
        scrollTrigger: {
          trigger: ghost.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
        },
      },
    );

  const artist = document.querySelector<HTMLElement>("[data-artist-stage]");
  if (artist)
    gsap.fromTo(
      artist,
      { scale: 0.86, yPercent: 8, opacity: 0.45 },
      {
        scale: 1,
        yPercent: 0,
        opacity: 1,
        ease: "none",
        scrollTrigger: { trigger: artist, start: "top bottom", end: "center 58%", scrub: 0.6 },
      },
    );

  const scene = document.querySelector<HTMLElement>("[data-book-scene]");
  if (scene)
    gsap.fromTo(
      scene,
      { rotateX: 16, yPercent: 8, transformPerspective: 1400, transformOrigin: "50% 100%" },
      {
        rotateX: 0,
        yPercent: 0,
        ease: "none",
        scrollTrigger: { trigger: scene, start: "top bottom", end: "center 62%", scrub: 0.6 },
      },
    );
}
