import type { PortfolioItem } from "../domain/media";
import { EliteLogo, JCMonogram } from "./brand/logos";
export function Photo({
  item,
  className = "",
  priority = false,
  fit = "cover",
  sizes = "(max-width: 760px) 92vw, 640px",
}: {
  item: PortfolioItem;
  className?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  /** Ancho visible estimado para elegir la variante del `srcSet`. */
  sizes?: string;
}) {
  if (item.original)
    return (
      <img
        className={`photo ${className}`}
        src={item.original}
        srcSet={item.srcSet}
        sizes={item.srcSet ? sizes : undefined}
        alt={item.title}
        width={item.crop[2]}
        height={item.crop[3]}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        style={{ objectPosition: item.position ?? "center", objectFit: fit }}
      />
    );
  return (
    <svg
      className={`photo ${className}`}
      viewBox={item.crop.join(" ")}
      preserveAspectRatio={
        fit === "contain" ? "xMidYMid meet" : "xMidYMid slice"
      }
      width={item.crop[2]}
      height={item.crop[3]}
      role="img"
      aria-label={`${item.title}.`}
    >
      <image
        href={item.source}
        width={item.sourceWidth}
        height={item.sourceHeight}
      />
    </svg>
  );
}
export function SectionBrand() {
  return (
    <div className="section-brand">
      <Brand />
      <span>
        ELITE BARBER & TATTOO<small>CARTAGENA · UNA FIRMA PROPIA</small>
      </span>
    </div>
  );
}
/** Logo Elite en vector. El color sale de `color` (blanco sobre fondos oscuros). */
export function Brand({
  className = "",
  title = "Elite Barber & Tattoo",
}: {
  className?: string;
  /** Pasa una cadena vacía cuando un enlace ya da el nombre accesible. */
  title?: string;
}) {
  return (
    <span className={`brand ${className}`}>
      <EliteLogo title={title || undefined} />
    </span>
  );
}
export function JCMark({ className = "" }: { className?: string }) {
  return (
    <JCMonogram
      className={`jc-mark ${className}`}
      title="Monograma JC de Jean Carlos"
    />
  );
}
