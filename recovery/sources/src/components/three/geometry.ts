// Del vector SVG original a piezas extruidas con bisel. Se carga solo con el motor.

import {
  Box2,
  type BufferGeometry,
  ExtrudeGeometry,
  Path,
  Shape,
  Vector2,
  Vector3,
} from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import type { SculptureSpec } from "./types";

/** Ancho del vector en unidades de escena; la cámara se calcula a partir de él. */
export const WORLD_WIDTH = 10;

export type Piece = {
  geometry: BufferGeometry;
  /** Centro de la pieza en reposo, dentro del conjunto. */
  home: Vector3;
  layer: number;
  /** Posición de entrada dentro de su capa (izquierda → derecha). */
  rank: number;
};

export type SculptureModel = {
  pieces: Piece[];
  /** Casco convexo extruido (x, y, z intercalados) para el encuadre. */
  hull: Float32Array;
  radius: number;
  width: number;
  height: number;
  triangles: number;
};

const escapeAttribute = (value: string) =>
  value.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Caras frontal y trasera perfectamente planas (normal ±z). El suavizado por pliegue
 * mezcla su normal con la del bisel y los triángulos grandes de la tapa mostrarían
 * vetas diagonales en el reflejo; el bisel conserva su transición suave.
 */
function flattenCaps(geometry: BufferGeometry) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  for (const group of geometry.groups) {
    if (group.materialIndex !== 0) continue;
    const end = Math.min(group.start + group.count, position.count);
    for (let i = group.start; i + 2 < end; i += 3) {
      const ax = position.getX(i + 1) - position.getX(i);
      const ay = position.getY(i + 1) - position.getY(i);
      const bx = position.getX(i + 2) - position.getX(i);
      const by = position.getY(i + 2) - position.getY(i);
      const z = ax * by - ay * bx >= 0 ? 1 : -1;
      for (let j = 0; j < 3; j++) normal.setXYZ(i + j, 0, 0, z);
    }
  }
  normal.needsUpdate = true;
}

/** Casco convexo (cadena monótona de Andrew). */
function convexHull(points: Vector2[]) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length < 3) return sorted;
  const cross = (o: Vector2, a: Vector2, b: Vector2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const build = (list: Vector2[]) => {
    const chain: Vector2[] = [];
    for (const p of list) {
      while (
        chain.length >= 2 &&
        cross(chain[chain.length - 2], chain[chain.length - 1], p) <= 0
      )
        chain.pop();
      chain.push(p);
    }
    chain.pop();
    return chain;
  };
  return build(sorted).concat(build([...sorted].reverse()));
}

export function buildModel(spec: SculptureSpec): SculptureModel {
  // SVG equivalente al del logo: un <path> por capa con su fill-rule.
  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.width} ${spec.height}">` +
    spec.layers
      .map(
        (layer) =>
          `<path d="${escapeAttribute(layer.d)}" fill-rule="${layer.fillRule}"/>`,
      )
      .join("") +
    "</svg>";
  const { paths } = new SVGLoader().parse(markup);

  // toShapes() resuelve agujeros según userData.style.fillRule (evenodd/nonzero).
  // Equivale a SVGLoader.createShapes(), obsoleto desde r185.
  const sampled = paths.map((path, index) =>
    path
      .toShapes()
      .map((shape) => shape.extractPoints(spec.layers[index].curveSegments)),
  );

  const bounds = new Box2();
  for (const shapes of sampled)
    for (const { shape } of shapes)
      for (const point of shape) bounds.expandByPoint(point);
  const center = bounds.getCenter(new Vector2());
  const size = bounds.getSize(new Vector2());
  const scale = WORLD_WIDTH / size.x;
  // Centrado e inversión de Y (en SVG crece hacia abajo). Se invierten los puntos y no
  // la geometría para conservar el orden de los triángulos; la escala final es uniforme.
  const flip = (p: Vector2) => new Vector2(p.x - center.x, center.y - p.y);

  const maxDepth = Math.max(
    ...spec.layers.map((layer) => layer.depth + 2 * layer.bevel.thickness),
  );
  // Pivote en el centro del volumen: frentes alineados en z = 0 y fondos detrás.
  const zShift = (maxDepth * scale) / 2;
  const outline: Vector2[] = [];
  const pieces: Piece[] = [];
  let triangles = 0;

  sampled.forEach((shapes, layerIndex) => {
    const layer = spec.layers[layerIndex];
    const { size: bevelSize, thickness, segments, inset } = layer.bevel;
    const bevelEnabled = segments > 0 && bevelSize > 0 && thickness > 0;
    const options = {
      depth: layer.depth,
      steps: 1,
      curveSegments: 1, // los contornos ya llegan muestreados
      bevelEnabled,
      bevelSize,
      bevelThickness: thickness,
      // Con inset = 1 el borde exterior del bisel coincide con la silueta original.
      bevelOffset: -bevelSize * inset,
      bevelSegments: Math.max(1, segments),
    };
    const built = shapes.map(({ shape, holes }) => {
      const contour = shape.map(flip);
      outline.push(...contour);
      const result = new Shape(contour);
      result.holes = holes.map((hole) => new Path(hole.map(flip)));
      return result;
    });
    const groups = layer.pieces === "layer" ? [built] : built.map((s) => [s]);
    const layerPieces: Piece[] = [];
    for (const group of groups) {
      if (!group.length) continue;
      let geometry: BufferGeometry = new ExtrudeGeometry(group, options);
      // Normales suaves en el bisel y en las curvas; aristas vivas en las esquinas.
      geometry = toCreasedNormals(geometry, (layer.crease * Math.PI) / 180);
      flattenCaps(geometry);
      // La cara frontal de ExtrudeGeometry queda en depth + thickness: se lleva a z = 0.
      geometry.translate(0, 0, -(layer.depth + (bevelEnabled ? thickness : 0)));
      geometry.scale(scale, scale, scale);
      geometry.computeBoundingBox();
      const home = geometry.boundingBox!.getCenter(new Vector3());
      geometry.translate(-home.x, -home.y, -home.z);
      geometry.computeBoundingSphere();
      home.z += zShift;
      triangles += geometry.getAttribute("position").count / 3;
      layerPieces.push({ geometry, home, layer: layerIndex, rank: 0 });
    }
    layerPieces
      .sort((a, b) => a.home.x - b.home.x)
      .forEach((piece, rank) => {
        piece.rank = rank;
        pieces.push(piece);
      });
  });

  // Casco convexo extruido: basta para acotar cualquier proyección del volumen.
  const hull2d = convexHull(outline);
  const hull = new Float32Array(hull2d.length * 6);
  let radius = 0;
  hull2d.forEach((p, i) => {
    const x = p.x * scale;
    const y = p.y * scale;
    const front = zShift;
    const back = zShift - maxDepth * scale;
    hull.set([x, y, front, x, y, back], i * 6);
    radius = Math.max(
      radius,
      Math.hypot(x, y, front),
      Math.hypot(x, y, back),
    );
  });

  return {
    pieces,
    hull,
    radius,
    width: size.x * scale,
    height: size.y * scale,
    triangles,
  };
}
