"use client";
import { useEffect, useRef, useState } from "react";
export function ChromeObject() {
  const host = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let disposed = false,
      frame = 0;
    let cleanup = () => {};
    const element = host.current;
    if (!element) return;
    void import("three")
      .then((THREE) => {
        if (disposed) return;
        try {
          const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "low-power",
          });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
          renderer.setClearColor(0x000000, 0);
          element.appendChild(renderer.domElement);
          const scene = new THREE.Scene(),
            camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
          camera.position.z = 7;
          const geometry = new THREE.TorusKnotGeometry(
            1.42,
            0.34,
            180,
            24,
            2,
            3,
          );
          const material = new THREE.MeshStandardMaterial({
            color: 0xd5e0d8,
            metalness: 0.65,
            roughness: 0.22,
          });
          const object = new THREE.Mesh(geometry, material);
          object.rotation.set(0.45, 0.2, -0.5);
          scene.add(object);
          scene.add(new THREE.AmbientLight(0xc5d6c8, 2));
          [
            [0xe8ff94, 9, 3, 3, 4],
            [0xffffff, 15, -3, 1, 2],
            [0x7162d9, 12, 0, -3, 1],
          ].forEach(([color, intensity, x, y, z]) => {
            const light = new THREE.PointLight(color, intensity, 20);
            light.position.set(x, y, z);
            scene.add(light);
          });
          const resize = () => {
            const { width, height } = element.getBoundingClientRect();
            renderer.setSize(width, height);
            camera.aspect = width / Math.max(height, 1);
            camera.updateProjectionMatrix();
            renderer.render(scene, camera);
          };
          const observer = new ResizeObserver(resize);
          observer.observe(element);
          resize();
          const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
          let visible = true;
          let scrollProgress = 0;
          const scroll = () => {
            scrollProgress = Math.min(
              window.scrollY / Math.max(element.clientHeight, 1),
              1,
            );
          };
          window.addEventListener("scroll", scroll, { passive: true });
          const intersection = new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting;
          });
          intersection.observe(element);
          const animate = () => {
            if (disposed) return;
            if (visible) {
              if (!motion.matches) {
                object.rotation.y += 0.003;
                object.rotation.z += 0.001;
                object.rotation.x = 0.45 + scrollProgress * 0.7;
                object.position.y = scrollProgress * 0.35;
              }
              renderer.render(scene, camera);
            }
            if (!motion.matches) frame = requestAnimationFrame(animate);
          };
          const preferenceChange = () => {
            cancelAnimationFrame(frame);
            animate();
          };
          motion.addEventListener("change", preferenceChange);
          animate();
          setLoaded(true);
          cleanup = () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            intersection.disconnect();
            window.removeEventListener("scroll", scroll);
            motion.removeEventListener("change", preferenceChange);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
            renderer.domElement.remove();
          };
        } catch {
          setLoaded(false);
        }
      })
      .catch(() => setLoaded(false));
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return (
    <div
      className={`chrome-object ${loaded ? "webgl-ready" : ""}`}
      aria-hidden="true"
    >
      <div className="chrome-fallback">
        <i />
        <i />
        <i />
      </div>
      <div className="webgl-host" ref={host} />
    </div>
  );
}
