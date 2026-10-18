"use client";
import { useEffect, useId, useState } from "react";
import { Icon } from "../icons";
import {
  defaultQueueUrl,
  readQueueUrl,
  storeQueueUrl,
  useQrImage,
  validQueueUrl,
} from "./qr";

const LOCAL_HOST = /^https?:\/\/(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?=[:/]|$)/i;

function shortUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url;
  }
}

export function QrCard() {
  const [url, setUrl] = useState(""),
    [origin, setOrigin] = useState("");
  const uid = useId();
  useEffect(() => {
    const current = defaultQueueUrl();
    setOrigin(current);
    setUrl(readQueueUrl() || current);
  }, []);
  const { image, error } = useQrImage(url);
  const valid = validQueueUrl(url),
    custom = Boolean(origin && url && url !== origin),
    local = LOCAL_HOST.test(url);
  function change(value: string) {
    setUrl(value);
    // Se recuerda en este navegador para la pantalla de turnos y próximas visitas.
    storeQueueUrl(value && value !== origin ? value : "");
  }
  return (
    <section className="v4-card qr-card" aria-labelledby={`${uid}-title`}>
      <header className="qr-card-head">
        <p className="eyebrow">Acceso a la fila</p>
        <h3 id={`${uid}-title`}>
          Escanea. Elige. <span className="serif">Espera tu turno.</span>
        </h3>
      </header>
      <figure className="qr-frame">
        <div className="qr-code">
          <span className="qr-corners" aria-hidden="true" />
          {image ? (
            <img
              src={image}
              width={256}
              height={256}
              alt="Código QR para tomar turno en Elite Barber & Tattoo"
            />
          ) : (
            <span className="qr-placeholder">
              {error ? "QR no disponible" : "Generando QR…"}
            </span>
          )}
        </div>
        <figcaption>{valid ? shortUrl(url) : "Enlace pendiente"}</figcaption>
      </figure>
      <label className="qr-field">
        Enlace del QR
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          aria-describedby={`${uid}-help`}
          aria-invalid={url && !valid ? true : undefined}
          onChange={(event) => change(event.target.value)}
        />
      </label>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <p className="qr-help" id={`${uid}-help`}>
        {local
          ? "Este enlace usa localhost: solo abre en este computador. Para otro celular, usa la IP del computador en la misma red Wi-Fi o el dominio publicado."
          : "Para escanear desde otro celular, el enlace debe abrir en esa red: IP del computador en el mismo Wi-Fi o dominio publicado."}
      </p>
      <div className="qr-actions">
        <a
          className="button button-outline button-small"
          href={valid ? url : "/turnos"}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir registro <Icon name="arrow" />
          <span className="visually-hidden"> (abre otra pestaña)</span>
        </a>
        {image && (
          <a
            className="button button-outline button-small"
            href={image}
            download="elite-turnos-qr.png"
          >
            Descargar QR <Icon name="download" />
          </a>
        )}
        {custom && (
          <button
            type="button"
            className="text-link"
            onClick={() => change(origin)}
          >
            Usar este origen
          </button>
        )}
      </div>
    </section>
  );
}
