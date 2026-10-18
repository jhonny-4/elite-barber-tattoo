import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Enlace del QR de la fila. Por defecto apunta a `/turnos` en el origen actual;
 * para la presentación se puede fijar otro origen (IP local o dominio) desde la
 * tarjeta QR del panel. Se recuerda solo en este navegador.
 */
const STORAGE_KEY = "elite.queue.qr-url";

export function defaultQueueUrl() {
  return `${window.location.origin}/turnos`;
}

export function readQueueUrl() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function storeQueueUrl(url: string) {
  try {
    if (url) localStorage.setItem(STORAGE_KEY, url);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Sin almacenamiento: el enlace vale solo para esta visita. */
  }
}

export function validQueueUrl(url: string) {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

/** Genera el QR real (PNG en data URL) para un enlace http o https. */
export function useQrImage(url: string, width = 320) {
  const [image, setImage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    setImage("");
    if (!url) return;
    if (!validQueueUrl(url)) {
      setError("Escribe una URL http o https válida.");
      return;
    }
    QRCode.toDataURL(url, {
      width,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: "#111111", light: "#ffffff" },
    })
      .then((data) => {
        if (alive) {
          setImage(data);
          setError("");
        }
      })
      .catch(() => {
        if (alive) setError("No se pudo generar el QR.");
      });
    return () => {
      alive = false;
    };
  }, [url, width]);
  return { image, error };
}
