"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { barbers, currency, services } from "../domain/catalog";
import { todayBogota, type Booking } from "../domain/demo";
import {
  bookingHorizonDays,
  parseDate,
  prettyDate,
  shiftDate,
} from "../domain/availability";
import { whatsappUrl } from "../domain/business";
import { useDemo } from "../lib/use-demo";
import { Calendar, type CalendarDayStatus } from "./calendar";
import { Icon } from "./icons";
import { BrandGlyph } from "./brand/logos";
import {
  ANY_BARBER,
  barberUnavailable,
  dayView,
  nextAvailable,
  slotsFor,
} from "./booking/availability-view";
import {
  ContactInputs,
  validateContact,
  type ContactErrors,
  type ContactValue,
} from "./booking/contact-fields";
import { publicMessage, shortDate, type StepId } from "./booking/copy";
import { BookingProgress } from "./booking/progress";
import {
  BookingSummary,
  CompactSummary,
  ReviewTicket,
  type SummaryData,
} from "./booking/summary";
import { TimeSlots } from "./booking/time-slots";
import { BookingArrival } from "./booking/arrival";

type Errors = ContactErrors & { consent?: string };

const anyProfessional = { id: ANY_BARBER, name: "Primer disponible" };
const consentError = "Marca la casilla para continuar.";
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const longDate = (date: string) => (date ? capitalize(prettyDate(date)) : "");

function whenLabel(next: { date: string; time: string }, today: string) {
  if (next.date === today) return `hoy, ${next.time}`;
  if (next.date === shiftDate(today, 1)) return `mañana, ${next.time}`;
  return `${shortDate(parseDate(next.date))}, ${next.time}`;
}

function StepHead({
  step,
  eyebrow,
  title,
  accent,
  lead,
  headingRef,
}: {
  step: StepId;
  eyebrow: string;
  title: string;
  accent: string;
  lead?: React.ReactNode;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <header className="bk-step-head">
      <p className="eyebrow">
        Paso 0{step} · {eyebrow}
      </p>
      <h2 ref={headingRef} tabIndex={-1}>
        <span className="visually-hidden">Paso {step} de 4: </span>
        {title}
        <br />
        <span className="serif">{accent}</span>
      </h2>
      {lead && <p className="bk-step-lead">{lead}</p>}
    </header>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="button button-outline bk-back" onClick={onClick}>
      <Icon name="chevron" className="bk-back-icon" />
      <span className="bk-back-label">Atrás</span>
    </button>
  );
}

export function BookingFlow() {
  const params = useSearchParams();
  const demo = useDemo();
  const presencial = params.get("origen") === "presencial";
  const [serviceId, setServiceId] = useState<string>(
    () => services.find((s) => s.id === params.get("servicio"))?.id ?? services[0].id,
  );
  const [barberId, setBarberId] = useState<string>(
    () => barbers.find((b) => b.id === params.get("profesional"))?.id ?? ANY_BARBER,
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [today, setToday] = useState("");
  const [clock, setClock] = useState(0);
  const [step, setStep] = useState<StepId>(1);
  const [contact, setContact] = useState<ContactValue>({ name: "", phone: "" });
  const [consent, setConsent] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [stepError, setStepError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Booking | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    const now = todayBogota();
    setToday(now);
    setDate(shiftDate(now, 1));
    setClock(Date.now());
    const tick = setInterval(() => {
      setToday(todayBogota());
      setClock(Date.now());
    }, 30000);
    return () => clearInterval(tick);
  }, []);

  // Al cambiar de paso: foco en el título del paso y bloque visible bajo la cabecera.
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
  }, [step, result]);

  const state = demo.state;
  const service = services.find((s) => s.id === serviceId) ?? services[0];
  const professional =
    barberId === ANY_BARBER
      ? anyProfessional
      : (barbers.find((b) => b.id === barberId) ?? anyProfessional);

  const slots = useMemo(
    () => slotsFor(state, barberId, serviceId, date, clock),
    [state, barberId, serviceId, date, clock],
  );
  const selectedAvailable = slots.some((s) => s.time === time && s.available);

  // Estado de cada día del periodo reservable (hoy + 60 días) para el calendario.
  const dayStatuses = useMemo(() => {
    const statuses = new Map<string, CalendarDayStatus>();
    if (!today || !clock) return statuses;
    const last = shiftDate(today, bookingHorizonDays);
    for (let day = today; day <= last; day = shiftDate(day, 1))
      statuses.set(day, dayView(state, barberId, serviceId, day, today, clock));
    return statuses;
  }, [state, barberId, serviceId, today, clock]);
  const dayStatus = useCallback(
    (day: string): CalendarDayStatus =>
      dayStatuses.get(day) ?? { available: false, reason: "Fuera del periodo de reserva" },
    [dayStatuses],
  );

  const nextFree = useMemo(() => {
    if (!date || !today || !clock || slots.some((s) => s.available)) return null;
    return (
      nextAvailable(state, barberId, serviceId, shiftDate(date, 1), today, clock) ??
      nextAvailable(state, barberId, serviceId, today, today, clock)
    );
  }, [state, barberId, serviceId, date, today, clock, slots]);

  const nextByProfessional = useMemo(() => {
    const next: Record<string, { date: string; time: string } | null> = {};
    if (!today || !clock) return next;
    for (const p of [anyProfessional, ...barbers])
      next[p.id] = nextAvailable(state, p.id, serviceId, today, today, clock);
    return next;
  }, [state, serviceId, today, clock]);

  function go(next: StepId) {
    moved.current = true;
    setStepError("");
    setSubmitError("");
    setStep(next);
  }

  function pickService(id: string) {
    setServiceId(id);
    setTime("");
    setStepError("");
  }

  function pickBarber(id: string) {
    setBarberId(id);
    setTime("");
    setStepError("");
  }

  function pickDate(day: string) {
    setDate(day);
    setTime("");
    setStepError("");
  }

  function continueFromService() {
    if (barberUnavailable(state, barberId)) {
      setStepError(
        "Ese profesional no está disponible por ahora. Elige otro o «Primer disponible».",
      );
      return;
    }
    go(2);
  }

  function continueFromDate() {
    if (!time) {
      setStepError("Elige una hora disponible para continuar.");
      return;
    }
    if (!selectedAvailable) {
      setStepError("Esa hora ya no está disponible. Elige otra.");
      return;
    }
    go(3);
  }

  function updateContact(next: ContactValue) {
    setContact(next);
    if (attempted)
      setErrors((previous) => ({ ...validateContact(next), consent: previous.consent }));
  }

  function updateConsent(checked: boolean) {
    setConsent(checked);
    if (attempted)
      setErrors((previous) => ({
        ...previous,
        consent: checked ? undefined : consentError,
      }));
  }

  function continueFromContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const next: Errors = validateContact(contact);
    if (!consent) next.consent = consentError;
    setErrors(next);
    const first = (["name", "phone", "consent"] as const).find((key) => next[key]);
    if (first) {
      document.getElementById(`bk-${first}`)?.focus();
      return;
    }
    if (!selectedAvailable) {
      setStepError(
        "La hora elegida dejó de estar disponible. Vuelve al paso 2 para elegir otra.",
      );
      return;
    }
    go(4);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!selectedAvailable) {
      setSubmitError("Esa hora dejó de estar disponible. Elige otra en el paso 2.");
      return;
    }
    setBusy(true);
    setSubmitError("");
    try {
      const saved = await demo.dispatch({
        type: "booking.create",
        input: {
          barberId,
          serviceId,
          date,
          time,
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          source: presencial ? "presencial" : "online",
        },
      });
      const booking = saved.state.bookings.find((b) => b.id === saved.resultId);
      if (!booking)
        throw new Error(
          "La agenda no devolvió la cita guardada. Revisa la conexión y vuelve a intentarlo.",
        );
      moved.current = true;
      setResult(booking);
    } catch (error) {
      setSubmitError(publicMessage((error as Error).message));
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    moved.current = true;
    setResult(null);
    setTime("");
    setContact({ name: "", phone: "" });
    setConsent(false);
    setAttempted(false);
    setErrors({});
    setSubmitError("");
    setStepError("");
    setStep(1);
  }

  const summary: SummaryData = {
    service: service.name,
    duration: service.demoDurationMinutes,
    price: service.priceCOP,
    professional: professional.name,
    professionalNote:
      barberId === ANY_BARBER ? "Se asigna al confirmar" : "Perfil provisional",
    date: longDate(date),
    time: selectedAvailable ? time : "",
    presencial,
  };

  if (result) {
    const booked = services.find((s) => s.id === result.serviceId) ?? service;
    const assigned = barbers.find((b) => b.id === result.barberId);
    const reference = result.id.slice(0, 8).toUpperCase();
    return (
      <div className="bk bk-done" ref={topRef}>
        <section className="success-panel bk-success" aria-labelledby="bk-success-title">
          <span className="bk-seal" aria-hidden="true">
            <Icon name="check" />
          </span>
          <p className="eyebrow">Reserva registrada</p>
          <h2 id="bk-success-title" ref={headingRef} tabIndex={-1}>
            Te esperamos
            <br />
            <span className="serif">en Elite.</span>
          </h2>
          <p>
            Tu cita quedó guardada en la agenda de la barbería. Conserva el
            código de referencia por si necesitas consultarla.
          </p>
          <ReviewTicket
            reference={reference}
            contact={{ name: result.name, phone: result.phone }}
            data={{
              ...summary,
              service: booked.name,
              duration: booked.demoDurationMinutes,
              price: booked.priceCOP,
              professional: assigned?.name ?? summary.professional,
              professionalNote:
                barberId === ANY_BARBER
                  ? "Asignado automáticamente"
                  : "Perfil provisional",
              date: longDate(result.date),
              time: result.time,
            }}
          />
          <div className="bk-next">
            <BookingArrival id={result.id} />
            <h3>Siguientes pasos</h3>
            <ol>
              <li>
                <span>Tu cita ya aparece en la agenda del equipo de Elite.</span>
              </li>
              <li>
                <span>
                  ¿Necesitas cambiarla o cancelarla? Escríbenos por WhatsApp con
                  tu código <b>{reference}</b>.
                </span>
              </li>
              <li>
                <span>
                  Te esperamos en el local el {longDate(result.date).toLowerCase()} a
                  las {result.time}.
                </span>
              </li>
            </ol>
          </div>
          <p className="bk-honest">
            <Icon name="clock" />
            <span>
              La confirmación automática por WhatsApp o correo aún no está
              activa. No se realizó ningún cobro.
            </span>
          </p>
          <div className="button-row bk-success-actions">
            <Link className="button" href="/">
              Volver al inicio <Icon name="arrow" />
            </Link>
            <a
              className="button button-whatsapp"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="button-glyph">
                <BrandGlyph name="whatsapp" />
              </span>
              WhatsApp
              <span className="visually-hidden"> (abre otra pestaña)</span>
            </a>
            <button type="button" className="button button-outline" onClick={startOver}>
              Otra reserva <Icon name="plus" />
            </button>
          </div>
          <Link className="text-link bk-team-link" href="/administracion?tab=citas">
            Ver en el panel del equipo <Icon name="grid" />
          </Link>
        </section>
      </div>
    );
  }

  const dayInfo = date && today ? dayStatus(date) : null;
  const offline = demo.ready && !demo.online;

  return (
    <div className="bk" ref={topRef}>
      <BookingProgress step={step} onGo={go} />
      <div className="bk-body">
        <div className="bk-main">
          <CompactSummary data={summary} />
          {offline && (
            <div className="bk-offline" role="alert">
              <p>
                <strong>Sin conexión con la agenda.</strong>{" "}
                {publicMessage(demo.error) ||
                  "No se pueden confirmar operaciones por ahora."}{" "}
                Tus datos se conservan en esta pantalla.
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
          <div className="bk-panel">
            {step === 1 && (
              <section className="bk-step">
                <StepHead
                  step={1}
                  eyebrow="Servicio"
                  title="Elige tu"
                  accent="experiencia."
                  lead="Selecciona el servicio y quién te atiende. Los precios son de referencia."
                  headingRef={headingRef}
                />
                <fieldset className="bk-fieldset">
                  <legend className="bk-legend">Servicio</legend>
                  <div className="bk-options bk-options-services">
                    {services.map((s) => (
                      <label
                        key={s.id}
                        className={`bk-card bk-service${s.id === serviceId ? " is-selected" : ""}`}
                      >
                        <input
                          className="bk-radio"
                          type="radio"
                          name="bk-service"
                          value={s.id}
                          checked={s.id === serviceId}
                          onChange={() => pickService(s.id)}
                        />
                        <span className="bk-card-icon" aria-hidden="true">
                          <Icon name="scissors" />
                        </span>
                        <span className="bk-card-body">
                          <strong className="bk-card-title">{s.name}</strong>
                          <span className="bk-card-meta">
                            <Icon name="clock" /> {s.demoDurationMinutes} min aprox.
                          </span>
                        </span>
                        <span className="bk-card-price">
                          <small>Precio de referencia</small>
                          <b>{currency(s.priceCOP)}</b>
                        </span>
                        <span className="bk-card-check" aria-hidden="true">
                          <Icon name="check" />
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="bk-fieldset">
                  <legend className="bk-legend">Profesional</legend>
                  <div className="bk-options bk-options-pros">
                    {[anyProfessional, ...barbers].map((p) => {
                      const unavailable = barberUnavailable(state, p.id);
                      const next = nextByProfessional[p.id];
                      const index = barbers.findIndex((b) => b.id === p.id);
                      const noteId = `bk-pro-${p.id}`;
                      return (
                        <label
                          key={p.id}
                          className={[
                            "bk-card bk-pro",
                            p.id === barberId && "is-selected",
                            unavailable && "is-disabled",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <input
                            className="bk-radio"
                            type="radio"
                            name="bk-professional"
                            value={p.id}
                            checked={p.id === barberId}
                            disabled={unavailable}
                            aria-describedby={noteId}
                            onChange={() => pickBarber(p.id)}
                          />
                          <span className="bk-pro-avatar" aria-hidden="true">
                            {index < 0 ? <Icon name="spark" /> : `E${index + 1}`}
                          </span>
                          <strong className="bk-card-title">{p.name}</strong>
                          <span className="bk-pro-notes" id={noteId}>
                            <span className="bk-card-meta">
                              {unavailable
                                ? "No disponible por ahora"
                                : index < 0
                                  ? "Te asignamos quien esté libre"
                                  : "Perfil provisional"}
                            </span>
                            {!unavailable && clock > 0 && (
                              <span className="bk-pro-next">
                                {next
                                  ? `Próxima hora: ${whenLabel(next, today)}`
                                  : "Sin horarios próximos"}
                              </span>
                            )}
                          </span>
                          <span className="bk-card-check" aria-hidden="true">
                            <Icon name="check" />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                {!demo.ready && (
                  <p className="loading-state bk-loading">Conectando con la agenda…</p>
                )}
                {stepError && (
                  <p className="inline-error" role="alert">
                    {stepError}
                  </p>
                )}
                <div className="bk-actions">
                  <button
                    type="button"
                    className="button button-large"
                    disabled={!demo.ready}
                    onClick={continueFromService}
                  >
                    Elegir fecha y hora <Icon name="arrow" />
                  </button>
                </div>
                <p className="form-disclaimer">
                  Precios, duraciones y nombres de profesionales son de referencia
                  mientras el equipo confirma los definitivos.
                </p>
              </section>
            )}

            {step === 2 && (
              <section className="bk-step">
                <StepHead
                  step={2}
                  eyebrow="Fecha y hora"
                  title="Una fecha."
                  accent="Tu momento."
                  lead={`${service.name} · ${service.demoDurationMinutes} min con ${barberId === ANY_BARBER ? "el primer profesional disponible" : professional.name}.`}
                  headingRef={headingRef}
                />
                <div className="bk-when">
                  <div className="bk-when-calendar">
                    {today ? (
                      <Calendar
                        value={date}
                        today={today}
                        onChange={pickDate}
                        getDayStatus={dayStatus}
                      />
                    ) : (
                      <div className="cal-slab">
                        <p className="loading-state">Cargando calendario…</p>
                      </div>
                    )}
                  </div>
                  <TimeSlots
                    key={`${date}|${barberId}|${serviceId}`}
                    slots={slots}
                    value={time}
                    onChange={(value) => {
                      setTime(value);
                      setStepError("");
                    }}
                    dateLabel={date ? prettyDate(date) : ""}
                    describedBy={stepError ? "bk-step-error" : undefined}
                    empty={
                      <div className="bk-empty">
                        <p>
                          <strong>No quedan horarios libres este día.</strong>
                          {dayInfo?.reason ? ` ${dayInfo.reason}.` : ""}
                        </p>
                        <div className="bk-empty-actions">
                          {nextFree && (
                            <button
                              type="button"
                              className="button button-small"
                              onClick={() => pickDate(nextFree.date)}
                            >
                              Ir al {shortDate(parseDate(nextFree.date))}
                              <Icon name="arrow" />
                            </button>
                          )}
                          {barberId !== ANY_BARBER && (
                            <button
                              type="button"
                              className="button button-outline button-small"
                              onClick={() => pickBarber(ANY_BARBER)}
                            >
                              Probar «Primer disponible»
                            </button>
                          )}
                        </div>
                      </div>
                    }
                  />
                </div>
                {stepError && (
                  <p className="inline-error" role="alert" id="bk-step-error">
                    {stepError}
                  </p>
                )}
                <div className="bk-actions">
                  <BackButton onClick={() => go(1)} />
                  <button type="button" className="button" onClick={continueFromDate}>
                    Continuar <Icon name="arrow" />
                  </button>
                </div>
                <p className="form-disclaimer">
                  Horarios de ejemplo mientras la barbería confirma su jornada
                  definitiva. Puedes reservar con hasta {bookingHorizonDays} días de
                  anticipación.
                </p>
              </section>
            )}

            {step === 3 && (
              <form className="bk-step" onSubmit={continueFromContact} noValidate>
                <StepHead
                  step={3}
                  eyebrow="Tus datos"
                  title="Hagámoslo"
                  accent="personal."
                  lead="Solo necesitamos un nombre y un teléfono para la cita."
                  headingRef={headingRef}
                />
                <div className="bk-contact">
                  <p className="bk-note">
                    <Icon name="lock" />
                    <span>
                      Mientras la reserva en línea está en pruebas, usa un nombre y
                      un teléfono ficticios.
                    </span>
                  </p>
                  <ContactInputs
                    idPrefix="bk"
                    value={contact}
                    onChange={updateContact}
                    errors={errors}
                  />
                  <div className="bk-field">
                    <label className="checkbox-label" htmlFor="bk-consent">
                      <input
                        id="bk-consent"
                        type="checkbox"
                        checked={consent}
                        aria-invalid={errors.consent ? true : undefined}
                        aria-describedby={errors.consent ? "bk-consent-error" : undefined}
                        onChange={(event) => updateConsent(event.target.checked)}
                      />
                      <span>
                        Entiendo que la reserva en línea está en pruebas y usaré
                        datos ficticios.
                      </span>
                    </label>
                    {errors.consent && (
                      <p id="bk-consent-error" className="inline-error bk-field-error">
                        {errors.consent}
                      </p>
                    )}
                  </div>
                </div>
                {(stepError || !selectedAvailable) && (
                  <div className="inline-error bk-alert" role="alert">
                    <span>
                      {stepError ||
                        "La hora elegida dejó de estar disponible. Elige otra para continuar."}{" "}
                      <button type="button" className="bk-inline-link" onClick={() => go(2)}>
                        Elegir otra hora
                      </button>
                    </span>
                  </div>
                )}
                <div className="bk-actions">
                  <BackButton onClick={() => go(2)} />
                  <button type="submit" className="button">
                    Revisar mi cita <Icon name="arrow" />
                  </button>
                </div>
              </form>
            )}

            {step === 4 && (
              <form className="bk-step" onSubmit={submit} noValidate>
                <StepHead
                  step={4}
                  eyebrow="Confirmar"
                  title="Revisa"
                  accent="y confirma."
                  lead="Comprueba los detalles antes de guardar la cita en la agenda."
                  headingRef={headingRef}
                />
                <ReviewTicket data={summary} contact={contact} onEdit={go} />
                <p className="form-disclaimer bk-review-note">
                  Al confirmar, la cita se guarda en la agenda de Elite. Aún no
                  enviamos confirmaciones automáticas por WhatsApp o correo y no se
                  realiza ningún cobro en línea.
                </p>
                {!selectedAvailable && (
                  <div className="inline-error bk-alert" role="alert">
                    <span>
                      Esa hora dejó de estar disponible.{" "}
                      <button type="button" className="bk-inline-link" onClick={() => go(2)}>
                        Elegir otra hora
                      </button>
                    </span>
                  </div>
                )}
                {submitError && (
                  <div className="inline-error bk-alert" role="alert" id="bk-submit-error">
                    <span>
                      {submitError}{" "}
                      <button type="button" className="bk-inline-link" onClick={() => go(2)}>
                        Cambiar fecha u hora
                      </button>
                    </span>
                  </div>
                )}
                <div className="bk-actions">
                  <BackButton onClick={() => go(3)} />
                  <button
                    type="submit"
                    className="button button-accent button-large"
                    aria-busy={busy || undefined}
                    aria-describedby={submitError ? "bk-submit-error" : undefined}
                    disabled={!selectedAvailable || offline}
                  >
                    {busy ? "Confirmando…" : "Confirmar reserva"}
                    {!busy && <Icon name="check" />}
                  </button>
                </div>
                {offline && (
                  <p className="bk-hint" role="status">
                    Sin conexión no se puede confirmar. Pulsa «Reintentar» arriba
                    cuando vuelva la señal; tus datos siguen aquí.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
        <BookingSummary data={summary} />
      </div>
    </div>
  );
}

/**
 * Campos de contacto no controlados (nombre y teléfono) que también usa el
 * registro de turnos (`queue/join-form.tsx`). Se conserva su estructura.
 */
export function ContactFields({
  value,
  onChange,
}: {
  value?: { name: string; phone: string };
  onChange?: (value: { name: string; phone: string }) => void;
} = {}) {
  return (
    <div className="contact-fields">
      <label>
        Nombre de ejemplo
        <input
          required
          name="name"
          maxLength={100}
          autoComplete="off"
          placeholder="Nombre y apellido"
          value={value?.name}
          onChange={(event) =>
            onChange?.({ name: event.target.value, phone: value?.phone ?? "" })
          }
        />
      </label>
      <label>
        Teléfono de ejemplo
        <input
          required
          name="phone"
          type="tel"
          minLength={7}
          maxLength={20}
          autoComplete="off"
          placeholder="300 000 0000"
          inputMode="tel"
          value={value?.phone}
          onChange={(event) =>
            onChange?.({ name: value?.name ?? "", phone: event.target.value })
          }
        />
      </label>
    </div>
  );
}
