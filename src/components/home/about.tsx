import { SectionBrand } from "../media";
import { Icon } from "../icons";

/** Fragmentos del manifiesto: cada palabra se ilumina al avanzar (fallback: texto pleno). */
const manifesto: { text: string; tone?: "strong" | "serif" }[] = [
  { text: "Somos" },
  { text: "Elite Barber & Tattoo,", tone: "strong" },
  {
    text: "en Los Ejecutivos, Cartagena. Estilo en tu corte y arte que eliges llevar",
  },
  { text: "en la piel.", tone: "serif" },
];

const pillars = [
  {
    index: "01",
    icon: "scissors",
    title: "Barbería con identidad",
    text: "Explora cortes, barba, cejas y cuidado facial, elige tu profesional y encuentra un espacio en la agenda.",
  },
  {
    index: "02",
    icon: "needle",
    title: "El arte de Jean Carlos",
    text: "El tatuaje tiene su propio proceso: Jean Carlos recibe tu idea y tus referencias para valorar el diseño antes de cotizar.",
  },
  {
    index: "03",
    icon: "pin",
    title: "Un solo local en Cartagena",
    text: "Dos disciplinas, la misma marca: Elite. Barbería y tatuaje bajo el mismo techo, en Los Ejecutivos.",
  },
] as const;

export function HomeAbout() {
  return (
    <section
      className="section home-about"
      id="universo"
      aria-labelledby="home-about-title"
    >
      <span className="elite-section-watermark" aria-hidden="true" />
      <span className="home-about-ghost" aria-hidden="true" data-ghost>
        Elite
      </span>

      <header className="section-heading home-heading" data-anim="heading">
        <SectionBrand />
        <p className="eyebrow home-eyebrow">Quiénes somos</p>
        <h2 id="home-about-title" className="home-about-statement" data-split>
          No sigas el estilo.
          <br />
          <span className="serif">
            Hazlo tuyo<span className="dot">.</span>
          </span>
        </h2>
      </header>

      <p className="home-manifesto" data-lit>
        {manifesto.map((part) =>
          part.text.split(" ").map((word, i) => (
            <span
              className={`home-lit-word${part.tone ? ` is-${part.tone}` : ""}`}
              key={`${part.text}-${i}`}
            >
              {word}{" "}
            </span>
          )),
        )}
      </p>

      <details className="home-more"><summary>Conoce más de Elite <Icon name="plus" /></summary>
      <ul className="home-pillars" role="list">
        {pillars.map((pillar) => (
          <li className="home-pillar" key={pillar.index}>
            <span className="home-pillar-index">{pillar.index}</span>
            <span className="home-pillar-icon" aria-hidden="true">
              <Icon name={pillar.icon} />
            </span>
            <h3>{pillar.title}</h3>
            <p>{pillar.text}</p>
          </li>
        ))}
      </ul>
      </details>

      <div className="home-about-link" data-anim="rise">
        <a className="text-link" href="#galeria">
          Conoce nuestro trabajo <Icon name="arrow" />
        </a>
      </div>
    </section>
  );
}
