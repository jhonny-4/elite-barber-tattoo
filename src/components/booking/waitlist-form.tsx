"use client";
import { useId, useState } from "react";
import { Icon } from "../icons";
import { ContactInputs, validateContact, type ContactErrors, type ContactValue } from "./contact-fields";

/**
 * Lista de espera para un día sin horarios: avisa por correo si se libera un cupo.
 * La validación real vive en POST /api/espera; aquí solo se evita un viaje inútil.
 */
export function WaitlistForm({
  serviceSlug,
  barberSlug,
  date,
  dateLabel,
}: {
  serviceSlug: string;
  barberSlug: string;
  date: string;
  dateLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState<ContactValue>({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentFor, setSentFor] = useState("");
  const id = useId();
  const key = `${serviceSlug}|${barberSlug}|${date}`;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateContact(contact);
    setErrors(found);
    setError("");
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const response = await fetch("/api/espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceSlug, barberSlug, date, ...contact }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo guardar tu solicitud.");
      setSentFor(key);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sentFor === key)
    return (
      <p className="bk-reschedule-done" role="status">
        <Icon name="check" /> Listo. Si se libera un cupo el {dateLabel}, te escribimos por correo.
      </p>
    );
  if (!open)
    return (
      <button type="button" className="button button-accent button-small" onClick={() => setOpen(true)} aria-expanded="false" aria-controls={id}>
        <Icon name="bell" /> Avísame si se libera un cupo
      </button>
    );
  return (
    <form id={id} className="bk-waitlist surface" onSubmit={submit} noValidate aria-label="Lista de espera">
      <p className="bk-waitlist-lead">Déjanos tus datos y te avisamos por correo si alguien cancela el {dateLabel}.</p>
      <ContactInputs idPrefix={`wl-${id.replace(/:/g, "")}`} value={contact} onChange={setContact} errors={errors} />
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="bk-empty-actions">
        <button type="button" className="button button-outline button-small" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button type="submit" className="button button-small" disabled={busy} aria-busy={busy}>
          {busy ? "Guardando…" : "Anotarme"}
        </button>
      </div>
    </form>
  );
}
