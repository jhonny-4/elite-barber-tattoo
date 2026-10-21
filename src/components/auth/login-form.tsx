"use client";
import { useActionState, useState } from "react";
import { requestReset, signIn, type FormState } from "../../server/auth/actions";
import { EliteSculpture } from "../elite-sculpture";
import { Icon } from "../icons";

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [state, login, pending] = useActionState<FormState, FormData>(signIn, {});
  const [reset, sendReset, resetting] = useActionState<FormState, FormData>(requestReset, {});
  const [visible, setVisible] = useState(false);
  const [forgot, setForgot] = useState(false);

  return (
    <div className="elite-login">
      <div className="elite-login-art" aria-hidden="true">
        <EliteSculpture />
        <span>ELITE / PRIVATE STUDIO</span>
      </div>
      {forgot ? (
        <form className="elite-login-form" action={sendReset}>
          <p className="eyebrow"><Icon name="lock" /> Recuperar acceso</p>
          <h2>Nueva <span className="serif">contraseña.</span></h2>
          <p>Te enviaremos un enlace al correo del equipo.</p>
          <label htmlFor="reset-email">Correo</label>
          <input id="reset-email" name="email" type="email" autoComplete="username" required />
          {reset.error && <p className="inline-error" role="alert">{reset.error}</p>}
          {reset.ok && <p role="status">{reset.ok}</p>}
          <button type="submit" className="button button-accent button-large" disabled={resetting}>
            {resetting ? "Enviando…" : "Enviar enlace"} <Icon name="arrow" />
          </button>
          <button type="button" className="text-link" onClick={() => setForgot(false)}>Volver al ingreso</button>
        </form>
      ) : (
        <form className="elite-login-form" action={login}>
          <p className="eyebrow"><Icon name="lock" /> Acceso del equipo</p>
          <h2>Bienvenido a <span className="serif">Elite.</span></h2>
          <p>Agenda, turnos y clientes del día.</p>
          <input type="hidden" name="next" value={next} />
          <label htmlFor="elite-email">Correo</label>
          <input id="elite-email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="elite-password">Contraseña</label>
          <div className="elite-password">
            <input id="elite-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required minLength={8} />
            <button type="button" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Ocultar" : "Ver"}</button>
          </div>
          {linkError && !state.error && <p className="inline-error" role="alert">El enlace venció o ya se usó. Pide uno nuevo.</p>}
          {state.error && <p className="inline-error" role="alert">{state.error}</p>}
          <button type="submit" className="button button-accent button-large" disabled={pending}>
            {pending ? "Ingresando…" : "Ingresar"} <Icon name="arrow" />
          </button>
          <button type="button" className="text-link" onClick={() => setForgot(true)}>¿Olvidaste la contraseña?</button>
        </form>
      )}
    </div>
  );
}
