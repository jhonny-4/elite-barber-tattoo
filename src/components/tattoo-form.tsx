"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { addTattooRequest } from "../domain/demo";
import { useDemo } from "../lib/use-demo";
import { ContactFields } from "./booking-flow";
import { Icon } from "./icons";
export function TattooForm() {
  const demo = useDemo();
  const [error, setError] = useState(""),
    [reading, setReading] = useState(false),
    [busy, setBusy] = useState(false),
    [complete, setComplete] = useState(false),
    [preview, setPreview] = useState(""),
    [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const readVersion = useRef(0);
  async function choose(file: File | undefined) {
    const version = ++readVersion.current;
    setReading(false);
    setError("");
    setPreview("");
    setFileName("");
    if (!file) {
      setReading(false);
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 1024 * 1024
    ) {
      setError(
        "Elige una referencia JPG, PNG o WebP de hasta 1 MB para la demo.",
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setReading(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new Error("No se pudo leer la imagen. Intenta de nuevo."));
        reader.readAsDataURL(file);
      });
      if (version === readVersion.current) {
        setPreview(data);
        setFileName(file.name);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (version === readVersion.current) setReading(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await demo.transact((state) =>
        addTattooRequest(state, {
          name: String(data.get("name") ?? ""),
          phone: String(data.get("phone") ?? ""),
          idea: String(data.get("idea") ?? ""),
          placement: String(data.get("placement") ?? ""),
          size: String(data.get("size") ?? ""),
          referenceName: fileName || null,
          ...(preview ? { referenceDataUrl: preview } : {}),
        }),
      );
      setComplete(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (complete)
    return (
      <div className="success-panel">
        <span className="success-icon">
          <Icon name="check" />
        </span>
        <p className="eyebrow">SOLICITUD DEMO REGISTRADA</p>
        <h2>
          La idea está.
          <br />
          <span className="serif">El arte comienza.</span>
        </h2>
        <p>
          Tu solicitud de ejemplo está pendiente de evaluación en el panel demo.
          No se ha enviado a Jean Carlos ni confirma una cita.
        </p>
        <div className="request-status">
          <span className="live-dot" /> Pendiente de evaluación
        </div>
        <Link className="button" href="/jean-carlos">
          Conocer al artista <Icon name="arrow" />
        </Link>
        <button
          className="text-link"
          onClick={() => {
            setComplete(false);
            setPreview("");
            setFileName("");
          }}
        >
          Crear otra solicitud demo <Icon name="plus" />
        </button>
      </div>
    );
  return (
    <form className="tattoo-form" onSubmit={submit}>
      <p className="eyebrow">TU IDEA, EN DETALLE</p>
      <h2>
        Todo empieza
        <br />
        <span className="serif">con un trazo.</span>
      </h2>
      <p className="muted">
        Comparte lo que imaginas. Cada tatuaje se cotiza según el diseño.
      </p>
      <p className="inline-error" role="alert">
        {error || demo.error}
      </p>
      <ContactFields />
      <label>
        ¿Qué te gustaría tatuarte?
        <textarea
          name="idea"
          required
          minLength={10}
          maxLength={3000}
          rows={4}
          placeholder="Cuéntanos la idea, sus detalles y lo que representa para ti…"
        />
      </label>
      <div className="field-row">
        <label>
          Zona del cuerpo
          <input
            name="placement"
            required
            maxLength={100}
            placeholder="Ej. antebrazo"
          />
        </label>
        <label>
          Tamaño aproximado
          <input
            name="size"
            required
            maxLength={100}
            placeholder="Ej. 10 × 15 cm"
          />
        </label>
      </div>
      <div className={`upload-area ${preview ? "has-reference" : ""}`}>
        <label htmlFor="reference">
          <Icon name="upload" />
          <strong>{fileName || "Añade una referencia"}</strong>
          <span>Opcional · JPG, PNG o WebP · hasta 1 MB</span>
        </label>
        <input
          ref={fileRef}
          id="reference"
          name="reference"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => void choose(e.target.files?.[0])}
        />
        {preview && (
          <div className="reference-preview">
            <img src={preview} alt="Referencia de tu solicitud demo" />
            <button
              type="button"
              className="icon-button"
              aria-label="Quitar referencia"
              onClick={() => {
                setPreview("");
                setFileName("");
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
      </div>
      <small className="muted">
        La referencia se guarda solo en este navegador. Usa una imagen de
        ejemplo sin información privada.
      </small>
      <label className="checkbox-label">
        <input type="checkbox" required /> Entiendo que es una solicitud de
        ejemplo y no confirma una cita.
      </label>
      <button className="button" disabled={busy || reading || !demo.ready}>
        {reading
          ? "Leyendo referencia…"
          : busy
            ? "Guardando…"
            : "Enviar solicitud demo"}
        <Icon name="arrow" />
      </button>
      <p className="form-disclaimer">
        Sin cobros ni envío de mensajes. En producción, Jean Carlos evaluará tu
        idea antes de cotizar y acordar una fecha.
      </p>
    </form>
  );
}
