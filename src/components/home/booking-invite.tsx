import Link from "next/link";
import { EliteLogo } from "../brand/logos";
import { Icon } from "../icons";

const weekdays = ["L", "M", "M", "J", "V", "S", "D"];
/** Ilustración de agenda: días de muestra, sin fechas ni horarios reales. */
const days = Array.from({ length: 28 }, (_, i) => i + 1);
const chosen = 18;

export function HomeBookingInvite() {
  return (
    <section className="section home-book" aria-labelledby="home-book-title">
      <span className="elite-section-watermark" aria-hidden="true" />
      <div className="section-heading home-heading" data-anim="heading">
        <p className="eyebrow home-eyebrow">Tu momento empieza aquí</p>
        <h2 id="home-book-title" data-split>
          Haz espacio
          <br />
          <span className="serif">para ti.</span>
        </h2>
        <p className="section-note home-book-note">
          Elige servicio, profesional, día y hora en la agenda de Elite. Los
          tatuajes se solicitan aparte, con valoración previa.
        </p>
        <div className="button-row home-book-actions">
          <Link className="button button-accent button-large" href="/reservar">
            Reserva tu corte <Icon name="calendar" />
          </Link>
          <Link className="text-link" href="/tatuaje">
            Solicitar un tatuaje <Icon name="arrow" />
          </Link>
        </div>
      </div>

      <div className="home-book-scene" data-book-scene>
        <Link
          href="/reservar"
          className="home-book-calendar home-tilt"
          aria-label="Abrir el calendario de reservas"
          data-tilt="9"
        >
          <span className="home-book-sheet is-back" aria-hidden="true" />
          <span className="home-book-sheet is-mid" aria-hidden="true" />
          <span className="home-book-face" aria-hidden="true">
            <span className="home-glare" />
            <span className="home-book-top">
              <EliteLogo className="home-book-logo" />
              <span className="home-book-label">Tu espacio</span>
              <Icon name="calendar" />
            </span>
            <span className="home-book-weekdays">
              {weekdays.map((day, i) => (
                <span key={i}>{day}</span>
              ))}
            </span>
            <span className="home-book-days">
              {days.map((day) => (
                <span
                  key={day}
                  className={
                    day === chosen ? "is-chosen" : day < 8 ? "is-past" : undefined
                  }
                >
                  {day}
                </span>
              ))}
            </span>
            <span className="home-book-bottom">
              Un momento para renovar tu estilo
              <Icon name="arrow" />
            </span>
          </span>
          <span className="home-book-chip is-time" aria-hidden="true">
            <Icon name="clock" /> Elige tu hora
          </span>
          <span className="home-book-chip is-service" aria-hidden="true">
            <Icon name="scissors" /> Elige tu servicio
          </span>
        </Link>
      </div>
    </section>
  );
}
