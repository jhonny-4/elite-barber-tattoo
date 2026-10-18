"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDemo } from "../lib/use-demo";
import { Icon } from "./icons";
import { JCMark } from "./media";
import {
  ContactInputs,
  validateContact,
  type ContactErrors,
  type ContactValue,
} from "./booking/contact-fields";
import { publicMessage } from "./booking/copy";
import { TattooAside } from "./booking/tattoo-aside";
import { TattooProcess } from "./booking/tattoo-process";

const maxBytes = 1024 * 1024;
const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const zones = ["Antebrazo", "Brazo", "Pierna", "Espalda", "Pecho", "Mano"];

type Fields = { idea: string; placement: string; size: string };
type Errors = ContactErrors &
  Partial<Record<keyof Fields | "consent" | "reference", string>>;
type Reference = { dataUrl: string; name: string; size: number };

const fieldOrder = ["idea", "placement", "size", "name", "phone", "consent"] as const;

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function validate(contact: ContactValue, fields: Fields, consent: boolean): Errors {
  const errors: Errors = validateContact(contact);
  const idea = fields.idea.trim();
  if (idea.length < 10)
    errors.idea = idea
      ? "Cuéntanos un poco más: la idea necesita al menos 10 caracteres."
      : "Describe tu idea (mínimo 10 caracteres).";
  if (!fields.placement.trim()) errors.placement = "Indica la zona del cuerpo.";
  if (!fields.size.trim()) errors.size = "Indica un tamaño aproximado.";
  if (!consent) errors.consent = "Marca la casilla para enviar la solicitud.";
  return errors;
}

export function TattooForm() {
  const demo = useDemo();
  const [contact, setContact] = useState<ContactValue>({ name: "", phone: "" });
  const [fields, setFields] = useState<Fields>({ idea: "", placement: "", size: "" });
  const [consent, setConsent] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [reference, setReference] = useState<Reference | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [sent, setSent] = useState<{
    placement: string;
    size: string;
    reference: Reference | null;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const readVersion = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  // Tras enviar (o empezar otra solicitud): foco en el título y bloque visible.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    headingRef.current?.focus({ preventScroll: true });
    const top = topRef.current?.getBoundingClientRect().top ?? 0;
    const header =
      document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
    if (top < header || top > window.innerHeight * 0.45) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top: Math.max(0, window.scrollY + top - header - 16),
        behavior: reduce ? "auto" : "smooth",
      });
    }
  }, [sent]);

  const offline = demo.ready && !demo.online;

  function revalidate(nextContact: ContactValue, nextFields: Fields, nextConsent: boolean) {
    if (attempted)
      setErrors((previous) => ({
        ...validate(nextContact, nextFields, nextConsent),
        reference: previous.reference,
      }));
  }

  function update(key: keyof Fields, value: string) {
    const next = { ...fields, [key]: value };
    setFields(next);
    revalidate(contact, next, consent);
  }

  async function choose(file: File | undefined) {
    if (!file) return;
    const version = ++readVersion.current;
    setErrors((previous) => ({ ...previous, reference: undefined }));
    if (!imageTypes.includes(file.type) || file.size > maxBytes) {
      setReading(false);
      setErrors((previous) => ({
        ...previous,
        reference: !imageTypes.includes(file.type)
          ? "Formato no admitido. Usa una imagen JPG, PNG o WebP."
          : `La imagen pesa ${formatBytes(file.size)} y el máximo es 1 MB. Prueba con una versión más ligera.`,
      }));
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setReading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new Error("No se pudo leer la imagen. Intenta de nuevo."));
        reader.readAsDataURL(file);
      });
      if (version === readVersion.current)
        setReference({ dataUrl, name: file.name.slice(0, 250), size: file.size });
    } catch (error) {
      if (version === readVersion.current)
        setErrors((previous) => ({ ...previous, reference: (error as Error).message }));
    } finally {
      if (version === readVersion.current) setReading(false);
    }
  }

  function removeReference() {
    readVersion.current++;
    setReading(false);
    setReference(null);
    setErrors((previous) => ({ ...previous, reference: undefined }));
    if (fileRef.current) {
      fileRef.current.value = "";
      fileRef.current.focus();
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || reading) return;
    setAttempted(true);
    const next = validate(contact, fields, consent);
    setErrors((previous) => ({ ...next, reference: previous.reference }));
    const first = fieldOrder.find((key) => next[key]);
    if (first) {
      document.getElementById(`tt-${first}`)?.focus();
      return;
    }
    setBusy(true);
    setSubmitError("");
    try {
      await demo.dispatch({
        type: "tattoo.create",
        input: {
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          idea: fields.idea.trim(),
          placement: fields.placement.trim(),
          size: fields.size.trim(),
          referenceName: reference?.name || null,
          ...(reference ? { referenceDataUrl: reference.dataUrl } : {}),
        },
      });
      moved.current = true;
      setSent({
        placement: fields.placement.trim(),
        size: fields.size.trim(),
        reference,
      });
    } catch (error) {
      setSubmitError(publicMessage((error as Error).message));
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    moved.current = true;
    setSent(null);
    setFields({ idea: "", placement: "", size: "" });
    setContact({ name: "", phone: "" });
    setConsent(false);
    setAttempted(false);
    setErrors({});
    setReference(null);
    setSubmitError("");
  }

  if (sent)
    return (
      <div className="tt tt-done" ref={topRef}>
        <section className="success-panel tt-success" aria-labelledby="tt-success-title">
          <span className="tt-success-mark" aria-hidden="true">
            <JCMark />
          </span>
          <p className="eyebrow">Solicitud recibida</p>
          <h2 id="tt-success-title" ref={headingRef} tabIndex={-1}>
            La idea está.
            <br />
            <span className="serif">El arte comienza.</span>
          </h2>
          <span className="status-badge" data-tone="pending">
            Pendiente de valoración
          </span>
          <p>
            Tu solicitud quedó registrada para que el estudio la revise
            manualmente. No es una cita confirmada ni tiene precio todavía:
            primero viene la valoración.
          </p>
          <dl className="tt-receipt">
            <div>
              <dt>Zona</dt>
              <dd>{sent.placement}</dd>
            </div>
            <div>
              <dt>Tamaño</dt>
              <dd>{sent.size}</dd>
            </div>
            <div>
              <dt>Referencia</dt>
              <dd>
                {sent.reference ? (
                  <span className="tt-receipt-ref">
                    <img src={sent.reference.dataUrl} alt="" />
                    Adjunta
                  </span>
                ) : (
                  "Sin referencia"
                )}
              </dd>
            </div>
            <div>
              <dt>Precio</dt>
              <dd>Se cotiza tras la valoración</dd>
            </div>
          </dl>
          <div className="tt-success-process">
            <h3>Lo que sigue</h3>
            <TattooProcess current={0} />
          </div>
          <p className="bk-honest">
            <Icon name="clock" />
            <span>
              Los avisos automáticos por WhatsApp o correo aún no están activos;
              el estudio revisa cada solicitud manualmente.
            </span>
          </p>
          <div className="button-row">
            <Link className="button" href="/jean-carlos">
              Conocer a Jean Carlos <Icon name="arrow" />
            </Link>
            <button type="button" className="button button-outline" onClick={startOver}>
              Otra solicitud <Icon name="plus" />
            </button>
          </div>
        </section>
      </div>
    );

  return (
    <div className="tt" ref={topRef}>
      <form className="tt-form" onSubmit={submit} noValidate>
        <header className="tt-form-head">
          <p className="eyebrow">Solicitud de valoración</p>
          <h2 ref={headingRef} tabIndex={-1}>
            Todo empieza
            <br />
            <span className="serif">con un trazo.</span>
          </h2>
          <p className="tt-form-lead">
            Cuéntanos tu idea con detalle. Cada tatuaje se cotiza según el diseño,
            después de la valoración.
          </p>
          <ul className="tt-facts" aria-label="Cómo funciona la solicitud">
            <li>
              <Icon name="check" /> Valoración manual
            </li>
            <li>
              <Icon name="check" /> Sin precio automático
            </li>
            <li>
              <Icon name="check" /> No reserva una cita
            </li>
          </ul>
        </header>

        {offline && (
          <div className="bk-offline" role="alert">
            <p>
              <strong>Sin conexión con el estudio.</strong>{" "}
              {publicMessage(demo.error) ||
                "No se pueden enviar solicitudes por ahora."}{" "}
              Lo que escribiste se conserva.
            </p>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={() => void demo.refresh()}
            >
              Reintentar
            </button>
          </div>
        )}

        <fieldset className="tt-section">
          <legend className="tt-legend">
            <span>01</span> Tu idea
          </legend>
          <div className="bk-field">
            <label htmlFor="tt-idea">
              ¿Qué te gustaría tatuarte?
              <textarea
                id="tt-idea"
                name="idea"
                rows={5}
                maxLength={3000}
                value={fields.idea}
                placeholder="Estilo, elementos, significado, si es una pieza nueva o un retoque…"
                aria-invalid={errors.idea ? true : undefined}
                aria-describedby={`tt-idea-hint${errors.idea ? " tt-idea-error" : ""}`}
                onChange={(event) => update("idea", event.target.value)}
              />
            </label>
            <div className="tt-field-foot">
              <span id="tt-idea-hint">
                Mínimo 10 caracteres. Cuantos más detalles, mejor la valoración.
              </span>
              <span className="tt-count" aria-hidden="true">
                {fields.idea.length}/3000
              </span>
            </div>
            {errors.idea && (
              <p id="tt-idea-error" className="inline-error bk-field-error">
                {errors.idea}
              </p>
            )}
          </div>
        </fieldset>

        <fieldset className="tt-section">
          <legend className="tt-legend">
            <span>02</span> Zona y tamaño
          </legend>
          <div className="tt-two">
            <div className="bk-field">
              <label htmlFor="tt-placement">
                Zona del cuerpo
                <input
                  id="tt-placement"
                  name="placement"
                  maxLength={100}
                  autoComplete="off"
                  placeholder="Ej. antebrazo"
                  value={fields.placement}
                  aria-invalid={errors.placement ? true : undefined}
                  aria-describedby={errors.placement ? "tt-placement-error" : undefined}
                  onChange={(event) => update("placement", event.target.value)}
                />
              </label>
              <div className="tt-chips" role="group" aria-label="Zonas frecuentes">
                {zones.map((zone) => (
                  <button
                    key={zone}
                    type="button"
                    className="chip"
                    aria-pressed={fields.placement === zone}
                    onClick={() => update("placement", zone)}
                  >
                    {zone}
                  </button>
                ))}
              </div>
              {errors.placement && (
                <p id="tt-placement-error" className="inline-error bk-field-error">
                  {errors.placement}
                </p>
              )}
            </div>
            <div className="bk-field">
              <label htmlFor="tt-size">
                Tamaño aproximado
                <input
                  id="tt-size"
                  name="size"
                  maxLength={100}
                  autoComplete="off"
                  placeholder="Ej. 10 × 15 cm"
                  value={fields.size}
                  aria-invalid={errors.size ? true : undefined}
                  aria-describedby={`tt-size-hint${errors.size ? " tt-size-error" : ""}`}
                  onChange={(event) => update("size", event.target.value)}
                />
              </label>
              <p className="tt-help" id="tt-size-hint">
                En centímetros, aunque sea aproximado.
              </p>
              {errors.size && (
                <p id="tt-size-error" className="inline-error bk-field-error">
                  {errors.size}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        <fieldset className="tt-section">
          <legend className="tt-legend">
            <span>03</span> Referencia <em>opcional</em>
          </legend>
          {reference && (
            <div className="tt-preview">
              <img src={reference.dataUrl} alt="Vista previa de tu referencia" />
              <span className="tt-preview-info">
                <strong>{reference.name}</strong>
                <span>{formatBytes(reference.size)} · lista para enviar</span>
              </span>
              <button
                type="button"
                className="button button-danger button-small"
                onClick={removeReference}
              >
                Quitar
                <span className="visually-hidden"> la referencia</span>
              </button>
            </div>
          )}
          <div
            className={[
              "tt-drop",
              dragging && "is-dragging",
              reference && "is-compact",
              errors.reference && "is-invalid",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDrop={() => setDragging(false)}
          >
            <input
              ref={fileRef}
              id="tt-reference"
              className="tt-file"
              type="file"
              name="reference"
              accept="image/jpeg,image/png,image/webp"
              aria-labelledby="tt-reference-title"
              aria-describedby={`tt-reference-hint${errors.reference ? " tt-reference-error" : ""}`}
              aria-invalid={errors.reference ? true : undefined}
              onChange={(event) => void choose(event.target.files?.[0])}
            />
            <span className="tt-drop-icon" aria-hidden="true">
              <Icon name="upload" />
            </span>
            <strong id="tt-reference-title">
              {reading
                ? "Leyendo imagen…"
                : reference
                  ? "Cambiar la referencia"
                  : "Añade una imagen de referencia"}
            </strong>
            <span id="tt-reference-hint">
              Arrastra o elige un archivo · JPG, PNG o WebP · hasta 1 MB
            </span>
          </div>
          {errors.reference && (
            <p id="tt-reference-error" className="inline-error bk-field-error" role="alert">
              {errors.reference}
            </p>
          )}
          <p className="tt-help">Usa una imagen de ejemplo, sin información privada.</p>
        </fieldset>

        <fieldset className="tt-section">
          <legend className="tt-legend">
            <span>04</span> Contacto
          </legend>
          <p className="bk-note">
            <Icon name="lock" />
            <span>
              Mientras la solicitud en línea está en pruebas, usa un nombre y un
              teléfono ficticios.
            </span>
          </p>
          <ContactInputs
            idPrefix="tt"
            value={contact}
            onChange={(next) => {
              setContact(next);
              revalidate(next, fields, consent);
            }}
            errors={errors}
          />
        </fieldset>

        <div className="bk-field tt-consent">
          <label className="checkbox-label" htmlFor="tt-consent">
            <input
              id="tt-consent"
              type="checkbox"
              checked={consent}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? "tt-consent-error" : undefined}
              onChange={(event) => {
                setConsent(event.target.checked);
                revalidate(contact, fields, event.target.checked);
              }}
            />
            <span>
              Entiendo que es una solicitud de valoración: no reserva una cita ni
              fija un precio. Usaré datos ficticios.
            </span>
          </label>
          {errors.consent && (
            <p id="tt-consent-error" className="inline-error bk-field-error">
              {errors.consent}
            </p>
          )}
        </div>

        {submitError && (
          <div className="inline-error bk-alert" role="alert" id="tt-submit-error">
            <span>{submitError}</span>
          </div>
        )}

        <div className="tt-actions">
          <button
            type="submit"
            className="button button-accent button-large"
            aria-busy={busy || undefined}
            aria-describedby={submitError ? "tt-submit-error" : undefined}
            disabled={reading || offline}
          >
            {busy ? "Enviando…" : reading ? "Leyendo referencia…" : "Enviar solicitud"}
            {!busy && <Icon name="arrow" />}
          </button>
        </div>
        <p className="form-disclaimer">
          Sin precio ni confirmación automática: el estudio revisa cada solicitud
          manualmente antes de cotizar y acordar una fecha contigo.
        </p>
      </form>
      <TattooAside />
    </div>
  );
}
