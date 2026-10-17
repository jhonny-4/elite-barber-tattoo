"use client";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./media";

/** Volumetric interpretation of the geometric Elite mark; original logo stays in the header. */
export function EliteSculpture() {
  const host = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let cleanup = () => {};
    void Promise.all([
      import("three"),
      import("three/addons/environments/RoomEnvironment.js"),
    ])
      .then(([T, { RoomEnvironment }]) => {
        if (disposed) return;
        try {
          const renderer = new T.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "low-power",
          });
          renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
          renderer.setClearColor(0, 0);
          renderer.toneMapping = T.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.3;
          element.appendChild(renderer.domElement);
          const scene = new T.Scene();
          const camera = new T.PerspectiveCamera(34, 1, 0.1, 100);
          camera.position.set(0, 0, 12.8);
          const environment = new RoomEnvironment();
          const pmrem = new T.PMREMGenerator(renderer);
          const env = pmrem.fromScene(environment, 0.04);
          scene.environment = env.texture;
          const group = new T.Group();
          scene.add(group);
          const material = new T.MeshStandardMaterial({
            color: 0xededed,
            metalness: 1,
            roughness: 0.22,
            envMapIntensity: 1.7,
          });
          const sideMaterial = new T.MeshStandardMaterial({
            color: 0x666666,
            metalness: 1,
            roughness: 0.28,
            envMapIntensity: 1.2,
          });
          const geometries: InstanceType<typeof T.ExtrudeGeometry>[] = [];
          const textures: InstanceType<typeof T.CanvasTexture>[] = [];
          const labelMaterials: InstanceType<typeof T.MeshBasicMaterial>[] = [];
          const planes: InstanceType<typeof T.PlaneGeometry>[] = [];
          const parts: {
            mesh: InstanceType<typeof T.Mesh>;
            x: number;
            y: number;
          }[] = [];
          function shape(points: number[][], x: number, y: number) {
            const s = new T.Shape();
            points.forEach(([px, py], i) => {
              if (i === 0) s.moveTo(px, py);
              else s.lineTo(px, py);
            });
            s.closePath();
            const geometry = new T.ExtrudeGeometry(s, {
              depth: 0.58,
              bevelEnabled: true,
              bevelThickness: 0.075,
              bevelSize: 0.055,
              bevelSegments: 3,
              steps: 1,
            });
            geometries.push(geometry);
            const mesh = new T.Mesh(geometry, [material, sideMaterial]);
            mesh.position.set(x, y, 0);
            group.add(mesh);
            parts.push({ mesh, x, y });
          }
          const rect = (w: number, h: number) => [
            [0, 0],
            [w, 0],
            [w, -h],
            [0, -h],
          ];
          const e = (w: number, h: number, t: number) => [
            [0, 0],
            [w, 0],
            [w, -t],
            [t, -t],
            [t, -h * 0.42],
            [w * 0.82, -h * 0.42],
            [w * 0.82, -h * 0.42 - t],
            [t, -h * 0.42 - t],
            [t, -h + t],
            [w, -h + t],
            [w, -h],
            [0, -h],
          ];
          shape(e(1.45, 1.75, 0.32), -3.95, 1.25);
          shape(
            [
              [0, 0],
              [0.37, 0],
              [0.37, -1.4],
              [1.4, -1.4],
              [1.4, -1.75],
              [0, -1.75],
            ],
            -1.95,
            1.25,
          );
          shape(rect(0.38, 1.75), 0.04, 1.25);
          shape(rect(3.45, 0.34), 0.85, 1.25);
          shape(
            [
              [0, 0],
              [1.5, 0],
              [1.5, -0.34],
              [0.94, -0.34],
              [0.94, -1.75],
              [0.56, -1.75],
              [0.56, -0.34],
              [0, -0.34],
            ],
            0.85,
            0.1,
          );
          shape(e(1.5, 1.75, 0.32), 2.8, 0.1);
          shape(rect(3.65, 0.33), -3.55, -1.07);
          function caption(text: string, x: number, y: number, width: number) {
            const canvas = document.createElement("canvas");
            canvas.width = 1024;
            canvas.height = 180;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.fillStyle = "#f4f4f4";
            ctx.font = "125px Georgia";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, 512, 96);
            const texture = new T.CanvasTexture(canvas);
            texture.colorSpace = T.SRGBColorSpace;
            textures.push(texture);
            const m = new T.MeshBasicMaterial({
              map: texture,
              transparent: true,
              depthWrite: false,
            });
            labelMaterials.push(m);
            const p = new T.PlaneGeometry(width, (width * 180) / 1024);
            planes.push(p);
            const mesh = new T.Mesh(p, m);
            mesh.position.set(x, y, 0.18);
            group.add(mesh);
          }
          caption("BARBER", 2.55, 1.89, 3.5);
          caption("TATTOO", -1.69, -1.91, 3.65);
          scene.add(new T.AmbientLight(0xffffff, 0.5));
          const light = new T.DirectionalLight(0xffffff, 4);
          light.position.set(-3, 4, 6);
          scene.add(light);
          let frame = 0,
            visible = true,
            pointerX = 0,
            pointerY = 0,
            progress = 0;
          const motion = matchMedia("(prefers-reduced-motion: reduce)");
          const start = performance.now();
          const resize = () => {
            const { width, height } = element.getBoundingClientRect();
            renderer.setSize(width, height);
            camera.aspect = width / Math.max(height, 1);
            camera.updateProjectionMatrix();
            group.scale.setScalar(Math.min(1, camera.aspect / 0.98));
            renderer.render(scene, camera);
          };
          const observer = new ResizeObserver(resize);
          observer.observe(element);
          resize();
          const intersection = new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting;
          });
          intersection.observe(element);
          const pointer = (event: PointerEvent) => {
            const box = element.getBoundingClientRect();
            pointerX = (event.clientX - box.left) / box.width - 0.5;
            pointerY = (event.clientY - box.top) / box.height - 0.5;
          };
          const leave = () => {
            pointerX = 0;
            pointerY = 0;
          };
          const scroll = () => {
            progress = Math.min(window.scrollY / 800, 1);
          };
          element.addEventListener("pointermove", pointer);
          element.addEventListener("pointerleave", leave);
          window.addEventListener("scroll", scroll, { passive: true });
          function render() {
            if (disposed) return;
            if (visible) {
              const t = (performance.now() - start) / 1000;
              parts.forEach(({ mesh, x, y }, index) => {
                const p = motion.matches
                  ? 1
                  : Math.min(1, Math.max(0, (t - index * 0.075) / 1.5));
                const ease = 1 - Math.pow(1 - p, 4);
                mesh.position.set(
                  x + (1 - ease) * (index % 2 ? 0.24 : -0.24),
                  y + (1 - ease) * 0.25,
                  (1 - ease) * (1.3 + index * 0.1),
                );
                mesh.rotation.y = (1 - ease) * 0.2;
              });
              light.position.x = motion.matches
                ? -3
                : -3 + Math.sin(t * 0.55) * 4;
              const targetY = motion.matches
                ? 0.22
                : 0.22 + Math.sin(t * 0.4) * 0.24 + pointerX * 0.4;
              const targetX = motion.matches
                ? -0.06
                : -0.08 - pointerY * 0.15 + progress * 0.12;
              group.rotation.y += (targetY - group.rotation.y) * 0.055;
              group.rotation.x += (targetX - group.rotation.x) * 0.055;
              group.rotation.z = -0.025;
              group.position.y = motion.matches ? 0 : Math.sin(t * 0.65) * 0.11;
              renderer.render(scene, camera);
            }
            if (!motion.matches) frame = requestAnimationFrame(render);
          }
          const preferenceChange = () => {
            cancelAnimationFrame(frame);
            render();
          };
          motion.addEventListener("change", preferenceChange);
          render();
          setLoaded(true);
          cleanup = () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            intersection.disconnect();
            element.removeEventListener("pointermove", pointer);
            element.removeEventListener("pointerleave", leave);
            window.removeEventListener("scroll", scroll);
            motion.removeEventListener("change", preferenceChange);
            geometries.forEach((g) => g.dispose());
            textures.forEach((t) => t.dispose());
            planes.forEach((p) => p.dispose());
            labelMaterials.forEach((m) => m.dispose());
            material.dispose();
            sideMaterial.dispose();
            env.dispose();
            environment.dispose();
            pmrem.dispose();
            renderer.dispose();
            renderer.domElement.remove();
          };
        } catch {
          if (!disposed) setLoaded(false);
        }
      })
      .catch(() => {
        if (!disposed) setLoaded(false);
      });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return (
    <div
      className={`elite-sculpture ${loaded ? "sculpture-ready" : ""}`}
      role="img"
      aria-label="Interpretación tridimensional del logo Elite Barber & Tattoo"
    >
      <div className="logo-fallback" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="logo-depth-layer">
            <Brand />
          </div>
        ))}
      </div>
      <div className="elite-webgl" ref={host} aria-hidden="true" />
    </div>
  );
}
