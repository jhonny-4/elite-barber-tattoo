import Link from "next/link";
export default function Page() {
  return (
    <main id="main" className="v4-public-page">
      <section className="v4-card">
        <h1>Sin conexión.</h1>
        <p>
          No se pueden confirmar reservas ni turnos hasta reconectar con el
          servidor demo.
        </p>
        <Link href="/" className="button">
          Volver a intentar
        </Link>
      </section>
    </main>
  );
}
