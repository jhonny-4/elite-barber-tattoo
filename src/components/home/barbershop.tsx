import Link from "next/link";
import { Photo, SectionBrand } from "../media";
import { Icon } from "../icons";
import { portfolio } from "../../domain/media";
import { currency, services } from "../../domain/catalog";

/** Las dos fotos de cortes seleccionadas, completas y en marcos flotantes. */
const photos = portfolio.filter((item) => item.category === "barberia").slice(0, 2).reverse();

export function HomeBarbershop() {
  return (
    <section
      className="section home-shop on-light"
      aria-labelledby="home-shop-title"
    >
      <header className="section-heading home-heading" data-anim="heading">
        <SectionBrand />
        <p className="eyebrow home-eyebrow">Nuestra barbería</p>
        <h2 id="home-shop-title" data-split>
          Un buen corte.
          <br />
          <span className="serif">Tu sello personal.</span>
        </h2>
      </header>

      <div className="home-shop-duo">
        {photos.map((item, i) => (
          <figure
            className="home-shop-frame"
            key={item.id}
            data-parallax={i === 0 ? "-6" : "8"}
          >
            <div className="home-shop-card" data-anim="photo">
              <div className="home-shop-plate">
                <div className="home-shop-photo">
                  <Photo
                    item={item}
                    fit="contain"
                    sizes="(max-width: 700px) 88vw, (max-width: 1100px) 44vw, 500px"
                  />
                </div>
                <figcaption className="home-shop-caption">
                  <span>{item.title}</span>
                  <small>{item.subtitle}</small>
                </figcaption>
              </div>
            </div>
          </figure>
        ))}
      </div>

      <div className="home-shop-copy" data-anim="rise">
        <p className="home-shop-lead">
          En Elite, barbería y estilo van de la mano. Elige un corte para
          renovar tu imagen o combina corte y barba en una misma experiencia.
        </p>
        <p className="home-shop-text">
          Escoge servicio, profesional y horario desde la web. El portafolio
          reúne trabajos del negocio para que explores la forma, la textura y
          los detalles antes de elegir.
        </p>
        <ul className="home-shop-tags" role="list">
          {services.map((service) => (
            <li key={service.id}>
              <span>{service.name}</span>
              <b>{currency(service.priceCOP)}</b>
            </li>
          ))}
        </ul>
        <p className="home-shop-fineprint">
          Precios de referencia, sujetos a confirmación.
        </p>
        <div className="button-row">
          <Link className="button button-accent" href="/reservar">
            Reserva en Elite <Icon name="arrow" />
          </Link>
          <a className="text-link" href="#equipo">
            Conoce al equipo <Icon name="arrow" />
          </a>
        </div>
      </div>
    </section>
  );
}
