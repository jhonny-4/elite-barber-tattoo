"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
export function QrCard() {
  const [url, setUrl] = useState(""),
    [image, setImage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => setUrl(`${window.location.origin}/turnos`), []);
  useEffect(() => {
    let alive = true;
    setImage("");
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      QRCode.toDataURL(url, {
        width: 320,
        margin: 3,
        errorCorrectionLevel: "M",
        color: { dark: "#111111", light: "#ffffff" },
      })
        .then((image) => {
          if (alive) {
            setImage(image);
            setError("");
          }
        })
        .catch(() => {
          if (alive) setError("No se pudo generar el QR.");
        });
    } catch {
      setError("Escribe una URL http o https válida.");
    }
    return () => {
      alive = false;
    };
  }, [url]);
  return (
    <section className="v4-card qr-card">
      <p className="eyebrow">ELITE / ACCESO A LA FILA</p>
      <h3>Escanea. Elige. Espera tu turno.</h3>
      {image && (
        <img
          src={image}
          width={256}
          height={256}
          alt="Código QR para registrarse en la fila demo"
        />
      )}
      <label>
        Enlace del QR
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <p>
        Para otro celular, usa la IP del computador y el mismo Wi-Fi. Un QR con
        localhost solo funciona en el computador.
      </p>
      {error && <p role="alert">{error}</p>}
      <a
        className="button button-outline"
        href={url || "/turnos"}
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir fila demo ↗
      </a>
    </section>
  );
}
