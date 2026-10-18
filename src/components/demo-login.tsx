"use client";
import { useState, type FormEvent } from "react";
import { Icon } from "./icons";
import { EliteSculpture } from "./elite-sculpture";

/** Public presentation credentials. They intentionally provide no server protection. */
const DEMO_EMAIL = "jean@elite.demo";
const DEMO_PASSWORD = "EliteDemo2026!";

export function DemoLogin({ onEnter }: { onEnter: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      setError("Usa los datos de prueba indicados debajo. Esta cuenta es solo para la presentación.");
      return;
    }
    setError("");
    onEnter();
  }

  return (
    <div className="elite-login">
      <div className="elite-login-art" aria-hidden="true">
        <EliteSculpture />
        <span>ELITE / PRIVATE STUDIO</span>
      </div>
      <form className="elite-login-form" onSubmit={submit}>
        <p className="eyebrow"><Icon name="lock" /> Acceso de presentación</p>
        <h2>Bienvenido, <span className="serif">Jean Carlos.</span></h2>
        <p>Tu estudio. Tu agenda. Todo en un lugar.</p>
        <label htmlFor="elite-email">Correo de prueba</label>
        <input id="elite-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder={DEMO_EMAIL} aria-describedby="elite-login-demo" />
        <label htmlFor="elite-password">Contraseña de prueba</label>
        <div className="elite-password">
          <input id="elite-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="elite-login-demo" />
          <button type="button" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Ocultar" : "Ver"}</button>
        </div>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button type="submit" className="button button-accent button-large">Iniciar sesión de prueba <Icon name="arrow" /></button>
        <button type="button" className="text-link" onClick={() => setHelp(!help)}>¿Olvidaste la contraseña?</button>
        {help && <p role="status">Esta cuenta no tiene recuperación por correo. Usa las credenciales de presentación que aparecen aquí.</p>}
        <div id="elite-login-demo" className="elite-login-demo">
          <strong>Cuenta de demostración</strong>
          <span>{DEMO_EMAIL}</span>
          <code>{DEMO_PASSWORD}</code>
          <button type="button" className="text-link" onClick={() => { setEmail(DEMO_EMAIL); setPassword(DEMO_PASSWORD); setError(""); }}>Completar datos de prueba <Icon name="arrow" /></button>
          <small>Acceso simulado, sin autenticación en servidor. Usa únicamente datos ficticios.</small>
        </div>
      </form>
    </div>
  );
}
