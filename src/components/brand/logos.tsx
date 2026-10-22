import type { SVGProps } from "react";
import { brandGlyphs, eliteLogo, jcMonogram, jcWordmark } from "./logo-data";

type LogoProps = Omit<SVGProps<SVGSVGElement>, "viewBox"> & {
  /** Texto accesible. Si se omite, el logo se trata como decorativo. */
  title?: string;
};

function a11y(title?: string) {
  return title
    ? ({ role: "img", "aria-label": title } as const)
    : ({ "aria-hidden": true, focusable: false } as const);
}

/** Logo Elite Barber & Tattoo en vector; hereda el color de `currentColor`. */
export function EliteLogo({ title, ...props }: LogoProps) {
  return (
    <svg
      viewBox={`0 0 ${eliteLogo.width} ${eliteLogo.height}`}
      fill="currentColor"
      {...a11y(title)}
      {...props}
    >
      <path d={eliteLogo.geo} />
      <path d={eliteLogo.serif} fillRule="evenodd" />
    </svg>
  );
}

/** Monograma JC de Jean Carlos en vector; hereda el color de `currentColor`. */
export function JCMonogram({ title, ...props }: LogoProps) {
  return (
    <svg
      viewBox={`0 0 ${jcMonogram.width} ${jcMonogram.height}`}
      fill="currentColor"
      {...a11y(title)}
      {...props}
    >
      <path d={jcMonogram.d} fillRule="evenodd" />
    </svg>
  );
}

/** Firma «Jean Carlos» en letra gótica (vector del original); hereda `currentColor`. */
export function JCWordmark({ title, ...props }: LogoProps) {
  return (
    <svg
      viewBox={`0 0 ${jcWordmark.width} ${jcWordmark.height}`}
      fill="currentColor"
      {...a11y(title)}
      {...props}
    >
      <path d={jcWordmark.d} fillRule="evenodd" />
    </svg>
  );
}

/** Glifo oficial de WhatsApp o Instagram (decorativo; el texto del botón da el nombre). */
export function BrandGlyph({
  name,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "viewBox"> & {
  name: keyof typeof brandGlyphs;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={brandGlyphs[name]} />
    </svg>
  );
}
