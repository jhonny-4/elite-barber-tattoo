const words = ["Elite", "Barbería", "Tattoo"] as const;

/** Una mitad de la pista: se repite lo suficiente para cubrir pantallas anchas. */
function Group() {
  return (
    <span className="home-marquee-group">
      {Array.from({ length: 6 }, (_, i) =>
        words.map((word) => (
          <span className="home-marquee-item" key={`${i}-${word}`}>
            {word}
            <span className="home-marquee-star">✦</span>
          </span>
        )),
      )}
    </span>
  );
}

/**
 * Dos bandas cruzadas que se desplazan en sentidos opuestos. Decorativas
 * (`aria-hidden`); el movimiento lo pone `HomeMotion` y se detiene con
 * movimiento reducido.
 */
export function HomeMarquee() {
  return (
    <div className="home-marquee" aria-hidden="true" data-marquee>
      <div className="home-marquee-band home-marquee-red" data-marquee-band="-1">
        <div className="home-marquee-track">
          <Group />
          <Group />
        </div>
      </div>
      <div className="home-marquee-band home-marquee-light" data-marquee-band="1">
        <div className="home-marquee-track">
          <Group />
          <Group />
        </div>
      </div>
    </div>
  );
}
