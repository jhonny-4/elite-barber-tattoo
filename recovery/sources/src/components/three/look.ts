// Material y luz compartidos: cromo claro pulido, cantos más oscuros, barrido de luz
// blanca y luz de borde roja. Se carga solo con el motor.

import {
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  PMREMGenerator,
  type Scene,
  type WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const TAU = Math.PI * 2;

export type Look = {
  face: MeshPhysicalMaterial;
  edge: MeshPhysicalMaterial;
  /** Coloca luces y entorno para el instante `time` (s). */
  animate: (time: number) => void;
  /** Iluminación fija para el fotograma estático (movimiento reducido). */
  still: () => void;
  dispose: () => void;
};

/**
 * RoomEnvironment con cajas de luz de estudio delante de la pieza. Una cara de cromo
 * plana solo refleja una ventana estrecha del entorno: el panel alto, la franja negra
 * del horizonte y las tiras verticales son lo que se ve en ella.
 */
function studioEnvironment() {
  const room = new RoomEnvironment();
  const studio = new Group();
  studio.position.y = -room.position.y; // paneles en coordenadas del observador
  const plane = new PlaneGeometry(1, 1);
  const emissive = (value: number) =>
    new MeshBasicMaterial({ color: new Color().setScalar(value), side: DoubleSide });
  const panel = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z: number,
    material: MeshBasicMaterial,
  ) => {
    const mesh = new Mesh(plane, material);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    mesh.scale.set(x1 - x0, y1 - y0, 1);
    studio.add(mesh);
  };
  // Distancia 10: y = 10·tan(elevación). Ventana reflejada en reposo: ≈ −5° a −18°.
  panel(-10, 10, -1.65, 6.2, 10, emissive(2.3)); // caja alta: cara clara
  panel(-10, 10, -2.45, -1.65, 9.9, emissive(0)); // línea de horizonte negra
  panel(-10, 10, -10, -2.45, 10, emissive(1.05)); // suelo de estudio, más tenue
  const strip = emissive(9);
  panel(-5.9, -5.35, -9, 7, 9.7, strip); // tiras que cruzan al girar el entorno
  panel(5.35, 5.9, -9, 7, 9.7, strip);
  room.add(studio);
  return room;
}

export function createLook(
  renderer: WebGLRenderer,
  scene: Scene,
  options: { width: number; height: number; rim: number; sweep: number },
): Look {
  const pmrem = new PMREMGenerator(renderer);
  const room = studioEnvironment();
  const environment = pmrem.fromScene(room, 0.02);
  room.dispose();
  pmrem.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 1;

  // Cara: cromo claro con laca. Canto (bisel y paredes): acero algo más oscuro.
  const face = new MeshPhysicalMaterial({
    color: 0xf4f3f0,
    metalness: 1,
    roughness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  const edge = new MeshPhysicalMaterial({
    color: 0x9c9b97,
    metalness: 1,
    roughness: 0.22,
    clearcoat: 0.6,
    clearcoatRoughness: 0.14,
  });

  const { width: w } = options;
  // Luz principal: barre despacio de izquierda a derecha y enciende los biseles.
  const key = new DirectionalLight(0xffffff, 1.5);
  // Acento rojo rasante desde la derecha: solo biseles y cantos.
  const rim = new DirectionalLight(0xff2a3a, options.rim);
  rim.position.set(1.05 * w, -0.32 * w, 0.18 * w);
  // Contraluz frío muy suave para separar los cantos del fondo negro.
  const counter = new DirectionalLight(0xe6ebff, 0.5);
  counter.position.set(-1 * w, -0.2 * w, -0.45 * w);
  scene.add(key, rim, counter);

  const place = (phase: number) => {
    // Las tiras del entorno cruzan la cara cuando el giro pasa por ±0,3 rad.
    scene.environmentRotation.set(0, Math.sin(phase) * 0.52, 0);
    key.position.set(-Math.cos(phase) * 0.8 * w, 0.85 * w, 0.95 * w);
  };

  return {
    face,
    edge,
    animate(time) {
      place((time / options.sweep) * TAU - Math.PI / 2);
    },
    still() {
      place(-0.3);
    },
    dispose() {
      scene.remove(key, rim, counter);
      key.dispose();
      rim.dispose();
      counter.dispose();
      face.dispose();
      edge.dispose();
      scene.environment = null;
      environment.dispose();
    },
  };
}
