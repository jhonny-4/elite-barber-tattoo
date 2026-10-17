"use client";
import { useId, useRef } from "react";
export function ArtistMonogram() {
  const host = useRef<HTMLDivElement>(null);
  const id = useId();
  return (
    <div
      className="jc-sculpture"
      ref={host}
      onPointerMove={(event) => {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const box = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty(
          "--jc-x",
          `${-8 - ((event.clientY - box.top) / box.height) * 8}deg`,
        );
        event.currentTarget.style.setProperty(
          "--jc-y",
          `${-18 + ((event.clientX - box.left) / box.width) * 36}deg`,
        );
      }}
      onPointerLeave={() => {
        host.current?.style.removeProperty("--jc-x");
        host.current?.style.removeProperty("--jc-y");
      }}
    >
      <div className="jc-orbit orbit-one" aria-hidden="true" />
      <div className="jc-orbit orbit-two" aria-hidden="true" />
      <div
        className="jc-depth-stack"
        role="img"
        aria-label="Monograma JC en capas tridimensionales"
      >
        {Array.from({ length: 7 }, (_, i) => (
          <div
            className={`jc-depth-slice slice-${i}`}
            key={i}
            aria-hidden="true"
            style={{
              transform: `translateZ(${i * 3}px)`,
              filter: `brightness(${0.18 + i * 0.14})`,
            }}
          >
            <MetalFace id={`${id}-${i}`} />
          </div>
        ))}
      </div>
      <div className="jc-sculpture-label">
        <span>JEAN CARLOS</span>
        <small>TATTOO ARTIST / ELITE</small>
      </div>
      <div className="jc-studio-seal" aria-hidden="true">
        E
        <span>
          ELITE BARBER
          <br />& TATTOO
        </span>
      </div>
    </div>
  );
}
function MetalFace({ id }: { id: string }) {
  return (
    <svg className="jc-mark" viewBox="12 700 1130 1255" aria-hidden="true">
      <defs>
        <filter id={`${id}-alpha`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="luminanceToAlpha" />
        </filter>
        <mask
          id={`${id}-mask`}
          maskUnits="userSpaceOnUse"
          x="12"
          y="700"
          width="1130"
          height="1255"
          style={{ maskType: "alpha" }}
        >
          <image
            href="/media/reference/jc-logo-source.png"
            width="1290"
            height="2796"
            filter={`url(#${id}-alpha)`}
          />
        </mask>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a0a0a0" />
          <stop offset=".22" stopColor="#fff" />
          <stop offset=".42" stopColor="#d5d5d5" />
          <stop offset=".5" stopColor="#777" />
          <stop offset=".58" stopColor="#fafafa" />
          <stop offset=".8" stopColor="#b5b5b5" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
      </defs>
      <rect
        x="12"
        y="700"
        width="1130"
        height="1255"
        mask={`url(#${id}-mask)`}
        fill={`url(#${id}-metal)`}
      />
    </svg>
  );
}
