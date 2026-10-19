"use client";
import { useLayoutEffect, useState } from "react";
import { DepthMark, SculptureStage } from "./three/sculpture-stage";
import { ELITE_BOX, ELITE_PATHS, ELITE_SPEC } from "./three/presets";
import type { SculptureSpec } from "./three/types";

const INTRO_SPEC: SculptureSpec = {
  ...ELITE_SPEC,
  fill: .8,
  exposure: 1.15,
  rim: 3,
  motion: {
    ...ELITE_SPEC.motion,
    rest: { pitch: .16, yaw: -.12 },
    intro: { kind: "rise", duration: .35, yaw: -.22, recede: .08 },
    sway: { yaw: .16, pitch: .03, period: 3 },
    scroll: null,
    sweep: 1.4,
  },
};

/** Presentación de 1,5 s por pestaña. No bloquea navegación ni carga recursos. */
export function BrandIntro() {
  const [visible, setVisible] = useState(true);
  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem("elite:intro:v3")) { setVisible(false); return; }
    } catch { /* Navegación privada: funciona sin persistencia. */ }
    const timeout = setTimeout(() => {
      try { sessionStorage.setItem("elite:intro:v3", "1"); } catch { /* Sin almacenamiento. */ }
      setVisible(false);
    }, 1500);
    return () => clearTimeout(timeout);
  }, []);
  if (!visible) return null;
  return <div className="elite-intro elite-intro-premium" aria-hidden="true">
    <div className="elite-intro-spot elite-intro-spot-left" />
    <div className="elite-intro-spot elite-intro-spot-right" />
    <div className="elite-intro-orbit" />
    <div className="elite-intro-stage">
      <SculptureStage spec={INTRO_SPEC} label="Elite en relieve metálico" className="elite-intro-sculpture">
        <DepthMark box={ELITE_BOX} paths={ELITE_PATHS} layers={10} />
      </SculptureStage>
      <span className="elite-intro-glint" />
      <span className="elite-intro-floor" />
    </div>
    <span className="elite-intro-caption">CARTAGENA · UNA FIRMA PROPIA</span>
    <span className="elite-intro-progress" />
  </div>;
}
