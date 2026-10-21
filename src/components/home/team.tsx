import Link from "next/link";
import { EliteLogo } from "../brand/logos";
import { Icon } from "../icons";
import { barbers } from "../../domain/catalog";

/** Nombres confirmados por el negocio; los retratos aún no se han proporcionado. */
export function HomeTeam() {
  return (
    <section
      className="section home-team"
      id="equipo"
      aria-labelledby="home-team-title"
    >
      <span className="elite-section-watermark" aria-hidden="true" />
      <header className="section-heading home-heading" data-anim="heading">
        <p className="eyebrow home-eyebrow">Equipo de barbería</p>
        <h2 id="home-team-title" data-split>
          Elige quién
          <br />
          <span className="serif">define tu estilo.</span>
        </h2>
        <p className="section-note">
          El equipo de Elite, listo para darle forma a tu próximo corte.
        </p>
      </header>

      <ul className="home-card-grid home-team-grid" role="list">
        {barbers.map((barber, i) => (
          <li className="home-card-slot" key={barber.id} data-anim="card">
            <Link
              className="home-member home-tilt"
              href={`/reservar?profesional=${barber.slug}`}
              data-tilt="6"
            >
              <span className="home-glare" aria-hidden="true" />
              <span className="home-member-portrait" aria-hidden="true">
                <EliteLogo className="home-member-logo" />
                <span className="home-member-monogram">E{i + 1}</span>
                <span className="home-member-soon">Retrato próximamente</span>
              </span>
              <span className="home-member-info">
                <h3 className="home-member-name">{barber.name}</h3>
                <span className="home-member-role">
                  Barbero · Elite
                </span>
              </span>
              <span className="home-member-action">
                Reservar con {barber.name}
                <Icon name="arrow" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
