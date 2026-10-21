"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { currency, barbers as barberAliases } from "../domain/catalog";
import { todayBogota } from "../domain/demo";
import { parseDate, prettyDate, shiftDate } from "../domain/availability";
import { whatsappUrl } from "../domain/business";
import { Calendar, type CalendarDayStatus } from "./calendar";
import { Icon } from "./icons";
import { BrandGlyph, EliteLogo } from "./brand/logos";
import { ANY_BARBER, type SlotView } from "./booking/availability-view";
import type {
  BarberServiceLink,
  BarberSummary,
  ServiceSummary,
} from "../domain/booking/slots";
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
import { BoldPay } from "./booking/bold-pay";
import type { BoldCheckout } from "../server/payments/bold";

type Errors = ContactErrors;

const anyProfessional = { id: ANY_BARBER, name: "Primer disponible" };
const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);
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
    <button
      type="button"
      className="button button-outline bk-back"
      onClick={onClick}
    >
      <Icon name="chevron" className="bk-back-icon" />
      <span className="bk-back-label">Atrás</span>
    </button>
  );
}

export function BookingFlow() {
  const params = useSearchParams();
  const [catalog, setCatalog] = useState<{
    barbers: BarberSummary[];
    services: ServiceSummary[];
    barberServices: BarberServiceLink[];
  }>({ barbers: [], services: [], barberServices: [] });
  const [serverSlots, setServerSlots] = useState<SlotView[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const presencial = params.get("origen") === "presencial";
  const [serviceId, setServiceId] = useState<string>("");
  const [barberId, setBarberId] = useState<string>(ANY_BARBER);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [today, setToday] = useState("");
  const [clock, setClock] = useState(0);
  const [step, setStep] = useState<StepId>(1);
  const [contact, setContact] = useState<ContactValue>({
    name: "",
    phone: "",
    email: "",
  });
  const [attempted, setAttempted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [stepError, setStepError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    id: string;
    token: string;
    service: string;
    barber: string;
    date: string;
    time: string;
    price_cop: number;
    status: string;
    payment?: BoldCheckout;
  } | null>(null);
  const attemptKey = useRef("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    const serviceParam = params.get("servicio"),
      requestedBarber = params.get("profesional"),
      barberParam =
        barberAliases.find((b) => b.id === requestedBarber)?.slug ??
        requestedBarber;
    void fetch("/api/reservas/catalogo")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      })
      .then(
        (d: {
          barbers: BarberSummary[];
          services: ServiceSummary[];
          barberServices: BarberServiceLink[];
        }) => {
          setCatalog(d);
          const selected =
            d.services.find((s) => s.slug === serviceParam) ?? d.services[0];
          setServiceId(selected?.slug ?? "");
          setBarberId(
            d.barbers.some((b) => b.slug === barberParam)
              ? barberParam!
              : ANY_BARBER,
          );
        },
      )
      .catch((e: Error) => setAvailabilityError(e.message));
    const now = todayBogota();
    setToday(now);
    setDate(shiftDate(now, 1));
    setClock(Date.now());
    const tick = setInterval(() => {
      setToday(todayBogota());
      setClock(Date.now());
    }, 30000);
    return () => clearInterval(tick);
  }, [params]);

  // Al cambiar de paso: foco en el título del paso y bloque visible bajo la cabecera.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    headingRef.current?.focus({ preventScroll: true });
    const top = topRef.current?.getBoundingClientRect().top ?? 0;
    const header =
      document.querySelector(".site-header")?.getBoundingClientRect().height ??
      0;
    if (top < header || top > window.innerHeight * 0.45) {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      window.scrollTo({
        top: Math.max(0, window.scrollY + top - header - 16),
        behavior: reduce ? "auto" : "smooth",
      });
    }
  }, [step, result]);

  const services = catalog.services,
    barbers = catalog.barbers;
  const service = services.find((s) => s.slug === serviceId) ?? {
    name: "Servicio",
    duration_min: 0,
    price_cop: 0,
    slug: "",
    id: "",
    sort_order: 0,
  };
  const professional =
    barberId === ANY_BARBER
      ? anyProfessional
      : barbers.find((b) => b.slug === barberId)
        ? {
            id: barberId,
            name: barbers.find((b) => b.slug === barberId)!.display_name,
          }
        : anyProfessional;

  useEffect(() => {
    if (!serviceId || !date) return;
    let active = true;
    setAvailabilityLoading(true);
    setAvailabilityError("");
    fetch(
      `/api/reservas/disponibilidad?barbero=${encodeURIComponent(barberId)}&servicio=${encodeURIComponent(serviceId)}&fecha=${date}`,
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d as { slots: { time: string; available: boolean }[] };
      })
      .then((d) => {
        if (active)
          setServerSlots(
            d.slots.map((s) => ({
              time: s.time,
              available: s.available,
              reason: s.available ? "" : "No disponible",
              short: s.available ? "" : "Ocupado",
            })),
          );
      })
      .catch((e: Error) => {
        if (active) {
          setServerSlots([]);
          setAvailabilityError(e.message);
        }
      })
      .finally(() => active && setAvailabilityLoading(false));
    return () => {
      active = false;
    };
  }, [barberId, serviceId, date]);
  const slots = serverSlots;
  const selectedAvailable = slots.some((s) => s.time === time && s.available);

  // Estado de cada día del periodo reservable (hoy + 60 días) para el calendario.
  const dayStatus = useCallback(
    (day: string): CalendarDayStatus =>
      day === date
        ? {
            available: slots.some((s) => s.available),
            count: slots.filter((s) => s.available).length,
          }
        : {
            available: day >= today && day <= shiftDate(today, 60),
            reason: "Selecciona el día para consultar horarios",
          },
    [date, slots, today],
  );

  const nextByProfessional: Record<
    string,
    { date: string; time: string } | null
  > = {};

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
    if (attempted) setErrors(validateContact(next));
  }

  function continueFromContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const next: Errors = validateContact(contact);
    setErrors(next);
    const first = (["name", "phone", "email"] as const).find(
      (key) => next[key],
    );
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
      setSubmitError(
        "Esa hora dejó de estar disponible. Elige otra en el paso 2.",
      );
      return;
    }
    setBusy(true);
    setSubmitError("");
    try {
      if (!attemptKey.current)
        attemptKey.current = crypto.randomUUID().replaceAll("-", "");
      const response = await fetch("/api/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attemptKey.current,
        },
        body: JSON.stringify({
          barberSlug: barberId,
          serviceSlug: serviceId,
          date,
          time,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
        }),
      });
      const booking = await response.json();
      if (!response.ok)
        throw new Error(booking.error ?? "No se pudo reservar.");
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
    setContact({ name: "", phone: "", email: "" });
    attemptKey.current = "";
    setAttempted(false);
    setErrors({});
    setSubmitError("");
    setStepError("");
    setStep(1);
  }

  const summary: SummaryData = {
    service: service.name,
    duration: service.duration_min,
    price: service.price_cop,
    professional: professional.name,
    professionalNote:
      barberId === ANY_BARBER ? "Se asigna al confirmar" : "Barbero de Elite",
    date: longDate(date),
    time: selectedAvailable ? time : "",
    presencial,
  };

  if (result) {
    const booked = service;
    const assigned = barbers.find((b) => b.slug === result.barber);
    const reference = result.id.slice(0, 8).toUpperCase();
    return (
      <div className="bk bk-done" ref={topRef}>
        <section
          className="success-panel bk-success"
          aria-labelledby="bk-success-title"
        >
          <span className="bk-seal" aria-hidden="true">
            <EliteLogo className="bk-seal-logo" />
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
            contact={{ name: contact.name, phone: contact.phone }}
            data={{
              ...summary,
              service: booked.name,
              duration: booked.duration_min,
              price: result.price_cop,
              professional: assigned?.display_name ?? summary.professional,
              professionalNote:
                barberId === ANY_BARBER
                  ? "Asignado automáticamente"
                  : "Barbero Elite",
              date: longDate(result.date),
              time: result.time,
            }}
          />
          <div className="bk-next">
            <p className="bk-note">
              Al llegar al local, informa al equipo que tienes una reserva.
            </p>
            <h3>Siguientes pasos</h3>
            <ol>
              <li>
                <span>
                  Tu cita ya aparece en la agenda del equipo de Elite.
                </span>
              </li>
              <li>
                <span>
                  ¿Necesitas cambiarla o cancelarla? Escríbenos por WhatsApp con
                  tu código <b>{reference}</b>.
                </span>
              </li>
              <li>
                <span>
                  Te esperamos en el local el{" "}
                  {longDate(result.date).toLowerCase()} a las {result.time}.
                </span>
              </li>
            </ol>
          </div>
          {result.payment && result.status === "pendiente_pago" ? (
            <BoldPay checkout={result.payment} email={contact.email ?? ""} name={contact.name} />
          ) : (
          <p className="bk-honest">
              <Icon name="clock" />
              <span>
                Te enviamos la confirmación a {contact.email}. No se realizó
                ningún cobro en línea.
              </span>
            </p>
          )}
          <div className="button-row bk-success-actions">
            <Link
              className="button button-outline"
              href={`/mi-reserva/${result.token}`}
            >
              Consultar mi reserva
            </Link>
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
            <button
              type="button"
              className="button button-outline"
              onClick={startOver}
            >
              Otra reserva <Icon name="plus" />
            </button>
          </div>
        </section>
      </div>
    );
  }

  const dayInfo = date && today ? dayStatus(date) : null;
  const offline = false;

  return (
    <div className="bk" ref={topRef}>
      <BookingProgress step={step} onGo={go} />
      <div className="bk-body">
        <div className="bk-main">
          <CompactSummary data={summary} />
          {availabilityError && step === 1 && (
            <div className="bk-offline" role="alert">
              <p>{availabilityError}</p>
            </div>
          )}
          <div className="bk-panel">
            {step === 1 && (
              <section key={step} className="bk-step">
                <StepHead
                  step={1}
                  eyebrow="Servicio"
                  title="Elige tu"
                  accent="experiencia."
                  lead="Selecciona el servicio y quién te atiende."
                  headingRef={headingRef}
                />
                <fieldset className="bk-fieldset">
                  <legend className="bk-legend">Servicio</legend>
                  <div className="bk-options bk-options-services">
                    {services.map((s) => (
                      <label
                        key={s.slug}
                        className={`bk-card bk-service${s.slug === serviceId ? " is-selected" : ""}`}
                      >
                        <input
                          className="bk-radio"
                          type="radio"
                          name="bk-service"
                          value={s.slug}
                          checked={s.slug === serviceId}
                          onChange={() => pickService(s.slug)}
                        />
                        <span className="bk-card-icon" aria-hidden="true">
                          <Icon name="scissors" />
                        </span>
                        <span className="bk-card-body">
                          <strong className="bk-card-title">{s.name}</strong>
                          <span className="bk-card-meta">
                            <Icon name="clock" /> {s.duration_min} min aprox.
                          </span>
                        </span>
                        <span className="bk-card-price">
                          <small>Precio</small>
                          <b>{currency(s.price_cop)}</b>
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
                    {[
                      anyProfessional,
                      ...barbers.map((b) => ({
                        id: b.slug,
                        name: b.display_name,
                      })),
                    ].map((p) => {
                      const index = barbers.findIndex((b) => b.slug === p.id);
                      const unavailable =
                        p.id !== ANY_BARBER &&
                        !catalog.barberServices.some(
                          (link) =>
                            link.barber_id === barbers[index]?.id &&
                            link.service_id === service.id,
                        );
                      const next = nextByProfessional[p.id];
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
                            {index < 0 ? (
                              <Icon name="spark" />
                            ) : (
                              `E${index + 1}`
                            )}
                          </span>
                          <strong className="bk-card-title">{p.name}</strong>
                          <span className="bk-pro-notes" id={noteId}>
                            <span className="bk-card-meta">
                              {unavailable
                                ? "No disponible por ahora"
                                : index < 0
                                  ? "Te asignamos quien esté libre"
                                  : "Barbero de Elite"}
                            </span>
                            {!unavailable && clock > 0 && (
                              <span className="bk-pro-next">
                                {next
                                  ? `Próxima hora: ${whenLabel(next, today)}`
                                  : "Consulta horarios al elegir fecha"}
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
                {!services.length && !availabilityError && (
                  <p className="loading-state bk-loading">
                    Conectando con la agenda…
                  </p>
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
                    disabled={!services.length}
                    onClick={continueFromService}
                  >
                    Elegir fecha y hora <Icon name="arrow" />
                  </button>
                </div>
              </section>
            )}

            {step === 2 && (
              <section key={step} className="bk-step">
                <StepHead
                  step={2}
                  eyebrow="Fecha y hora"
                  title="Una fecha."
                  accent="Tu momento."
                  lead={`${service.name} · ${service.duration_min} min con ${barberId === ANY_BARBER ? "el primer profesional disponible" : professional.name}.`}
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
                  <button
                    type="button"
                    className="button"
                    onClick={continueFromDate}
                  >
                    Continuar <Icon name="arrow" />
                  </button>
                </div>
                {availabilityLoading && (
                  <p className="loading-state" role="status">
                    Consultando disponibilidad…
                  </p>
                )}
                {availabilityError && (
                  <p className="inline-error" role="alert">
                    {availabilityError}
                  </p>
                )}
              </section>
            )}

            {step === 3 && (
              <form
                key={step}
                className="bk-step"
                onSubmit={continueFromContact}
                noValidate
              >
                <StepHead
                  step={3}
                  eyebrow="Tus datos"
                  title="Hagámoslo"
                  accent="personal."
                  lead="Tu nombre, teléfono y correo para gestionar la cita y enviarte la confirmación."
                  headingRef={headingRef}
                />
                <div className="bk-contact">
                  <ContactInputs
                    idPrefix="bk"
                    value={contact}
                    onChange={updateContact}
                    errors={errors}
                  />
                </div>
                {(stepError || !selectedAvailable) && (
                  <div className="inline-error bk-alert" role="alert">
                    <span>
                      {stepError ||
                        "La hora elegida dejó de estar disponible. Elige otra para continuar."}{" "}
                      <button
                        type="button"
                        className="bk-inline-link"
                        onClick={() => go(2)}
                      >
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
              <form key={step} className="bk-step" onSubmit={submit} noValidate>
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
                  Al confirmar, guardaremos tu cita y enviaremos un correo de
                  confirmación.
                </p>
                {!selectedAvailable && (
                  <div className="inline-error bk-alert" role="alert">
                    <span>
                      Esa hora dejó de estar disponible.{" "}
                      <button
                        type="button"
                        className="bk-inline-link"
                        onClick={() => go(2)}
                      >
                        Elegir otra hora
                      </button>
                    </span>
                  </div>
                )}
                {submitError && (
                  <div
                    className="inline-error bk-alert"
                    role="alert"
                    id="bk-submit-error"
                  >
                    <span>
                      {submitError}{" "}
                      <button
                        type="button"
                        className="bk-inline-link"
                        onClick={() => go(2)}
                      >
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
                    aria-describedby={
                      submitError ? "bk-submit-error" : undefined
                    }
                    disabled={!selectedAvailable || offline}
                  >
                    {busy ? "Confirmando…" : "Confirmar reserva"}
                    {!busy && <Icon name="check" />}
                  </button>
                </div>
                {offline && (
                  <p className="bk-hint" role="status">
                    Sin conexión no se puede confirmar. Pulsa «Reintentar»
                    arriba cuando vuelva la señal; tus datos siguen aquí.
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
        Tu nombre
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
        Tu teléfono
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
