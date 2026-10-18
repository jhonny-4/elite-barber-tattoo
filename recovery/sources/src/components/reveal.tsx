"use client";
import { useEffect } from "react";

const STEP_MS = 80;
const MAX_STEPS = 4;

/**
 * Revelado al hacer scroll para elementos con `data-reveal` (clases `.will-reveal` y
 * `.is-visible` de base.css). Lo usan la portada (secciones de otras áreas) y /jean-carlos.
 * - Sin JavaScript, sin IntersectionObserver o con movimiento reducido: todo visible.
 * - Lo que ya está en pantalla al montar no se oculta (sin parpadeo).
 * - Los hermanos con `data-reveal` entran en cascada (hasta 4 pasos de 80 ms).
 * - Detecta elementos montados después y, al terminar, retira las clases para que el
 *   elemento recupere sus propias transiciones (hover, etc.).
 */
export function Reveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const handled = new WeakSet<Element>();
    const active = new Set<HTMLElement>();

    const finish = (el: HTMLElement) => {
      el.classList.remove("will-reveal", "is-visible");
      el.style.removeProperty("transition-delay");
      active.delete(el);
    };

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          el.classList.add("is-visible");
          const done = (event: TransitionEvent) => {
            if (event.target !== el || event.propertyName !== "opacity") return;
            el.removeEventListener("transitionend", done);
            finish(el);
          };
          el.addEventListener("transitionend", done);
        }),
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );

    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        if (handled.has(el)) return;
        handled.add(el);
        const box = el.getBoundingClientRect();
        if (box.top < window.innerHeight && box.bottom > 0) return;
        const siblings = el.parentElement
          ? Array.from(el.parentElement.children).filter((child) =>
              child.hasAttribute("data-reveal"),
            )
          : [];
        const step = Math.min(Math.max(siblings.indexOf(el), 0), MAX_STEPS);
        if (step) el.style.transitionDelay = `${step * STEP_MS}ms`;
        el.classList.add("will-reveal");
        active.add(el);
        observer.observe(el);
      });
    };

    scan();
    let frame = 0;
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      active.forEach(finish);
    };
  }, []);
  return null;
}
