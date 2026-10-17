import Link from "next/link";
import { Header, Footer } from "../components/shell";
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flow-page" id="main">
        <div className="success-panel">
          <p className="eyebrow">404 / FUERA DEL TRAZO</p>
          <h1>
            Este camino
            <br />
            <span className="serif">aún no existe.</span>
          </h1>
          <p>Vuelve al universo Elite para encontrar tu próxima experiencia.</p>
          <Link className="button" href="/">
            Volver al inicio ↗
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
