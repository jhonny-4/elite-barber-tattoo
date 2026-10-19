"use client";
import { useEffect, useState } from "react";
import { JCMonogram } from "./brand/logos";

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const sync = () => setVisible(window.scrollY > 600);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);
  return <button type="button" className="back-to-top" aria-label="Volver al inicio de la página" title="Volver arriba" hidden={!visible} onClick={() => {
    window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    const heading = document.querySelector<HTMLElement>("#inicio, #main");
    if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
  }}><JCMonogram /><span aria-hidden="true">↑</span></button>;
}
