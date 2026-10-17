"use client";
import { useEffect } from "react";
export function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    nodes.forEach((el) => {
      el.classList.add("will-reveal");
      observer.observe(el);
    });
    return () => {
      observer.disconnect();
      nodes.forEach((el) => el.classList.remove("will-reveal"));
    };
  }, []);
  return null;
}
