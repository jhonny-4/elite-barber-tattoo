import { publicReviews } from "../../server/reviews";

const Stars = ({ value }: { value: number }) => (
  <span className="rv-stars" role="img" aria-label={`${value} de 5 estrellas`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={n <= Math.round(value) ? "is-on" : ""} aria-hidden="true">★</span>
    ))}
  </span>
);

/** Reseñas reales aprobadas por el dueño. Sin reseñas no se muestra la sección. */
export async function HomeReviews() {
  const reviews = await publicReviews(9);
  if (!reviews.length) return null;
  const average = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
  return (
    <section className="section home-reviews" id="resenas" aria-labelledby="home-reviews-title">
      <span className="elite-section-watermark" aria-hidden="true" />
      <header className="section-heading home-heading" data-anim="heading">
        <p className="eyebrow home-eyebrow">Reseñas</p>
        <h2 id="home-reviews-title" data-split>
          Lo dicen
          <br />
          <span className="serif">nuestros clientes.</span>
        </h2>
        <p className="rv-average">
          <strong>{average.toFixed(1)}</strong>
          <Stars value={average} />
          <span>{reviews.length} {reviews.length === 1 ? "reseña verificada" : "reseñas verificadas"}</span>
        </p>
      </header>
      <ul className="home-card-grid rv-grid" role="list">
        {reviews.map((r) => (
          <li key={r.id} className="home-card-slot" data-anim="card">
            <article className="rv-card home-tilt" data-tilt="6">
              <span className="home-glare" aria-hidden="true" />
              <Stars value={r.rating} />
              {r.comment && <p className="rv-text">“{r.comment}”</p>}
              <p className="rv-meta">
                <strong>{r.author}</strong> · con {r.barber}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
