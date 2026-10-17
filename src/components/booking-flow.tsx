"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { barbers, currency, services } from "../domain/catalog";
import { addBooking, todayBogota, type Booking } from "../domain/demo";
import { getSlots, prettyDate, shiftDate } from "../domain/availability";
import { useDemo } from "../lib/use-demo";
import { Calendar } from "./calendar";
import { Icon } from "./icons";
import { Brand } from "./media";
import { businessAddress } from "../domain/business";
export function BookingFlow() {
  const params = useSearchParams();
  const demo = useDemo();
  const [contact, setContact] = useState({ name: "", phone: "" });
  const [consent, setConsent] = useState(false);
  const [barberId, setBarber] = useState(
    () =>
      barbers.find((b) => b.id === params.get("profesional"))?.id ??
      "barbero-1",
  );
  const [serviceId, setService] = useState(
    () => services.find((s) => s.id === params.get("servicio"))?.id ?? "corte",
  );
  const [date, setDate] = useState(""),
    [today, setToday] = useState(""),
    [time, setTime] = useState(""),
    [step, setStep] = useState(1),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<Booking | null>(null),
    [clock, setClock] = useState(0);
  useEffect(() => {
    const d = todayBogota();
    setToday(d);
    setDate(shiftDate(d, 1));
    setClock(Date.now());
    const tick = setInterval(() => {
      setToday(todayBogota());
      setClock(Date.now());
    }, 30000);
    return () => clearInterval(tick);
  }, []);
  const service = services.find((s) => s.id === serviceId)!;
  const slots =
    date && clock ? getSlots(demo.state, barberId, serviceId, date, clock) : [];
  const selectedAvailable = slots.some((s) => s.time === time && s.available);
  const professional = barbers.find((b) => b.id === barberId)!;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      let created: Booking | undefined;
      await demo.transact((state) => {
        const next = addBooking(state, {
          barberId,
          serviceId,
          date,
          time,
          name: contact.name,
          phone: contact.phone,
        });
        created = next.bookings.at(-1);
        return next;
      });
      setResult(created!);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div className="success-panel">
        <span className="success-icon">
          <Icon name="check" />
        </span>
        <p className="eyebrow">GUARDADO EN ESTE NAVEGADOR</p>
        <h2>
          Tu espacio
          <br />
          <span className="serif">en la demo.</span>
        </h2>
        <p>
          La cita de ejemplo quedó registrada. No se ha enviado al
          establecimiento ni se ha realizado ningún cobro.
        </p>
        <div className="confirmation-details">
          <span>
            {service.name} · {professional.name}
          </span>
          <strong>
            {prettyDate(result.date)} · {result.time}
          </strong>
          <span>{currency(service.priceCOP)} COP · provisional</span>
          <small>Referencia demo: {result.id.slice(0, 8).toUpperCase()}</small>
        </div>
        <Link className="button" href="/">
          Volver al inicio <Icon name="arrow" />
        </Link>
        <Link className="text-link" href="/administracion?tab=citas">
          Ver cita en el panel demo <Icon name="grid" />
        </Link>
        <button
          className="text-link"
          onClick={() => {
            setResult(null);
            setTime("");
            setStep(1);
          }}
        >
          Crear otra cita demo <Icon name="plus" />
        </button>
      </div>
    );
  return (
    <div className="booking-layout">
      <div className="booking-workspace">
        <div className="stepper" aria-label="Pasos de reserva">
          {["Experiencia", "Fecha y hora", "Tus datos", "Revisión"].map(
            (label, i) => (
              <button
                key={label}
                onClick={() => {
                  if (i + 1 < step) setStep(i + 1);
                }}
                disabled={i + 1 > step}
                aria-current={step === i + 1 ? "step" : undefined}
              >
                <span>
                  {step > i + 1 ? <Icon name="check" /> : `0${i + 1}`}
                </span>
                {label}
              </button>
            ),
          )}
        </div>
        <div className="booking-progress" aria-hidden="true">
          <span style={{ width: `${step * 25}%` }} />
        </div>
        <p className="inline-error" role="alert">
          {error || demo.error}
        </p>
        {step === 1 && (
          <div className="booking-step">
            <p className="eyebrow">01 / A TU MEDIDA</p>
            <h2>
              Empieza por
              <br />
              <span className="serif">tu experiencia.</span>
            </h2>
            <fieldset>
              <legend>¿Qué hacemos hoy?</legend>
              <div className="service-options">
                {services.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    aria-pressed={serviceId === s.id}
                    className={`selection-card ${serviceId === s.id ? "selected" : ""}`}
                    onClick={() => {
                      setService(s.id);
                      setTime("");
                    }}
                  >
                    <span className="selection-radio" />
                    <span>
                      <strong>{s.name}</strong>
                      <small>{s.demoDurationMinutes} min · duración demo</small>
                    </span>
                    <b>{currency(s.priceCOP)}</b>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Elige tu profesional</legend>
              <div className="barber-options">
                {barbers.map((b, i) => {
                  const paused = demo.state.unavailableBarberIds?.includes(
                    b.id,
                  );
                  return (
                    <button
                      type="button"
                      key={b.id}
                      disabled={paused}
                      className={`barber-option ${barberId === b.id ? "selected" : ""}`}
                      aria-pressed={barberId === b.id}
                      onClick={() => {
                        setBarber(b.id);
                        setTime("");
                      }}
                    >
                      <span className="barber-avatar">E{i + 1}</span>
                      <strong>{b.name}</strong>
                      <small>
                        {paused ? "Pausado en demo" : "Perfil provisional"}
                      </small>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <button
              className="button"
              disabled={
                !demo.ready ||
                !date ||
                demo.state.unavailableBarberIds?.includes(barberId)
              }
              onClick={() => setStep(2)}
            >
              Elegir fecha y hora <Icon name="arrow" />
            </button>
            <p className="form-disclaimer">
              Tarifas provisionales. Los nombres, las duraciones y la
              disponibilidad se utilizan para demostrar el funcionamiento.
            </p>
          </div>
        )}
        {step === 2 && (
          <div className="booking-step">
            <p className="eyebrow">02 / TU MOMENTO</p>
            <h2>
              Una fecha.
              <br />
              <span className="serif">Un nuevo comienzo.</span>
            </h2>
            {today && (
              <Calendar
                value={date}
                today={today}
                onChange={(d) => {
                  setDate(d);
                  setTime("");
                }}
              />
            )}
            <div className="slot-heading">
              <h3>Horarios de ejemplo</h3>
              <span>
                <span className="live-dot" />{" "}
                {slots.filter((s) => s.available).length} disponibles
              </span>
            </div>
            <p className="slot-date">{date && prettyDate(date)}</p>
            <div
              className="time-slots"
              role="group"
              aria-label="Elegir horario"
            >
              {slots.map((slot) => (
                <button
                  type="button"
                  key={slot.time}
                  disabled={!slot.available}
                  aria-pressed={time === slot.time && slot.available}
                  title={slot.reason || `Elegir ${slot.time}`}
                  className={
                    time === slot.time && slot.available ? "selected" : ""
                  }
                  onClick={() => setTime(slot.time)}
                >
                  {slot.time}
                </button>
              ))}
            </div>
            {slots.every((s) => !s.available) && (
              <p className="empty-inline">
                No quedan horarios demo para esta fecha y profesional. Prueba
                otro día o cambia de profesional.
              </p>
            )}
            <p className="form-disclaimer">
              Disponibilidad simulada: 10:00–18:00, hasta 60 días. No representa
              el horario real del negocio.
            </p>
            <div className="step-actions">
              <button className="text-link" onClick={() => setStep(1)}>
                ← Volver
              </button>
              <button
                className="button"
                disabled={!selectedAvailable}
                onClick={() => setStep(3)}
              >
                Continuar <Icon name="arrow" />
              </button>
            </div>
          </div>
        )}
        {step === 3 && (
          <form
            className="booking-step"
            onSubmit={(event) => {
              event.preventDefault();
              if (
                !contact.name.trim() ||
                !/^[+\d\s()-]{7,20}$/.test(contact.phone)
              ) {
                setError("Escribe un nombre y un teléfono de ejemplo válido.");
                return;
              }
              setError("");
              setStep(4);
            }}
          >
            <p className="eyebrow">03 / EL ÚLTIMO DETALLE</p>
            <h2>
              Hagámoslo
              <br />
              <span className="serif">personal.</span>
            </h2>
            <div className="contact-intro">
              <Icon name="users" />
              <div>
                <strong>Datos para tu cita</strong>
                <p>
                  En esta presentación, utiliza un nombre y un teléfono
                  ficticios.
                </p>
              </div>
            </div>
            <ContactFields value={contact} onChange={setContact} />
            <label className="checkbox-label">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />{" "}
              Entiendo que es una demostración y usaré datos ficticios.
            </label>
            <div className="step-actions">
              <button
                type="button"
                className="text-link"
                onClick={() => setStep(2)}
              >
                ← Volver
              </button>
              <button className="button" disabled={!selectedAvailable}>
                Revisar mi cita
                <Icon name="arrow" />
              </button>
            </div>
            {!selectedAvailable && (
              <p className="inline-error">
                Este horario dejó de estar disponible. Vuelve al calendario para
                elegir otro.
              </p>
            )}
            <p className="form-disclaimer">
              Sin pagos ni notificaciones. La cita se conserva únicamente en
              este navegador.
            </p>
          </form>
        )}
        {step === 4 && (
          <form className="booking-step" onSubmit={submit}>
            <p className="eyebrow">04 / CADA DETALLE EN SU LUGAR</p>
            <h2>
              Tu próxima
              <br />
              <span className="serif">visita a Elite.</span>
            </h2>
            <p className="review-description">
              Revisa tu selección antes de guardar la cita de ejemplo.
            </p>
            <div className="booking-review">
              <Brand />
              <dl>
                <div>
                  <dt>Experiencia</dt>
                  <dd>{service.name}</dd>
                </div>
                <div>
                  <dt>Profesional provisional</dt>
                  <dd>{professional.name}</dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd>{prettyDate(date)}</dd>
                </div>
                <div>
                  <dt>Hora · Cartagena</dt>
                  <dd>{time}</dd>
                </div>
                <div>
                  <dt>Cliente de ejemplo</dt>
                  <dd>{contact.name}</dd>
                </div>
                <div>
                  <dt>Contacto de ejemplo</dt>
                  <dd>{contact.phone}</dd>
                </div>
                <div>
                  <dt>Precio provisional</dt>
                  <dd>{currency(service.priceCOP)} COP</dd>
                </div>
              </dl>
            </div>
            <p className="summary-notice">
              <Icon name="check" /> Esta acción guarda una cita local de
              demostración. No la envía al negocio.
            </p>
            {!selectedAvailable && (
              <p className="inline-error" role="alert">
                Este horario dejó de estar disponible. Vuelve al paso de fecha y
                hora.
              </p>
            )}
            <div className="step-actions">
              <button
                type="button"
                className="text-link"
                onClick={() => setStep(3)}
              >
                ← Editar datos
              </button>
              <button
                className="button"
                disabled={busy || !selectedAvailable || !consent}
              >
                {busy ? "Guardando…" : "Guardar cita demo"}
                <Icon name="check" />
              </button>
            </div>
          </form>
        )}
      </div>
      <aside className="booking-summary">
        <div className="summary-top">
          <span className="eyebrow">TU EXPERIENCIA ELITE</span>
          <Icon name="spark" />
        </div>
        <div className="summary-emblem">
          <Brand />
        </div>
        <h3>{service.name}</h3>
        <p>{professional.name} · perfil provisional</p>
        <div className="summary-line">
          <span>Duración demo</span>
          <b>{service.demoDurationMinutes} min</b>
        </div>
        <div className="summary-line">
          <span>Fecha</span>
          <b>{date ? prettyDate(date) : "Por elegir"}</b>
        </div>
        <div className="summary-line">
          <span>Hora</span>
          <b>{selectedAvailable ? time : "Por elegir"}</b>
        </div>
        <div className="summary-total">
          <span>Precio provisional</span>
          <strong>
            {currency(service.priceCOP)}
            <small> COP</small>
          </strong>
        </div>
        <p className="summary-notice">
          <Icon name="calendar" /> Estás explorando una agenda demo. Tu reserva
          no será enviada al local.
        </p>
        <Link className="text-link" href="/tatuaje">
          ¿Buscas un tatuaje? <Icon name="arrow" />
        </Link>
        <div className="summary-location">
          <span className="eyebrow">EL ESTUDIO</span>
          <p>{businessAddress}.</p>
        </div>
      </aside>
    </div>
  );
}
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
          placeholder="Tu nombre demo"
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
