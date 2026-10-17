"use client";
import { useEffect } from "react";
export function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    let frame = 0;
    const progress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const available =
          document.documentElement.scrollHeight - window.innerHeight;
        document.documentElement.style.setProperty(
          "--scroll-progress",
          String(available > 0 ? window.scrollY / available : 0),
        );
      });
    };
    window.addEventListener("scroll", progress, { passive: true });
    progress();
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
    nodes.forEach((el, index) => {
      if (el.matches(".team-card,.process-grid article"))
        el.style.transitionDelay = `${(index % 3) * 80}ms`;
      el.classList.add("will-reveal");
      observer.observe(el);
    });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", progress);
      cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty("--scroll-progress");
      nodes.forEach((el) => el.classList.remove("will-reveal"));
    };
  }, []);
  return null;
}
