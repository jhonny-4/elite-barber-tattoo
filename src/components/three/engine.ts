// Motor de esculturas: renderizador, bucle con pausa, movimiento, encuadre y limpieza.
// Se importa de forma dinámica desde use-sculpture.ts; Three.js nunca entra en el
// paquete inicial de la página.

import {
  ACESFilmicToneMapping,
  Group,
  Mesh,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { computeFraming, envelopePoses, type Framing } from "./framing";
import { buildModel } from "./geometry";
import { createLook } from "./look";
import type {
  SculptureCallbacks,
  SculptureHandle,
  SculptureSpec,
} from "./types";

const TAU = Math.PI * 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp1 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);
const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOutBack = (t: number) => {
  const s = 1.25;
  return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
};
/** Suavizado exponencial independiente de los fps. */
const follow = (value: number, target: number, rate: number, dt: number) =>
  value + (target - value) * (1 - Math.exp(-rate * dt));
/** Pseudoaleatorio estable por pieza (la entrada es idéntica en cada visita). */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function mountSculpture(
  host: HTMLElement,
  spec: SculptureSpec,
  callbacks: SculptureCallbacks,
): SculptureHandle {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "sculpture__surface";

  // Lanza una excepción si no hay WebGL: el gancho la convierte en estado "failed".
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    stencil: false,
    powerPreference: "default",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = spec.exposure;

  const scene = new Scene();
  const model = buildModel(spec);
  const look = createLook(renderer, scene, {
    width: model.width,
    height: model.height,
    rim: spec.rim,
    sweep: spec.motion.sweep,
  });
  // Coste de la escena visible en las herramientas de desarrollo.
  canvas.dataset.triangles = String(Math.round(model.triangles));
  const group = new Group();
  scene.add(group);
  const meshes = model.pieces.map((piece) => {
    const mesh = new Mesh(piece.geometry, [look.face, look.edge]);
    mesh.position.copy(piece.home);
    group.add(mesh);
    return mesh;
  });

  const motion = spec.motion;
  const intro = motion.intro;
  // Retardos de la entrada: capa principal escalonada; capas finas en cascada después.
  const firstLayerCount = model.pieces.filter((p) => p.layer === 0).length;
  const delays = model.pieces.map((piece) =>
    intro.kind !== "assemble"
      ? 0
      : piece.layer === 0
        ? 0.08 + piece.rank * intro.stagger
        : 0.08 +
          Math.max(0, firstLayerCount - 1) * intro.stagger * 0.8 +
          piece.layer * 0.06 +
          piece.rank * intro.stagger * 0.5,
  );
  const introEnd =
    intro.kind === "assemble"
      ? Math.max(...delays) + intro.duration
      : intro.duration;

  const camera = new PerspectiveCamera(spec.fov, 1, 0.1, 500);
  const rest = {
    pitch: motion.rest.pitch,
    yaw: motion.rest.yaw,
    x: 0,
    y: 0,
    z: 0,
  };
  const poses = envelopePoses(motion, model.width, model.height);
  let framing: Framing = {
    distance: model.radius * 4,
    offsetX: 0,
    offsetY: 0,
    fill: spec.fill,
  };

  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fineQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  let reduced = reduceQuery.matches;
  let visible = false;
  let pageHidden = document.hidden;
  let lost = false;
  let disposed = false;
  let compiled = false;
  let announced = false;
  let frame = 0;
  let last = 0;
  let clock = 0;
  let width = 0;
  let height = 0;
  let scroll = 0;
  const pointer = { x: 0, y: 0, clientX: 0, clientY: 0, inside: false };

  host.appendChild(canvas);

  // ---------------------------------------------------------------- tamaño
  function measure() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return false;
    // Densidad máxima 2 (1,5 en pantallas pequeñas): nitidez sin disparar el coste.
    const small = window.innerWidth < 768;
    const ratio = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    if (w === width && h === height && ratio === renderer.getPixelRatio())
      return true;
    width = w;
    height = h;
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    framing = computeFraming({
      points: model.hull,
      radius: model.radius,
      rest,
      poses,
      fov: spec.fov,
      aspect: camera.aspect,
      fill: spec.fill,
      limitX: spec.limit.x,
      limitY: spec.limit.y,
    });
    camera.position.set(0, 0, framing.distance);
    camera.near = Math.max(0.05, framing.distance * 0.05);
    camera.far = framing.distance + model.radius * 4 + model.width * 2;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    return true;
  }

  // ---------------------------------------------------------------- pose
  function scrollProgress(rect: DOMRect) {
    // 0 mientras el elemento está en su sitio del primer pliegue; 1 cuando sale por arriba.
    const viewport = window.innerHeight || 1;
    const top = rect.top + window.scrollY;
    const start = Math.max(0, top + rect.height / 2 - viewport / 2);
    const end = top + rect.height;
    return clamp01((window.scrollY - start) / Math.max(1, end - start));
  }

  function placeAtRest() {
    group.rotation.set(motion.rest.pitch, motion.rest.yaw, 0);
    group.position.set(framing.offsetX, framing.offsetY, 0);
    meshes.forEach((mesh, i) => {
      mesh.position.copy(model.pieces[i].home);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.setScalar(1);
    });
    look.still();
    renderer.toneMappingExposure = spec.exposure;
  }

  function assemble(time: number) {
    if (intro.kind !== "assemble") return;
    meshes.forEach((mesh, i) => {
      const piece = model.pieces[i];
      const local = clamp01((time - delays[i]) / intro.duration);
      const seed = i + piece.layer * 17;
      if (local >= 1) {
        mesh.position.copy(piece.home);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.setScalar(1);
        return;
      }
      // Desde la profundidad: lejos, girada y algo dispersa; se encaja en su sitio.
      const travel = 1 - easeOutQuart(local);
      const turn = 1 - easeOutBack(local);
      const depth = (0.55 + 0.3 * hash(seed)) * model.width;
      mesh.position.set(
        piece.home.x * (1 + 0.22 * travel),
        piece.home.y * (1 + 0.22 * travel) + (hash(seed + 3) - 0.5) * 0.3 * travel,
        piece.home.z - depth * travel,
      );
      mesh.rotation.set(
        (hash(seed + 5) - 0.5) * 1.8 * turn,
        (hash(seed + 7) - 0.5) * 1.5 * turn,
        (hash(seed + 11) - 0.5) * 0.5 * turn,
      );
      mesh.scale.setScalar(0.72 + 0.28 * easeOutCubic(local));
    });
  }

  function animate(dt: number, rect: DOMRect) {
    clock += dt;
    const t = clock;
    // Puntero fino: inclinación hacia donde mira el usuario, relativa al propio elemento.
    let targetX = 0;
    let targetY = 0;
    if (pointer.inside && fineQuery.matches && rect.width > 0) {
      targetX = clamp1(
        ((pointer.clientX - (rect.left + rect.width / 2)) / rect.width) * 1.6,
      );
      targetY = clamp1(
        ((pointer.clientY - (rect.top + rect.height / 2)) / rect.height) * 1.6,
      );
    }
    pointer.x = follow(pointer.x, targetX, 4, dt);
    pointer.y = follow(pointer.y, targetY, 4, dt);
    if (motion.scroll) scroll = follow(scroll, scrollProgress(rect), 7, dt);

    // El vaivén entra suave al terminar la entrada para no dar tirones.
    const settle = easeOutCubic(clamp01((t - introEnd * 0.6) / 2.4));
    const sway = Math.sin((t / motion.sway.period) * TAU);
    const swayPitch = Math.sin((t / (motion.sway.period * 1.37)) * TAU + 1.2);
    const float =
      Math.sin((t / motion.float.period) * TAU) *
      motion.float.amplitude *
      model.height;

    let yaw = motion.rest.yaw + sway * motion.sway.yaw * settle;
    let pitch = motion.rest.pitch + swayPitch * motion.sway.pitch * settle;
    let z = 0;
    yaw += pointer.x * motion.pointer.yaw;
    pitch += pointer.y * motion.pointer.pitch;
    if (motion.scroll) {
      yaw += motion.scroll.yaw * scroll;
      pitch += motion.scroll.pitch * scroll;
      z -= motion.scroll.recede * model.width * scroll;
    }
    if (intro.kind === "rise") {
      const e = 1 - easeOutCubic(clamp01(t / intro.duration));
      yaw += intro.yaw * e;
      z -= intro.recede * model.width * e;
    } else {
      assemble(t);
    }
    group.rotation.set(pitch, yaw, Math.sin((t / motion.float.period) * Math.PI) * 0.006);
    group.position.set(framing.offsetX, framing.offsetY + float * settle, z);
    look.animate(t);
    // Las luces "se encienden" con la entrada.
    renderer.toneMappingExposure =
      spec.exposure * (0.55 + 0.45 * easeOutCubic(clamp01(t / 1.4)));
  }

  function draw(dt: number) {
    if (!measure()) return false;
    if (reduced) placeAtRest();
    else animate(dt, host.getBoundingClientRect());
    renderer.render(scene, camera);
    if (!announced) {
      announced = true;
      callbacks.onReady();
    }
    return true;
  }

  // ---------------------------------------------------------------- bucle
  function tick(now: number) {
    frame = window.requestAnimationFrame(tick);
    // Tiempo real hasta 10 fps; por debajo se ralentiza en vez de saltar.
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    draw(dt);
  }

  function update() {
    const run =
      compiled && visible && !pageHidden && !reduced && !lost && !disposed;
    if (run && !frame) {
      last = performance.now();
      frame = window.requestAnimationFrame(tick);
    } else if (!run && frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  /** Fotograma suelto cuando el bucle no corre (estático, oculto o recién medido). */
  function still() {
    if (compiled && !lost && !disposed && !frame) draw(0);
  }

  // ---------------------------------------------------------------- eventos
  const resizeObserver = new ResizeObserver(() => {
    if (measure()) still();
  });
  resizeObserver.observe(host);

  const intersection = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      update();
    },
    { rootMargin: "48px 0px" },
  );
  intersection.observe(host);

  const onVisibility = () => {
    pageHidden = document.hidden;
    update();
  };
  const onReduce = () => {
    reduced = reduceQuery.matches;
    update();
    still();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    pointer.clientX = event.clientX;
    pointer.clientY = event.clientY;
    pointer.inside = true;
  };
  const onPointerLeave = () => {
    pointer.inside = false;
  };
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    update();
    callbacks.onFail("context-lost");
  };
  const onRestored = () => callbacks.onRestore();

  document.addEventListener("visibilitychange", onVisibility);
  reduceQuery.addEventListener("change", onReduce);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
  window.addEventListener("blur", onPointerLeave);
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  // Compila los shaders sin bloquear (KHR_parallel_shader_compile) y dibuja.
  measure();
  placeAtRest();
  const begin = () => {
    if (disposed || lost) return;
    compiled = true;
    still();
    update();
  };
  renderer.compileAsync(scene, camera).then(begin, begin);

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduceQuery.removeEventListener("change", onReduce);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener(
        "pointerleave",
        onPointerLeave,
      );
      window.removeEventListener("blur", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      for (const piece of model.pieces) piece.geometry.dispose();
      look.dispose();
      scene.clear();
      renderer.renderLists.dispose();
      renderer.dispose();
      // Libera el contexto ya: al navegar entre páginas no se acumulan contextos WebGL.
      if (!lost) renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
