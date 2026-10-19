"use client";
import { useLayoutEffect, useState } from "react";
import { EliteLogo } from "./brand/logos";

/** Presentación de 1,5 s por pestaña. No bloquea navegación ni carga recursos. */
export function BrandIntro() {
  const [visible, setVisible] = useState(true);
  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem("elite:intro:v1")) { setVisible(false); return; }
      sessionStorage.setItem("elite:intro:v1", "1");
    } catch { /* Navegación privada: funciona sin persistencia. */ }
    const timeout = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(timeout);
  }, []);
  if (!visible) return null;
  return <div className="elite-intro" aria-hidden="true">
    <div className="elite-intro-orbit" />
    <div className="elite-intro-logo">
      {[0, 1, 2, 3].map(layer => <EliteLogo key={layer} style={{ transform: `translateZ(${layer * 4}px)` }} />)}
      <span className="elite-intro-glint" />
    </div>
    <span className="elite-intro-caption">CARTAGENA · UNA FIRMA PROPIA</span>
    <span className="elite-intro-progress" />
  </div>;
}
