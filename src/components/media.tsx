import type { PortfolioItem } from "../domain/media";
export function Photo({
  item,
  className = "",
  priority = false,
  fit = "cover",
}: {
  item: PortfolioItem;
  className?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
}) {
  if (item.original)
    return (
      <img
        className={`photo ${className}`}
        src={item.original}
        alt={item.title}
        loading={priority ? "eager" : "lazy"}
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
      aria-label={`${item.title}. Captura de referencia provisional.`}
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
export function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`brand ${className}`}>
      <svg
        viewBox="175 588 357 193"
        role="img"
        aria-label="Elite Barber & Tattoo"
      >
        <image
          href="/media/reference/elite-logo-source.jpeg"
          width="709"
          height="1536"
        />
      </svg>
    </span>
  );
}
export function JCMark() {
  return (
    <svg
      className="jc-mark"
      viewBox="12 700 1130 1255"
      role="img"
      aria-label="Monograma JC de Jean Carlos"
    >
      <image
        href="/media/reference/jc-logo-source.png"
        width="1290"
        height="2796"
      />
    </svg>
  );
}
