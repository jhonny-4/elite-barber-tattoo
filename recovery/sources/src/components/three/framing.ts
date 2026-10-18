// Encuadre de cámara calculado a partir del casco convexo del vector extruido.
// Matemática pura (sin Three.js): proyección en perspectiva con rotación XYZ como Object3D.

import type { SculptureMotion } from "./types";

export type Pose = {
  pitch: number;
  yaw: number;
  x: number;
  y: number;
  z: number;
};

type Extents = { minX: number; maxX: number; minY: number; maxY: number };

export type Framing = {
  /** Distancia de la cámara al origen. */
  distance: number;
  /** Desplazamiento del conjunto para centrar la proyección en reposo. */
  offsetX: number;
  offsetY: number;
  /** Fracción del ancho del lienzo que ocupa el vector en reposo. */
  fill: number;
};

const OUTSIDE: Extents = {
  minX: -Infinity,
  maxX: Infinity,
  minY: -Infinity,
  maxY: Infinity,
};

/** Extensión proyectada (NDC, −1…1) de los puntos `xyz` en una pose. */
export function projectExtents(
  points: Float32Array,
  pose: Pose,
  distance: number,
  tanHalf: number,
  aspect: number,
): Extents {
  const cy = Math.cos(pose.yaw);
  const sy = Math.sin(pose.yaw);
  const cx = Math.cos(pose.pitch);
  const sx = Math.sin(pose.pitch);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 3) {
    const x = points[i];
    const y = points[i + 1];
    const z = points[i + 2];
    // Ry(yaw) y después Rx(pitch): mismo orden que Euler "XYZ" de Three.js.
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cx - z1 * sx;
    const z2 = y * sx + z1 * cx;
    const w = distance - (z2 + pose.z);
    if (w <= 1e-4) return OUTSIDE;
    const px = (x1 + pose.x) / (w * tanHalf * aspect);
    const py = (y2 + pose.y) / (w * tanHalf);
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  return { minX, maxX, minY, maxY };
}

/** Menor distancia que cumple un predicado monótono (falso cerca, verdadero lejos). */
function smallestDistance(ok: (distance: number) => boolean, near: number) {
  let lo = near;
  let hi = Math.max(near * 4, 1);
  for (let guard = 0; !ok(hi) && guard < 24; guard++) hi *= 2;
  for (let i = 0; i < 36; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Poses extremas de la animación: el vector debe caber en todas. */
export function envelopePoses(
  motion: SculptureMotion,
  width: number,
  height: number,
): Pose[] {
  const yawReach = motion.sway.yaw + motion.pointer.yaw;
  const pitchReach = motion.sway.pitch + motion.pointer.pitch;
  const floatY = motion.float.amplitude * height;
  const steps = [-1, -0.5, 0, 0.5, 1];
  const scrollSteps = motion.scroll ? [0, 0.35, 0.7, 1] : [0];
  const poses: Pose[] = [];
  for (const s of scrollSteps) {
    for (const a of steps) {
      for (const b of steps) {
        for (const f of [-1, 1]) {
          poses.push({
            yaw: motion.rest.yaw + yawReach * a + (motion.scroll?.yaw ?? 0) * s,
            pitch:
              motion.rest.pitch +
              pitchReach * b +
              (motion.scroll?.pitch ?? 0) * s,
            x: 0,
            y: floatY * f,
            z: -(motion.scroll?.recede ?? 0) * width * s,
          });
        }
      }
    }
  }
  if (motion.intro.kind === "rise") {
    for (const e of [0, 0.2, 0.4, 0.6, 0.8]) {
      for (const f of [-1, 1]) {
        poses.push({
          yaw: motion.rest.yaw + motion.intro.yaw * (1 - e),
          pitch: motion.rest.pitch,
          x: 0,
          y: floatY * f,
          z: -motion.intro.recede * width * (1 - e),
        });
      }
    }
  }
  return poses;
}

/**
 * Distancia y desplazamiento de cámara: el vector ocupa `fill` del ancho en reposo
 * (si cabe) y nunca supera `limit` en ninguna pose del envoltorio.
 */
export function computeFraming(options: {
  points: Float32Array;
  radius: number;
  rest: Pose;
  poses: Pose[];
  fov: number;
  aspect: number;
  fill: number;
  limitX: number;
  limitY: number;
}): Framing {
  const { points, rest, poses, aspect, fill, limitX, limitY } = options;
  const tanHalf = Math.tan((options.fov * Math.PI) / 360);
  const near = options.radius * 1.05 + 0.01;
  let offsetX = 0;
  let offsetY = 0;
  let distance = near;
  const shift = (pose: Pose): Pose => ({
    ...pose,
    x: pose.x + offsetX,
    y: pose.y + offsetY,
  });
  const solve = () => {
    const restPose = shift(rest);
    const fillDistance = smallestDistance((d) => {
      const e = projectExtents(points, restPose, d, tanHalf, aspect);
      return (e.maxX - e.minX) / 2 <= fill;
    }, near);
    const shifted = poses.map(shift);
    const fitDistance = smallestDistance(
      (d) =>
        shifted.every((pose) => {
          const e = projectExtents(points, pose, d, tanHalf, aspect);
          return (
            e.minX >= -limitX &&
            e.maxX <= limitX &&
            e.minY >= -limitY &&
            e.maxY <= limitY
          );
        }),
      near,
    );
    return Math.max(fillDistance, fitDistance);
  };
  // Alterna distancia y centrado: la perspectiva hace que ambos dependan entre sí.
  for (let pass = 0; pass < 3; pass++) {
    distance = solve();
    const e = projectExtents(points, shift(rest), distance, tanHalf, aspect);
    offsetX -= ((e.minX + e.maxX) / 2) * distance * tanHalf * aspect;
    offsetY -= ((e.minY + e.maxY) / 2) * distance * tanHalf;
  }
  distance = solve();
  const e = projectExtents(points, shift(rest), distance, tanHalf, aspect);
  return { distance, offsetX, offsetY, fill: (e.maxX - e.minX) / 2 };
}
