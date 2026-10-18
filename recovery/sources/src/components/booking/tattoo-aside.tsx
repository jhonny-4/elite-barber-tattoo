import Link from "next/link";
import { artistInstagramUrl } from "../../domain/business";
import { Icon } from "../icons";
import { JCMark } from "../media";
import { TattooProcess } from "./tattoo-process";

/** Panel lateral de /tatuaje: firma de Jean Carlos y proceso de valoración. */
export function TattooAside() {
  return (
    <aside className="tt-aside" aria-labelledby="tt-aside-title">
      <div className="tt-aside-card on-light">
        <div className="tt-mark-wrap">
          <JCMark className="tt-mark" />
        </div>
        <p className="eyebrow">Jean Carlos · Tatuador de Elite</p>
        <h2 className="tt-aside-title" id="tt-aside-title">
          Arte con
          <br />
          <span className="serif">identidad.</span>
        </h2>
        <p className="tt-aside-text">
          El estudio revisa cada solicitud de forma manual: la idea, la zona y el
          tamaño definen la cotización.
        </p>
        <h3 className="tt-aside-sub">¿Qué pasa después?</h3>
        <TattooProcess />
        <p className="tt-aside-foot">
          Sin precios automáticos ni citas confirmadas en línea.
        </p>
        <a
          className="text-link"
          href={artistInstagramUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Portafolio en Instagram <Icon name="arrow" />
          <span className="visually-hidden"> (abre otra pestaña)</span>
        </a>
      </div>
      <Link className="bk-cross" href="/reservar">
        <span className="bk-cross-icon" aria-hidden="true">
          <Icon name="scissors" />
        </span>
        <span>
          <strong>¿Vienes por un corte?</strong>
          Las citas de barbería se reservan en línea con fecha y hora.
        </span>
        <Icon name="arrow" className="bk-cross-arrow" />
      </Link>
    </aside>
  );
}
