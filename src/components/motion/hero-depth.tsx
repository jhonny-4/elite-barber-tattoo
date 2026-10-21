"use client";
import { useEffect } from "react";

type Mote = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
  depth: number;
};

/** Seguimiento suave independiente de los fps. */
const follow = (value: number, target: number, rate: number, dt: number) =>
  value + (target - value) * (1 - Math.exp(-rate * dt));

/** Sprite de brillo dibujado una vez: cada partícula es un drawImage barato. */
function glowSprite() {
  const size = 32;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

/**
 * Profundidad del hero (solo puntero fino y sin movimiento reducido para el paralaje):
 * - Polvo de luz en el foco: lienzo 2D con ≤ 72 partículas (36 en tableta, ninguna en
 *   móvil). Se pausa fuera de pantalla y con la pestaña oculta.
 * - Paralaje de capas con el ratón (halo, marcas y polvo) usando la propiedad
 *   `translate`, que no interfiere con los `transform` de GSAP.
 * El propio logo 3D ya sigue al puntero desde el motor (src/components/three/engine.ts).
 */
export function HeroDepth() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-home-hero]");
    const canvas = hero?.querySelector<HTMLCanvasElement>("[data-hero-dust]");
    if (!hero || !canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const width0 = window.innerWidth;
    const count = width0 >= 1024 ? 72 : width0 >= 768 ? 36 : 0;
    const ctx = count ? canvas.getContext("2d") : null;
    const sprite = ctx ? glowSprite() : null;

    const layers = fine
      ? ([
          ["[data-hero-halo]", -14],
          [".home-hero-marks", 10],
          ["[data-hero-dust]", 18],
          [".home-hero-beam", -8],
        ] as const)
          .map(([selector, amount]): { el: HTMLElement | null; amount: number } => ({
            el: hero.querySelector<HTMLElement>(selector),
            amount,
          }))
          .filter((layer): layer is { el: HTMLElement; amount: number } => !!layer.el)
      : [];

    let w = 0;
    let h = 0;
    let motes: Mote[] = [];
    const seed = () => {
      motes = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: 0.6 + Math.random() * 1.9,
        vx: (Math.random() - 0.5) * 0.012,
        vy: -0.006 - Math.random() * 0.018,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.4,
        depth: 0.4 + Math.random() * 0.6,
      }));
    };
    const resize = () => {
      if (!ctx) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    let visible = true;
    let frame = 0;
    let last = 0;
    let time = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const draw = (dt: number) => {
      if (!ctx || !sprite) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const cx = w / 2;
      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt * m.speed;
        if (m.y < -0.05) {
          m.y = 1.05;
          m.x = Math.random();
        }
        if (m.x < -0.05) m.x = 1.05;
        if (m.x > 1.05) m.x = -0.05;
        const px = m.x * w + pointer.x * 14 * m.depth;
        const py = m.y * h + pointer.y * 10 * m.depth;
        // Cono del foco: más brillo cerca del eje y en la mitad superior.
        const spread = 0.18 + 0.32 * (py / h);
        const axis = Math.abs(px - cx) / (w * spread);
        const cone = Math.max(0, 1 - axis * axis);
        if (cone <= 0.01) continue;
        const flicker = 0.55 + 0.45 * Math.sin(time * m.speed + m.phase);
        const alpha = cone * flicker * 0.55 * m.depth;
        const size = m.r * 6 * m.depth;
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, px - size / 2, py - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      pointer.x = follow(pointer.x, pointer.tx, 3.2, dt);
      pointer.y = follow(pointer.y, pointer.ty, 3.2, dt);
      for (const layer of layers)
        layer.el.style.translate = `${(pointer.x * layer.amount).toFixed(2)}px ${(pointer.y * layer.amount * 0.6).toFixed(2)}px`;
      draw(dt);
    };

    const update = () => {
      const run = visible && !document.hidden && (count > 0 || layers.length > 0);
      if (run && !frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      } else if (!run && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      update();
    });
    const ro = new ResizeObserver(resize);

    if (ctx) {
      resize();
      seed();
      ro.observe(canvas);
      canvas.setAttribute("data-live", "");
    }
    io.observe(hero);
    document.addEventListener("visibilitychange", update);
    if (layers.length) window.addEventListener("pointermove", onPointer, { passive: true });
    update();

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("pointermove", onPointer);
      layers.forEach((layer) => layer.el.style.removeProperty("translate"));
      canvas.removeAttribute("data-live");
    };
  }, []);
  return null;
}
