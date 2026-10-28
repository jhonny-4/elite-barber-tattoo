import Link from "next/link";
import type { ComponentProps } from "react";
import { Icon } from "../icons";
import { Odometer } from "../motion/odometer";
import { currency, services } from "../../domain/catalog";

type IconName = ComponentProps<typeof Icon>["name"];

const details: Record<string, { text: string; icon: IconName }> = {
  corte: { text: "Un nuevo look empieza en los detalles.", icon: "scissors" },
  "corte-barba": {
    text: "Corte y barba en una misma experiencia.",
    icon: "razor",
  },
  barba: { text: "Perfilado y arreglo de barba a tu medida.", icon: "beard" },
  cerquillos: { text: "Líneas limpias que marcan la diferencia.", icon: "comb" },
  ceja: { text: "Un toque preciso para enmarcar la mirada.", icon: "brow" },
  mascarilla: { text: "Una pausa para tu piel después del corte.", icon: "mask" },
  "limpieza-facial": { text: "Piel fresca y limpia en una sesión.", icon: "drop" },
  "limpieza-facial-profunda": { text: "Limpieza completa para renovar tu piel.", icon: "drops" },
};

function ServiceCard({
  href,
  index,
  icon,
  name,
  text,
  amount,
  unit,
  note,
  action,
  variant,
}: {
  href: string;
  index: string;
  icon: IconName;
  name: string;
  text: string;
  amount: string;
  unit?: string;
  note: string;
  action: string;
  variant?: "ink";
}) {
  return (
    <li className="home-card-slot" data-anim="card">
      <Link
        className={`home-service home-tilt${variant ? ` is-${variant}` : ""}`}
        href={href}
        data-tilt="7"
      >
        <span className="home-service-bg" aria-hidden="true">
          <span className="home-service-watermark">{index}</span>
        </span>
        <span className="home-glare" aria-hidden="true" />
        <span className="home-service-top" aria-hidden="true">
          <span className="home-service-index">{index}</span>
          <span className="home-service-icon">
            <Icon name={icon} />
          </span>
        </span>
        <h3 className="home-service-name">{name}</h3>
        <p className="home-service-text">{text}</p>
        <span className="home-service-price">
          <span className="home-service-amount">
            {/^\$/.test(amount) ? <Odometer value={amount} /> : amount}
            {unit ? <small>{unit}</small> : null}
          </span>
          <span className="home-service-note">{note}</span>
        </span>
        <span className="home-service-action">
          {action}
          <span className="home-service-arrow" aria-hidden="true">
            <Icon name="arrow" />
          </span>
        </span>
      </Link>
    </li>
  );
}

export function HomeServices() {
  return (
    <section
      className="section home-services"
      id="servicios"
      aria-labelledby="home-services-title"
    >
      <span className="elite-section-watermark" aria-hidden="true" />
      <header className="section-heading home-heading" data-anim="heading">
        <p className="eyebrow home-eyebrow">Servicios</p>
        <h2 id="home-services-title" data-split>
          El detalle
          <br />
          <span className="serif">lo cambia todo.</span>
        </h2>
        <p className="section-note">
          Barbería con intención. Tatuajes con identidad.
        </p>
      </header>

      <ul className="home-card-grid home-services-grid" role="list">
        {services.map((service, i) => (
          <ServiceCard
            key={service.id}
            href={`/reservar?servicio=${service.id}`}
            index={String(i + 1).padStart(2, "0")}
            icon={details[service.id]?.icon ?? "scissors"}
            name={service.name}
            text={details[service.id]?.text ?? "Barbería Elite."}
            amount={currency(service.priceCOP)}
            unit="COP"
            note="Precio"
            action="Reservar"
          />
        ))}
        <ServiceCard
          href="/tatuaje"
          index={String(services.length + 1).padStart(2, "0")}
          icon="needle"
          name="Tatuaje personalizado"
          text="Tu idea. El trazo de Jean Carlos."
          amount="A tu medida"
          note="Cotización según diseño"
          action="Solicitar valoración"
          variant="ink"
        />
      </ul>

      <p className="home-services-fineprint" data-anim="rise">
        Precios de referencia, sujetos a confirmación. Cada tatuaje se valora y
        cotiza de forma personal antes de agendar.
      </p>
    </section>
  );
}
