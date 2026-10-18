"use client";
import { useEffect } from "react";

const properties = ["--tilt-x", "--tilt-y", "--glare-x", "--glare-y"];

/**
 * Inclinación 3D al pasar el ratón sobre `[data-tilt]` (el valor son los grados máximos).
 * Solo con puntero fino y sin movimiento reducido. Escribe variables CSS que consume
 * `src/styles/areas/home.css`; en táctil o con movimiento reducido no hace nada.
 */
export function HoverTilt() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let detach: () => void = () => {};

    const attach = () => {
      detach();
      if (!fine.matches || reduce.matches) return;
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>("[data-tilt]"),
      );
      const offs = nodes.map((node) => {
        const max = Number(node.dataset.tilt) || 6;
        // Se mide el contenedor sin inclinar para que la caja no oscile.
        const frameOf = () => node.parentElement ?? node;
        let raf = 0;
        const reset = () => {
          cancelAnimationFrame(raf);
          node.removeAttribute("data-tilting");
          properties.forEach((p) => node.style.removeProperty(p));
        };
        const move = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          const box = frameOf().getBoundingClientRect();
          const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
          const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            node.setAttribute("data-tilting", "");
            node.style.setProperty("--tilt-x", `${((0.5 - y) * max).toFixed(2)}deg`);
            node.style.setProperty("--tilt-y", `${((x - 0.5) * max).toFixed(2)}deg`);
            node.style.setProperty("--glare-x", `${(x * 100).toFixed(1)}%`);
            node.style.setProperty("--glare-y", `${(y * 100).toFixed(1)}%`);
          });
        };
        node.addEventListener("pointermove", move);
        node.addEventListener("pointerleave", reset);
        return () => {
          node.removeEventListener("pointermove", move);
          node.removeEventListener("pointerleave", reset);
          reset();
        };
      });
      detach = () => offs.forEach((off) => off());
    };

    attach();
    fine.addEventListener("change", attach);
    reduce.addEventListener("change", attach);
    return () => {
      detach();
      fine.removeEventListener("change", attach);
      reduce.removeEventListener("change", attach);
    };
  }, []);
  return null;
}
